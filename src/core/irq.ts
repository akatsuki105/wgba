import { GameBoyAdvanceAudio } from './audio';
import { ARMCore, execMode, LR, PC, privMode, SP } from './core';
import { GameBoyAdvance } from './gba';
import { GameBoyAdvanceIO, ioAddr } from './io';
import { MemoryBlock, region, size } from './mmu';
import { GameBoyAdvanceVideo } from './video';

export const CPU_FREQUENCY = 16.78 * 1000 * 1000;

type Timer = {
  reload: number;
  oldReload: number;
  prescaleBits: number;
  countUp: boolean;
  doIrq: boolean;
  enable: boolean;
  lastEvent: number;
  nextEvent: number;
  overflowInterval: number;
};

export type DMA = {
  source: number;
  dest: number;
  count: number;
  nextSource: number;
  nextDest: number;
  nextCount: number;
  srcControl: number;
  dstControl: number;
  repeat: boolean;
  width: number;
  drq: boolean;
  timing: number;
  doIrq: boolean;
  enable: boolean;
  nextIRQ: number;
};

export type FrostIRQ = {
  enable: boolean;
  enabledIRQs: number;
  interruptFlags: number;
  dma: DMA[];
  timers: Timer[];
  nextEvent: number;
  springIRQ: boolean;
};

const mask = {
  VBLANK: 0x0001,
  HBLANK: 0x0002,
  VCOUNTER: 0x0004,
  TIMER0: 0x0008,
  TIMER1: 0x0010,
  TIMER2: 0x0020,
  TIMER3: 0x0040,
  SIO: 0x0080,
  DMA0: 0x0100,
  DMA1: 0x0200,
  DMA2: 0x0400,
  DMA3: 0x0800,
  KEYPAD: 0x1000,
  GAMEPAK: 0x2000,
} as const;

export const irqIdx = {
  VBLANK: 0,
  HBLANK: 1,
  VCOUNTER: 2,
  TIMER0: 3,
  TIMER1: 4,
  TIMER2: 5,
  TIMER3: 6,
  SIO: 7,
  DMA0: 8,
  DMA1: 9,
  DMA2: 10,
  DMA3: 11,
  KEYPAD: 12,
  GAMEPAK: 13,
} as const;

export class GameBoyAdvanceInterruptHandler {
  enable: boolean;
  enabledIRQs: number;
  interruptFlags: number;
  dma: DMA[];
  springIRQ: boolean;

  cpu: ARMCore;
  io: GameBoyAdvanceIO;
  core: GameBoyAdvance;
  audio?: GameBoyAdvanceAudio;
  video?: GameBoyAdvanceVideo;

  nextEvent: number;

  timersEnabled: number;
  timers: Timer[];

  constructor(
    cpu: ARMCore,
    io: GameBoyAdvanceIO,
    audio: GameBoyAdvanceAudio,
    video: GameBoyAdvanceVideo,
    core: GameBoyAdvance,
  ) {
    this.cpu = cpu;
    this.core = core;

    this.enable = false;
    this.enabledIRQs = 0;
    this.interruptFlags = 0;
    this.dma = [];
    this.springIRQ = false;

    this.io = io;
    this.nextEvent = 0;

    this.timersEnabled = 0;
    this.timers = [];

    this.audio = audio;
    this.video = video;
  }

  clear() {
    this.enable = false;
    this.enabledIRQs = 0;
    this.interruptFlags = 0;

    this.dma = [];
    for (let i = 0; i < 4; ++i) {
      this.dma.push({
        source: 0,
        dest: 0,
        count: 0,
        nextSource: 0,
        nextDest: 0,
        nextCount: 0,
        srcControl: 0,
        dstControl: 0,
        repeat: false,
        width: 0,
        drq: false,
        timing: 0,
        doIrq: false,
        enable: false,
        nextIRQ: 0,
      });
    }

    this.timersEnabled = 0;
    this.timers = [];
    for (let i = 0; i < 4; ++i) {
      this.timers.push({
        reload: 0,
        oldReload: 0,
        prescaleBits: 0,
        countUp: false,
        doIrq: false,
        enable: false,
        lastEvent: 0,
        nextEvent: 0,
        overflowInterval: 1,
      });
    }

    this.nextEvent = 0;
    this.springIRQ = false;
    this.resetSP();
  }

