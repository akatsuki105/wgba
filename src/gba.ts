import { FrostAudio, GameBoyAdvanceAudio } from './audio';
import { ARMCore } from './core';
import { FrostIO, GameBoyAdvanceIO } from './io';
import { FrostIRQ, GameBoyAdvanceInterruptHandler } from './irq';
import { GameBoyAdvanceKeypad } from './keypad';
import { GameBoyAdvanceMMU, FrostMMU, Cart, defaultCart, region } from './mmu';
import { GameBoyAdvanceSIO } from './sio';
import { FrostVideo, GameBoyAdvanceVideo } from './video';

type FrostGBA = {
  cpu: any;
  mmu: FrostMMU;
  irq: FrostIRQ;
  io: FrostIO;
  audio: FrostAudio;
  video: FrostVideo;
};

export const logLvs = {
  ERROR: 1,
  WARN: 2,
  STUB: 4,
  INFO: 8,
  DEBUG: 16,
} as const;

const SYS_ID = 'com.pokemium.wgba';

export class GameBoyAdvance {
  logLevel: number;

  rom: Cart;
  cpu: ARMCore;
  mmu: GameBoyAdvanceMMU;
  io: GameBoyAdvanceIO;
  irq: GameBoyAdvanceInterruptHandler;
  audio: GameBoyAdvanceAudio;
  video: GameBoyAdvanceVideo;
  keypad: GameBoyAdvanceKeypad;
  sio: GameBoyAdvanceSIO;

  doStep: () => boolean;
  paused: boolean;

  seenFrame: boolean;
  seenSave: boolean;
  lastVblank: number;

  queue: number | null;
  reportFPS: ((num: number) => void) | null;
  throttle: number;

  indirectCanvas?: HTMLCanvasElement;
  targetCanvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;

  constructor() {
    this.logLevel = logLvs.ERROR | logLvs.WARN;

    this.rom = defaultCart;

    this.cpu = new ARMCore(this);
    this.mmu = new GameBoyAdvanceMMU(this.cpu, this);
    this.io = new GameBoyAdvanceIO(this.cpu, this);
    this.audio = new GameBoyAdvanceAudio(this.cpu, this);
    this.video = new GameBoyAdvanceVideo(this.cpu, this);
    this.irq = new GameBoyAdvanceInterruptHandler(this.cpu, this.io, this.audio, this.video, this);
    this.keypad = new GameBoyAdvanceKeypad(this);
    this.sio = new GameBoyAdvanceSIO(this);

    this.cpu.setComponent(this.mmu, this.irq);
    this.io.setIOComponent(this.audio, this.video, this.keypad, this.sio);

    this.keypad.registerHandlers();
    this.doStep = this.waitFrame;
    this.paused = false;

    this.seenFrame = false;
    this.seenSave = false;
    this.lastVblank = 0;

    this.queue = null;
    this.reportFPS = null;
    this.throttle = 16; // This is rough, but the 2/3ms difference gives us a good overhead

    window.queueFrame = (f: TimerHandler) => {
      this.queue = window.setTimeout(f, this.throttle); // eslint-disable-line
    };

    window.URL = window.URL || window.webkitURL;

    this.video.vblankCallback = () => {
      this.seenFrame = true;
    };
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.setCanvasDirect(canvas);
  }

  setCanvasDirect(canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d', { alpha: false }) || undefined;
    this.context && this.video.setBacking(this.context);
  }

  /**
   * @param {ArrayBufferLike} bios - bios data
   * @param {boolean} real - bios data is real bios binary or HLE bios
   */
  setBios(bios: ArrayBufferLike, real: boolean) {
    this.mmu.loadBios(bios, real);
  }

  setRom(rom: ArrayBufferLike): boolean {
    this.reset();

    this.rom = this.mmu.loadRom(rom, true);
    if (!this.rom) return false;

    this.retrieveSavedata();

    return true;
  }

  hasRom(): boolean {
    return !!this.rom;
  }