  freeze(): FrostIRQ {
    return {
      enable: this.enable,
      enabledIRQs: this.enabledIRQs,
      interruptFlags: this.interruptFlags,
      dma: this.dma,
      timers: this.timers,
      nextEvent: this.nextEvent,
      springIRQ: this.springIRQ,
    };
  }

  defrost(frost: FrostIRQ) {
    this.enable = frost.enable;
    this.enabledIRQs = frost.enabledIRQs;
    this.interruptFlags = frost.interruptFlags;
    this.dma = frost.dma;
    this.timers = frost.timers;
    this.timersEnabled = 0;
    if (this.timers[0].enable) {
      ++this.timersEnabled;
    }
    if (this.timers[1].enable) {
      ++this.timersEnabled;
    }
    if (this.timers[2].enable) {
      ++this.timersEnabled;
    }
    if (this.timers[3].enable) {
      ++this.timersEnabled;
    }
    this.nextEvent = frost.nextEvent;
    this.springIRQ = frost.springIRQ;
  }

  updateTimers() {
    if (this.nextEvent > this.cpu.cycles) return;

    if (this.springIRQ) {
      this.cpu.raiseIRQ();
      this.springIRQ = false;
    }

    this.video?.updateTimers(this.cpu);
    this.audio?.updateTimers();
    if (this.timersEnabled) {
      let timer = this.timers[0];
      if (timer.enable) {
        if (this.cpu.cycles >= timer.nextEvent) {
          timer.lastEvent = timer.nextEvent;
          timer.nextEvent += timer.overflowInterval;
          this.io.registers[ioAddr.TM0CNT_LO >> 1] = timer.reload;
          timer.oldReload = timer.reload;

          if (timer.doIrq) this.raiseIRQ(irqIdx.TIMER0);

          if (this.audio?.enabled) {
            if (this.audio?.enableChannelA && !this.audio?.soundTimerA && this.audio?.dmaA >= 0) {
              this.audio?.sampleFifoA();
            }

            if (this.audio?.enableChannelB && !this.audio?.soundTimerB && this.audio?.dmaB >= 0) {
              this.audio?.sampleFifoB();
            }
          }

          timer = this.timers[1];
          if (timer.countUp) {
            if (++this.io.registers[ioAddr.TM1CNT_LO >> 1] == 0x10000) {
              timer.nextEvent = this.cpu.cycles;
            }
          }
        }
      }

      timer = this.timers[1];
      if (timer.enable) {
        if (this.cpu.cycles >= timer.nextEvent) {
          timer.lastEvent = timer.nextEvent;
          timer.nextEvent += timer.overflowInterval;
          if (!timer.countUp || this.io.registers[ioAddr.TM1CNT_LO >> 1] == 0x10000) {
            this.io.registers[ioAddr.TM1CNT_LO >> 1] = timer.reload;
          }
          timer.oldReload = timer.reload;

          if (timer.doIrq) this.raiseIRQ(irqIdx.TIMER1);
          if (timer.countUp) timer.nextEvent = 0;

          if (this.audio?.enabled) {
            if (this.audio?.enableChannelA && this.audio?.soundTimerA && this.audio?.dmaA >= 0) {
              this.audio?.sampleFifoA();
            }

            if (this.audio?.enableChannelB && this.audio?.soundTimerB && this.audio?.dmaB >= 0) {
              this.audio?.sampleFifoB();
            }
          }

          timer = this.timers[2];
          if (timer.countUp) {
            if (++this.io.registers[ioAddr.TM2CNT_LO >> 1] == 0x10000) {
              timer.nextEvent = this.cpu.cycles;
            }
          }
        }
      }

      timer = this.timers[2];
      if (timer.enable) {
        if (this.cpu.cycles >= timer.nextEvent) {
          timer.lastEvent = timer.nextEvent;
          timer.nextEvent += timer.overflowInterval;
          if (!timer.countUp || this.io.registers[ioAddr.TM2CNT_LO >> 1] == 0x10000) {
            this.io.registers[ioAddr.TM2CNT_LO >> 1] = timer.reload;
          }
          timer.oldReload = timer.reload;

          if (timer.doIrq) this.raiseIRQ(irqIdx.TIMER2);
          if (timer.countUp) timer.nextEvent = 0;

          timer = this.timers[3];
          if (timer.countUp) {
            if (++this.io.registers[ioAddr.TM3CNT_LO >> 1] == 0x10000) {
              timer.nextEvent = this.cpu.cycles;
            }
          }
        }
      }

      timer = this.timers[3];
      if (timer.enable) {
        if (this.cpu.cycles >= timer.nextEvent) {
          timer.lastEvent = timer.nextEvent;
          timer.nextEvent += timer.overflowInterval;
          if (!timer.countUp || this.io.registers[ioAddr.TM3CNT_LO >> 1] == 0x10000) {
            this.io.registers[ioAddr.TM3CNT_LO >> 1] = timer.reload;
          }
          timer.oldReload = timer.reload;

          if (timer.doIrq) this.raiseIRQ(irqIdx.TIMER3);
          if (timer.countUp) timer.nextEvent = 0;
        }
      }
    }

    let dma = this.dma[0];
    if (dma.enable && dma.doIrq && dma.nextIRQ && this.cpu.cycles >= dma.nextIRQ) {
      dma.nextIRQ = 0;
      this.raiseIRQ(irqIdx.DMA0);
    }

    dma = this.dma[1];
    if (dma.enable && dma.doIrq && dma.nextIRQ && this.cpu.cycles >= dma.nextIRQ) {
      dma.nextIRQ = 0;
      this.raiseIRQ(irqIdx.DMA1);
    }

    dma = this.dma[2];
    if (dma.enable && dma.doIrq && dma.nextIRQ && this.cpu.cycles >= dma.nextIRQ) {
      dma.nextIRQ = 0;
      this.raiseIRQ(irqIdx.DMA2);
    }

    dma = this.dma[3];
    if (dma.enable && dma.doIrq && dma.nextIRQ && this.cpu.cycles >= dma.nextIRQ) {
      dma.nextIRQ = 0;
      this.raiseIRQ(irqIdx.DMA3);
    }

    this.pollNextEvent();
  }

  resetSP() {
    this.cpu.switchMode(privMode.SUPERVISOR);
    this.cpu.gprs[SP] = 0x3007fe0;
    this.cpu.switchMode(privMode.IRQ);
    this.cpu.gprs[SP] = 0x3007fa0;
    this.cpu.switchMode(privMode.SYSTEM);
    this.cpu.gprs[SP] = 0x3007f00;
  }

  swi32(opcode: number) {
    this.swi(opcode >> 16);
  }

  swi(opcode: number) {
    if (this.core.mmu.bios?.real) {
      this.cpu.raiseTrap();

      return;
    }

    switch (opcode) {
      case 0x00: {
        // SoftReset
        const mem = this.core.mmu.memory[region.WORKING_IRAM];
        const flag = mem.loadU8(0x7ffa);
        for (let i = 0x7e00; i < 0x8000; i += 4) {
          mem.store32(i, 0);
        }
        this.resetSP();
        this.cpu.gprs[LR] = !flag ? 0x08000000 : 0x02000000;
        this.cpu.switchExecMode(execMode.ARM);
        this.cpu.instruction.writesPC = true;
        this.cpu.gprs[PC] = this.cpu.gprs[LR];
        break;
      }
      case 0x01: {
        // RegisterRamReset
        const regions = this.cpu.gprs[0];
        if (regions & 0x01) {
          this.core.mmu.memory[region.WORKING_RAM] = new MemoryBlock(size.WORKING_RAM, 9);
        }
        if (regions & 0x02) {
          for (let i = 0; i < size.WORKING_IRAM - 0x200; i += 4) {
            this.core.mmu.memory[region.WORKING_IRAM].store32(i, 0);
          }
        }
        if (regions & 0x1c) {
          this.video?.renderPath.clearSubsets(this.core.mmu, regions);
        }
        if (regions & 0xe0) {
          this.core.STUB('Unimplemented RegisterRamReset');
        }
        break;
      }
      case 0x02: {
        // Halt
        this.halt();
        break;
      }
      case 0x05:
        // VBlankIntrWait
        this.cpu.gprs[0] = 1;
        this.cpu.gprs[1] = 1;
      // Fall through:
      case 0x04: {
        // IntrWait
        if (!this.enable) {
          this.io.store16(ioAddr.IME, 1);
        }
        if (!this.cpu.gprs[0] && this.interruptFlags & this.cpu.gprs[1]) {
          return;
        }
        this.dismissIRQs(0xffffffff);
        this.cpu.raiseTrap();
        break;
      }
      case 0x06: {
        // Div
        const result = (this.cpu.gprs[0] | 0) / (this.cpu.gprs[1] | 0);
        const mod = (this.cpu.gprs[0] | 0) % (this.cpu.gprs[1] | 0);
        this.cpu.gprs[0] = result | 0;
        this.cpu.gprs[1] = mod | 0;
        this.cpu.gprs[3] = Math.abs(result | 0);
        break;
      }
      case 0x07: {
        // DivArm
        const result = (this.cpu.gprs[1] | 0) / (this.cpu.gprs[0] | 0);
        const mod = (this.cpu.gprs[1] | 0) % (this.cpu.gprs[0] | 0);
        this.cpu.gprs[0] = result | 0;
        this.cpu.gprs[1] = mod | 0;
        this.cpu.gprs[3] = Math.abs(result | 0);
        break;
      }
      case 0x08: {
        // Sqrt
        const root = Math.sqrt(this.cpu.gprs[0]);
        this.cpu.gprs[0] = root | 0; // Coerce down to int
        break;
      }
      case 0x0a: {
        // ArcTan2
        const x = this.cpu.gprs[0] / 16384;
        const y = this.cpu.gprs[1] / 16384;
        this.cpu.gprs[0] = (Math.atan2(y, x) / (2 * Math.PI)) * 0x10000;
        break;
      }
      case 0x0b: {
        // CpuSet
        let [source, dest] = [this.cpu.gprs[0], this.cpu.gprs[1]];
        const mode = this.cpu.gprs[2];
        const count = mode & 0x000fffff;
        const fill = mode & 0x01000000;
        const wordsize = mode & 0x04000000 ? 4 : 2;

        if (fill) {
          if (wordsize == 4) {
            source &= 0xfffffffc;
            dest &= 0xfffffffc;
            const word = this.cpu.mmu.load32(source);
            for (let i = 0; i < count; ++i) {
              this.cpu.mmu.store32(dest + (i << 2), word);
            }
          } else {
            source &= 0xfffffffe;
            dest &= 0xfffffffe;
            const word = this.cpu.mmu.load16(source);
            for (let i = 0; i < count; ++i) {
              this.cpu.mmu.store16(dest + (i << 1), word);
            }
          }
        } else {
          if (wordsize == 4) {
            source &= 0xfffffffc;
            dest &= 0xfffffffc;
            for (let i = 0; i < count; ++i) {
              const word = this.cpu.mmu.load32(source + (i << 2));
              this.cpu.mmu.store32(dest + (i << 2), word);
            }
          } else {
            source &= 0xfffffffe;
            dest &= 0xfffffffe;
            for (let i = 0; i < count; ++i) {
              const word = this.cpu.mmu.load16(source + (i << 1));
              this.cpu.mmu.store16(dest + (i << 1), word);
            }
          }
        }

        return;
      }
      case 0x0c: {
        // FastCpuSet
        const source = this.cpu.gprs[0] & 0xfffffffc;
        const dest = this.cpu.gprs[1] & 0xfffffffc;
        const mode = this.cpu.gprs[2];
        let count = mode & 0x000fffff;
        count = ((count + 7) >> 3) << 3;
        const fill = mode & 0x01000000;
        if (fill) {
          const word = this.cpu.mmu.load32(source);
          for (let i = 0; i < count; ++i) {
            this.cpu.mmu.store32(dest + (i << 2), word);
          }
        } else {
          for (let i = 0; i < count; ++i) {
            const word = this.cpu.mmu.load32(source + (i << 2));
            this.cpu.mmu.store32(dest + (i << 2), word);
          }
        }

        return;
      }
      case 0x0d: {
        // GetBiosChecksum
        this.cpu.gprs[0] = 0xbaae187f;
        this.cpu.gprs[1] = 1;
        this.cpu.gprs[3] = 0x00004000;
      }
      case 0x0e: {
        // BgAffineSet
        let i = this.cpu.gprs[2];
        let ox, oy;
        let cx, cy;
        let sx, sy;
        let theta;
        let offset = this.cpu.gprs[0];
        let destination = this.cpu.gprs[1];
        let a, b, c, d;
        let rx, ry;
        while (i--) {
          // [ sx   0  0 ]   [ cos(theta)  -sin(theta)  0 ]   [ 1  0  cx - ox ]   [ A B rx ]
          // [  0  sy  0 ] * [ sin(theta)   cos(theta)  0 ] * [ 0  1  cy - oy ] = [ C D ry ]
          // [  0   0  1 ]   [     0            0       1 ]   [ 0  0     1    ]   [ 0 0  1 ]
          ox = this.core.mmu.load32(offset) / 256;
          oy = this.core.mmu.load32(offset + 4) / 256;
          cx = this.core.mmu.load16(offset + 8);
          cy = this.core.mmu.load16(offset + 10);
          sx = this.core.mmu.load16(offset + 12) / 256;
          sy = this.core.mmu.load16(offset + 14) / 256;
          theta = ((this.core.mmu.loadU16(offset + 16) >> 8) / 128) * Math.PI;
          offset += 20;
          // Rotation
          a = d = Math.cos(theta);
          b = c = Math.sin(theta);
          // Scale
          a *= sx;
          b *= -sx;
          c *= sy;
          d *= sy;
          // Translate
          rx = ox - (a * cx + b * cy);
          ry = oy - (c * cx + d * cy);
          this.core.mmu.store16(destination, (a * 256) | 0);
          this.core.mmu.store16(destination + 2, (b * 256) | 0);
          this.core.mmu.store16(destination + 4, (c * 256) | 0);
          this.core.mmu.store16(destination + 6, (d * 256) | 0);
          this.core.mmu.store32(destination + 8, (rx * 256) | 0);
          this.core.mmu.store32(destination + 12, (ry * 256) | 0);
          destination += 16;
        }
        break;
      }
      case 0x0f: {
        // ObjAffineSet
        let i = this.cpu.gprs[2];
        let sx, sy;
        let theta;
        let offset = this.cpu.gprs[0];
        let destination = this.cpu.gprs[1];
        const diff = this.cpu.gprs[3];
        let a, b, c, d;
        while (i--) {
          // [ sx   0 ]   [ cos(theta)  -sin(theta) ]   [ A B ]
          // [  0  sy ] * [ sin(theta)   cos(theta) ] = [ C D ]
          sx = this.core.mmu.load16(offset) / 256;
          sy = this.core.mmu.load16(offset + 2) / 256;
          theta = ((this.core.mmu.loadU16(offset + 4) >> 8) / 128) * Math.PI;
          offset += 6;
          // Rotation
          a = d = Math.cos(theta);
          b = c = Math.sin(theta);
          // Scale
          a *= sx;
          b *= -sx;
          c *= sy;
          d *= sy;
          this.core.mmu.store16(destination, (a * 256) | 0);
          this.core.mmu.store16(destination + diff, (b * 256) | 0);
          this.core.mmu.store16(destination + diff * 2, (c * 256) | 0);
          this.core.mmu.store16(destination + diff * 3, (d * 256) | 0);
          destination += diff * 4;
        }
        break;
      }
      case 0x11:
        // LZ77UnCompWram
        this.lz77(this.cpu.gprs[0], this.cpu.gprs[1], 1);
        break;
      case 0x12:
        // LZ77UnCompVram
        this.lz77(this.cpu.gprs[0], this.cpu.gprs[1], 2);
        break;
      case 0x13:
        // HuffUnComp
        this.huffman(this.cpu.gprs[0], this.cpu.gprs[1]);
        break;
      case 0x14:
        // RlUnCompWram
        this.rl(this.cpu.gprs[0], this.cpu.gprs[1], 1);
        break;
      case 0x15:
        // RlUnCompVram
        this.rl(this.cpu.gprs[0], this.cpu.gprs[1], 2);
        break;
      case 0x1f:
        // MidiKey2Freq
        const key = this.cpu.mmu.load32(this.cpu.gprs[0] + 4);
        this.cpu.gprs[0] =
          (key / Math.pow(2, (180 - this.cpu.gprs[1] - this.cpu.gprs[2] / 256) / 12)) >>> 0;
        break;
      default:
        throw 'Unimplemented software interrupt: 0x' + opcode.toString(16);
    }
  }