  loadRomFromFile(romFile: Blob, callback: (b: boolean) => void) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!(e.target?.result && e.target.result instanceof ArrayBuffer)) return;
      const result = this.setRom(e.target?.result);
      callback(result);
    };
    reader.readAsArrayBuffer(romFile);
  }

  reset() {
    this.audio.pause(true);

    this.mmu.clear();
    this.io.clear();
    this.audio.clear();
    this.video.clear();
    this.sio.clear();

    this.mmu.mmap(region.IO, this.io);
    this.mmu.mmap(region.PALETTE_RAM, this.video.renderPath.palette);
    this.mmu.mmap(region.VRAM, this.video.renderPath.vram);
    this.mmu.mmap(region.OAM, this.video.renderPath.oam);

    this.cpu.resetCPU(0);
  }

  step() {
    while (this.doStep()) {
      this.cpu.step();
    }
  }

  waitFrame(): boolean {
    const seen = this.seenFrame;
    this.seenFrame = false;

    return !seen;
  }

  pause() {
    this.paused = true;
    this.audio.pause(true);
    if (this.queue) {
      clearTimeout(this.queue);
      this.queue = null;
    }
  }

  advanceFrame() {
    this.step();
    if (this.seenSave) {
      if (!this.mmu.saveNeedsFlush()) {
        this.storeSavedata();
        this.seenSave = false;

        return;
      }

      this.mmu.flushSave();
    } else if (this.mmu.saveNeedsFlush()) {
      this.seenSave = true;
      this.mmu.flushSave();
    }
  }

  runStable() {
    this.paused = false;
    this.audio.pause(false);

    let timer = 0;
    let frames = 0;
    let start = Date.now();
    let runFunc: (f: TimerHandler) => void;
    if (this.reportFPS) {
      runFunc = () => {
        try {
          timer += Date.now() - start;

          if (this.paused) {
            return;
          }

          window.queueFrame(runFunc);
          start = Date.now();
          this.advanceFrame();
          ++frames;
          if (frames == 60) {
            if (this.reportFPS) this.reportFPS((frames * 1000) / timer);
            frames = 0;
            timer = 0;
          }
        } catch (exception) {
          this.ERROR(exception);
          if (exception.stack) this.logStackTrace((exception.stack as string).split('\n'));
          throw exception;
        }
      };
    } else {
      runFunc = () => {
        try {
          if (this.paused) return;
          window.queueFrame(runFunc);
          this.advanceFrame();
        } catch (exception) {
          this.ERROR(exception);
          if (exception.stack) this.logStackTrace(exception.stack.split('\n'));
          throw exception;
        }
      };
    }
    window.queueFrame(runFunc);
  }

  setSavedata(data: ArrayBufferLike) {
    this.mmu.loadSavedata(data);
  }

  loadSavedataFromFile(saveFile: Blob) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && e.target.result instanceof ArrayBuffer)
        this.setSavedata(e.target.result);
    };

    reader.readAsArrayBuffer(saveFile);
  }

  decodeSavedata(string: string) {
    this.setSavedata(this.decodeBase64(string));
  }

  decodeBase64(string: string): ArrayBuffer {
    let length = (string.length * 3) / 4;
    if (string[string.length - 2] == '=') {
      length -= 2;
    } else if (string[string.length - 1] == '=') {
      length -= 1;
    }

    const buffer = new ArrayBuffer(length);
    const view = new Uint8Array(buffer);
    const bits = string.match(/..../g);

    let i;
    for (i = 0; i + 2 < length; i += 3) {
      const s = atob(bits?.shift() || '');
      view[i] = s.charCodeAt(0);
      view[i + 1] = s.charCodeAt(1);
      view[i + 2] = s.charCodeAt(2);
    }

    if (i < length) {
      const s = atob(bits?.shift() || '');
      view[i++] = s.charCodeAt(0);
      if (s.length > 1) view[i++] = s.charCodeAt(1);
    }

    return buffer;
  }

  encodeBase64(view: DataView) {
    const data = [];
    const wordstring = [];
    let triplet = [];

    for (let i = 0; i < view.byteLength; ++i) {
      const b = view.getUint8(i);
      wordstring.push(String.fromCharCode(b));
      while (wordstring.length >= 3) {
        triplet = wordstring.splice(0, 3);
        data.push(btoa(triplet.join('')));
      }
    }

    if (wordstring.length) data.push(btoa(wordstring.join('')));

    return data.join('');
  }

  downloadSavedata() {
    const sram = this.mmu.save;
    if (!sram) {
      this.WARN('No save data available');

      return null;
    }

    if (window.URL) {
      const url = window.URL.createObjectURL(
        new Blob([sram.buffer], { type: 'application/octet-stream' }),
      );
      window.open(url);
    } else {
      const data = this.encodeBase64(sram.view);
      window.open('data:application/octet-stream;base64,' + data, this.rom.code + '.sav');
    }
  }

  storeSavedata() {
    try {
      const sram = this.mmu.save;
      const storage = window.localStorage;
      storage[SYS_ID + '.' + this.mmu.cart.code] = this.encodeBase64(sram.view);
    } catch (e) {
      this.WARN('Could not store savedata! ' + e);
    }
  }

  retrieveSavedata(): boolean {
    try {
      const storage = window.localStorage;
      const data = storage[SYS_ID + '.' + this.mmu.cart.code];
      if (data) {
        this.decodeSavedata(data);

        return true;
      }
    } catch (e) {
      this.WARN('Could not retrieve savedata! ' + e);
    }

    return false;
  }

  freeze(): FrostGBA {
    return {
      cpu: this.cpu.freeze(),
      mmu: this.mmu.freeze(),
      irq: this.irq.freeze(),
      io: this.io.freeze(),
      audio: this.audio.freeze(),
      video: this.video.freeze(),
    };
  }

  defrost(frost: FrostGBA) {
    this.cpu.defrost(frost.cpu);
    this.mmu.defrost(frost.mmu);
    this.audio.defrost(frost.audio);
    this.video.defrost(frost.video);
    this.irq.defrost(frost.irq);
    this.io.defrost(frost.io);
  }

  log(level: number, message: Error | string) {}

  setLogger(logger: (level: number, error: Error) => void) {
    this.log = logger;
  }

  logStackTrace(stack: string[]) {
    const overflow = stack.length - 32;
    this.ERROR('Stack trace follows:');
    if (overflow > 0) this.log(-1, '> (Too many frames)');

    for (let i = Math.max(overflow, 0); i < stack.length; ++i) {
      this.log(-1, '> ' + stack[i]);
    }
  }

  ERROR(error: string) {
    if (this.logLevel & logLvs.ERROR) this.log(logLvs.ERROR, error);
  }

  WARN(warn: string) {
    if (this.logLevel & logLvs.WARN) this.log(logLvs.WARN, warn);
  }

  STUB(func: string) {
    if (this.logLevel & logLvs.STUB) this.log(logLvs.STUB, func);
  }

  INFO(info: string) {
    if (this.logLevel & logLvs.INFO) this.log(logLvs.INFO, info);
  }

  DEBUG(info: string) {
    if (this.logLevel & logLvs.DEBUG) this.log(logLvs.DEBUG, info);
  }

  ASSERT_UNREACHED(err: string) {
    throw new Error('Should be unreached: ' + err);
  }

  ASSERT(test: boolean, err: string) {
    if (!test) throw new Error('Assertion failed: ' + err);
  }
}