  masterEnable(value: boolean) {
    this.enable = value;

    if (this.enable && this.enabledIRQs & this.interruptFlags) {
      this.cpu.raiseIRQ();
    }
  }

  setInterruptsEnabled(value: number) {
    this.enabledIRQs = value;

    if (this.enabledIRQs & mask.SIO) {
      this.core.STUB('Serial I/O interrupts not implemented');
    }

    if (this.enabledIRQs & mask.KEYPAD) {
      this.core.STUB('Keypad interrupts not implemented');
    }

    if (this.enable && this.enabledIRQs & this.interruptFlags) {
      this.cpu.raiseIRQ();
    }
  }

  pollNextEvent() {
    let nextEvent = this.video?.nextEvent || 0;
    let test;

    if (this.audio?.enabled) {
      test = this.audio?.nextEvent;
      if (!nextEvent || test < nextEvent) nextEvent = test;
    }

    if (this.timersEnabled) {
      let timer = this.timers[0];
      test = timer.nextEvent;
      if (timer.enable && test && (!nextEvent || test < nextEvent)) {
        nextEvent = test;
      }

      timer = this.timers[1];
      test = timer.nextEvent;
      if (timer.enable && test && (!nextEvent || test < nextEvent)) {
        nextEvent = test;
      }
      timer = this.timers[2];
      test = timer.nextEvent;
      if (timer.enable && test && (!nextEvent || test < nextEvent)) {
        nextEvent = test;
      }
      timer = this.timers[3];
      test = timer.nextEvent;
      if (timer.enable && test && (!nextEvent || test < nextEvent)) {
        nextEvent = test;
      }
    }

    let dma = this.dma[0];
    test = dma.nextIRQ;
    if (dma.enable && dma.doIrq && test && (!nextEvent || test < nextEvent)) {
      nextEvent = test;
    }

    dma = this.dma[1];
    test = dma.nextIRQ;
    if (dma.enable && dma.doIrq && test && (!nextEvent || test < nextEvent)) {
      nextEvent = test;
    }

    dma = this.dma[2];
    test = dma.nextIRQ;
    if (dma.enable && dma.doIrq && test && (!nextEvent || test < nextEvent)) {
      nextEvent = test;
    }

    dma = this.dma[3];
    test = dma.nextIRQ;
    if (dma.enable && dma.doIrq && test && (!nextEvent || test < nextEvent)) {
      nextEvent = test;
    }

    this.core.ASSERT(nextEvent >= this.cpu.cycles, 'Next event is before present');
    this.nextEvent = nextEvent;
  }

  waitForIRQ() {
    let timer;
    let irqPending: number | boolean =
      this.testIRQ() ||
      this.video?.hblankIRQ ||
      this.video?.vblankIRQ ||
      this.video?.vcounterIRQ ||
      0;
    if (this.timersEnabled) {
      timer = this.timers[0];
      irqPending = irqPending || timer.doIrq;
      timer = this.timers[1];
      irqPending = irqPending || timer.doIrq;
      timer = this.timers[2];
      irqPending = irqPending || timer.doIrq;
      timer = this.timers[3];
      irqPending = irqPending || timer.doIrq;
    }
    if (!irqPending) return false;

    for (;;) {
      this.pollNextEvent();

      if (!this.nextEvent) {
        return false;
      } else {
        this.cpu.cycles = this.nextEvent;
        this.updateTimers();
        if (this.interruptFlags) return true;
      }
    }
  }

  testIRQ(): boolean {
    if (this.enable && this.enabledIRQs & this.interruptFlags) {
      this.springIRQ = true;
      this.nextEvent = this.cpu.cycles;

      return true;
    }

    return false;
  }

  raiseIRQ(irqType: number) {
    this.interruptFlags |= 1 << irqType;
    this.io.registers[ioAddr.IF >> 1] = this.interruptFlags;

    if (this.enable && this.enabledIRQs & (1 << irqType)) {
      this.cpu.raiseIRQ();
    }
  }

  dismissIRQs(irqMask: number) {
    this.interruptFlags &= ~irqMask;
    this.io.registers[ioAddr.IF >> 1] = this.interruptFlags;
  }

  dmaSetSourceAddress(dma: number, address: number) {
    this.dma[dma].source = address & 0xfffffffe;
  }

  dmaSetDestAddress(dma: number, address: number) {
    this.dma[dma].dest = address & 0xfffffffe;
  }

  dmaSetWordCount(dma: number, count: number) {
    this.dma[dma].count = count ? count : dma == 3 ? 0x10000 : 0x4000;
  }

  dmaWriteControl(dma: number, control: number) {
    const currentDma = this.dma[dma];
    const wasEnabled = currentDma.enable;
    currentDma.dstControl = (control & 0x0060) >> 5;
    currentDma.srcControl = (control & 0x0180) >> 7;
    currentDma.repeat = !!(control & 0x0200);
    currentDma.width = control & 0x0400 ? 4 : 2;
    currentDma.drq = !!(control & 0x0800);
    currentDma.timing = (control & 0x3000) >> 12;
    currentDma.doIrq = !!(control & 0x4000);
    currentDma.enable = !!(control & 0x8000);
    currentDma.nextIRQ = 0;

    if (currentDma.drq) this.core.WARN('DRQ not implemented');

    if (!wasEnabled && currentDma.enable) {
      currentDma.nextSource = currentDma.source;
      currentDma.nextDest = currentDma.dest;
      currentDma.nextCount = currentDma.count;
      this.cpu.mmu.scheduleDma(dma, currentDma);
    }
  }

  timerSetReload(timer: number, reload: number) {
    this.timers[timer].reload = reload & 0xffff;
  }

  timerWriteControl(timer: number, control: number) {
    const currentTimer = this.timers[timer];
    const oldPrescale = currentTimer.prescaleBits;
    switch (control & 0x0003) {
      case 0x0000:
        currentTimer.prescaleBits = 0;
        break;
      case 0x0001:
        currentTimer.prescaleBits = 6;
        break;
      case 0x0002:
        currentTimer.prescaleBits = 8;
        break;
      case 0x0003:
        currentTimer.prescaleBits = 10;
        break;
    }
    currentTimer.countUp = !!(control & 0x0004);
    currentTimer.doIrq = !!(control & 0x0040);
    currentTimer.overflowInterval = (0x10000 - currentTimer.reload) << currentTimer.prescaleBits;
    const wasEnabled = currentTimer.enable;
    currentTimer.enable = !!(((control & 0x0080) >> 7) << timer);
    if (!wasEnabled && currentTimer.enable) {
      if (!currentTimer.countUp) {
        currentTimer.lastEvent = this.cpu.cycles;
        currentTimer.nextEvent = this.cpu.cycles + currentTimer.overflowInterval;
      } else {
        currentTimer.nextEvent = 0;
      }
      this.io.registers[(ioAddr.TM0CNT_LO + (timer << 2)) >> 1] = currentTimer.reload;
      currentTimer.oldReload = currentTimer.reload;
      ++this.timersEnabled;
    } else if (wasEnabled && !currentTimer.enable) {
      if (!currentTimer.countUp) {
        this.io.registers[(ioAddr.TM0CNT_LO + (timer << 2)) >> 1] =
          (currentTimer.oldReload + (this.cpu.cycles - currentTimer.lastEvent)) >> oldPrescale;
      }
      --this.timersEnabled;
    } else if (currentTimer.prescaleBits != oldPrescale && !currentTimer.countUp) {
      // FIXME: this might be before present
      currentTimer.nextEvent = currentTimer.lastEvent + currentTimer.overflowInterval;
    }

    // We've changed the timers somehow...we need to reset the next event
    this.pollNextEvent();
  }

  timerRead(timer: number): number {
    const currentTimer = this.timers[timer];
    if (currentTimer.enable && !currentTimer.countUp) {
      return (
        (currentTimer.oldReload + (this.cpu.cycles - currentTimer.lastEvent)) >>
        currentTimer.prescaleBits
      );
    }

    return this.io.registers[(ioAddr.TM0CNT_LO + (timer << 2)) >> 1];
  }

  halt() {
    if (!this.enable) throw 'Requested HALT when interrupts were disabled!';
    if (!this.waitForIRQ()) throw 'Waiting on interrupt forever.';
  }

  lz77(source: number, dest: number, unitsize: number) {
    // TODO: move to a different file
    let remaining = (this.cpu.mmu.load32(source) & 0xffffff00) >> 8;
    // We assume the signature byte (0x10) is correct
    let blockheader;
    let sPointer = source + 4;
    let dPointer = dest;
    let blocksRemaining = 0;
    let block;
    let disp;
    let bytes;
    let buffer = 0;
    let loaded;
    while (remaining > 0) {
      if (blocksRemaining) {
        if (blockheader & 0x80) {
          // Compressed
          block = this.cpu.mmu.loadU8(sPointer) | (this.cpu.mmu.loadU8(sPointer + 1) << 8);
          sPointer += 2;
          disp = dPointer - (((block & 0x000f) << 8) | ((block & 0xff00) >> 8)) - 1;
          bytes = ((block & 0x00f0) >> 4) + 3;
          while (bytes-- && remaining) {
            loaded = this.cpu.mmu.loadU8(disp++);
            if (unitsize == 2) {
              buffer >>= 8;
              buffer |= loaded << 8;
              if (dPointer & 1) {
                this.cpu.mmu.store16(dPointer - 1, buffer);
              }
            } else {
              this.cpu.mmu.store8(dPointer, loaded);
            }
            --remaining;
            ++dPointer;
          }
        } else {
          // Uncompressed
          loaded = this.cpu.mmu.loadU8(sPointer++);
          if (unitsize == 2) {
            buffer >>= 8;
            buffer |= loaded << 8;
            if (dPointer & 1) {
              this.cpu.mmu.store16(dPointer - 1, buffer);
            }
          } else {
            this.cpu.mmu.store8(dPointer, loaded);
          }
          --remaining;
          ++dPointer;
        }
        blockheader <<= 1;
        --blocksRemaining;
      } else {
        blockheader = this.cpu.mmu.loadU8(sPointer++);
        blocksRemaining = 8;
      }
    }
  }

  huffman(source: number, dest: number) {
    source = source & 0xfffffffc;
    const header = this.cpu.mmu.load32(source);
    let remaining = header >> 8;

    const bits = header & 0xf;
    if (32 % bits) throw 'Unimplemented unaligned Huffman';

    const padding = (4 - remaining) & 0x3;
    remaining &= 0xfffffffc;

    // We assume the signature byte (0x20) is correct
    const tree = [];
    const treesize = (this.cpu.mmu.loadU8(source + 4) << 1) + 1;

    let block = 0;
    let sPointer = source + 5 + treesize;
    let dPointer = dest & 0xfffffffc;

    for (let i = 0; i < treesize; ++i) {
      tree.push(this.cpu.mmu.loadU8(source + 5 + i));
    }

    let node;
    let offset = 0;
    let bitsRemaining;
    let readBits;
    let bitsSeen = 0;
    node = tree[0];
    while (remaining > 0) {
      let bitstream = this.cpu.mmu.load32(sPointer);
      sPointer += 4;

      for (bitsRemaining = 32; bitsRemaining > 0; --bitsRemaining, bitstream <<= 1) {
        if (typeof node === 'number') {
          // Lazily construct tree
          const next: number = ((offset - 1) | 1) + ((node & 0x3f) << 1) + 2;
          node = {
            l: next,
            r: next + 1,
            lTerm: node & 0x80,
            rTerm: node & 0x40,
          };
          tree[offset] = node;
        }

        if (bitstream & 0x80000000) {
          // Go right
          if (node.rTerm) {
            readBits = tree[node.r];
          } else {
            offset = node.r;
            node = tree[node.r];
            continue;
          }
        } else {
          // Go left
          if (node.lTerm) {
            readBits = tree[node.l];
          } else {
            offset = node.l;
            node = tree[offset];
            continue;
          }
        }

        block |= (readBits & ((1 << bits) - 1)) << bitsSeen;
        bitsSeen += bits;
        offset = 0;
        node = tree[0];
        if (bitsSeen == 32) {
          bitsSeen = 0;
          this.cpu.mmu.store32(dPointer, block);
          dPointer += 4;
          remaining -= 4;
          block = 0;
        }
      }
    }
    if (padding) this.cpu.mmu.store32(dPointer, block);
  }

  rl(source: number, dest: number, unitsize: number) {
    source = source & 0xfffffffc;
    let remaining = (this.cpu.mmu.load32(source) & 0xffffff00) >> 8;
    let padding = (4 - remaining) & 0x3;
    // We assume the signature byte (0x30) is correct
    let blockheader;
    let block;
    let sPointer = source + 4;
    let dPointer = dest;
    let buffer = 0;
    while (remaining > 0) {
      blockheader = this.cpu.mmu.loadU8(sPointer++);
      if (blockheader & 0x80) {
        // Compressed
        blockheader &= 0x7f;
        blockheader += 3;
        block = this.cpu.mmu.loadU8(sPointer++);
        while (blockheader-- && remaining) {
          --remaining;
          if (unitsize == 2) {
            buffer >>= 8;
            buffer |= block << 8;
            if (dPointer & 1) {
              this.cpu.mmu.store16(dPointer - 1, buffer);
            }
          } else {
            this.cpu.mmu.store8(dPointer, block);
          }
          ++dPointer;
        }
      } else {
        // Uncompressed
        blockheader++;
        while (blockheader-- && remaining) {
          --remaining;
          block = this.cpu.mmu.loadU8(sPointer++);
          if (unitsize == 2) {
            buffer >>= 8;
            buffer |= block << 8;
            if (dPointer & 1) {
              this.cpu.mmu.store16(dPointer - 1, buffer);
            }
          } else {
            this.cpu.mmu.store8(dPointer, block);
          }
          ++dPointer;
        }
      }
    }
    while (padding--) {
      this.cpu.mmu.store8(dPointer++, 0);
    }
  }
}
