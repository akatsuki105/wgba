import { ARMCore } from './core';
import { GameBoyAdvance } from './gba';
import { irqIdx } from './irq';
import { GameBoyAdvanceRenderProxy } from './video/proxy';
import { GameBoyAdvanceSoftwareRenderer } from './video/software';

const CYCLES_PER_PIXEL = 4;
const HORIZONTAL_PIXELS = 240;
const HBLANK_PIXELS = 68;
const HDRAW_LENGTH = 1006;
const HBLANK_LENGTH = 226;
const HORIZONTAL_LENGTH = 1232;
const VERTICAL_PIXELS = 160;
const VBLANK_PIXELS = 68;
const VERTICAL_TOTAL_PIXELS = 228;
const TOTAL_LENGTH = 280896;

export type FrostVideo = {
  inHblank: boolean;
  inVblank: boolean;
  vcounter: number | boolean;
  vblankIRQ: number;
  hblankIRQ: number;
  vcounterIRQ: number;
  vcountSetting: number;
  vcount: number;
  lastHblank: number;
  nextHblank: number;
  nextEvent: number;
  nextHblankIRQ: number;
  nextVblankIRQ: number;
  nextVcounterIRQ: number;
  renderPath: any;
};

export class GameBoyAdvanceVideo {
  cpu: ARMCore;
  core: GameBoyAdvance;

  renderPath: any;

  drawCallback: () => void;
  vblankCallback: () => void;

  DISPSTAT_MASK: number;
  inHblank: boolean;
  inVblank: boolean;
  vcounter: number | boolean;
  vblankIRQ: number;
  hblankIRQ: number;
  vcounterIRQ: number;
  vcountSetting: number;
  vcount: number;
  lastHblank: number;
  nextHblankIRQ: number;
  nextVblankIRQ: number;
  nextVcounterIRQ: number;
  nextEvent: number;
  nextHblank: number;

  context?: CanvasRenderingContext2D;

  constructor(cpu: ARMCore, core: GameBoyAdvance) {
    this.cpu = cpu;
    this.core = core;

    try {
      this.renderPath = new GameBoyAdvanceRenderProxy();
    } catch (err) {
      console.log(
        "Service worker renderer couldn't load. Save states (not save files) may be glitchy",
      );
      this.renderPath = new GameBoyAdvanceSoftwareRenderer();
    }

    this.drawCallback = () => {};
    this.vblankCallback = () => {};

    this.DISPSTAT_MASK = 0;
    this.inHblank = false;
    this.inVblank = false;
    this.vcounter = 0;
    this.vblankIRQ = 0;
    this.hblankIRQ = 0;
    this.vcounterIRQ = 0;
    this.vcountSetting = 0;
    this.vcount = 0;
    this.lastHblank = 0;
    this.nextHblankIRQ = 0;
    this.nextVblankIRQ = 0;
    this.nextVcounterIRQ = 0;
    this.nextEvent = 0;
    this.nextHblank = 0;

    this.context = undefined;
  }

  clear() {
    this.renderPath.clear(this.cpu.mmu);

    // DISPSTAT
    this.DISPSTAT_MASK = 0xff38;
    this.inHblank = false;
    this.inVblank = false;
    this.vcounter = 0;
    this.vblankIRQ = 0;
    this.hblankIRQ = 0;
    this.vcounterIRQ = 0;
    this.vcountSetting = 0;

    // VCOUNT
    this.vcount = -1;

    this.lastHblank = 0;
    this.nextHblank = HDRAW_LENGTH;
    this.nextEvent = this.nextHblank;

    this.nextHblankIRQ = 0;
    this.nextVblankIRQ = 0;
    this.nextVcounterIRQ = 0;
  }

  freeze(): FrostVideo {
    return {
      inHblank: this.inHblank,
      inVblank: this.inVblank,
      vcounter: this.vcounter,
      vblankIRQ: this.vblankIRQ,
      hblankIRQ: this.hblankIRQ,
      vcounterIRQ: this.vcounterIRQ,
      vcountSetting: this.vcountSetting,
      vcount: this.vcount,
      lastHblank: this.lastHblank,
      nextHblank: this.nextHblank,
      nextEvent: this.nextEvent,
      nextHblankIRQ: this.nextHblankIRQ,
      nextVblankIRQ: this.nextVblankIRQ,
      nextVcounterIRQ: this.nextVcounterIRQ,
      renderPath: this.renderPath.freeze(this.core.encodeBase64),
    };
  }

  defrost(frost: FrostVideo) {
    this.inHblank = frost.inHblank;
    this.inVblank = frost.inVblank;
    this.vcounter = frost.vcounter;
    this.vblankIRQ = frost.vblankIRQ;
    this.hblankIRQ = frost.hblankIRQ;
    this.vcounterIRQ = frost.vcounterIRQ;
    this.vcountSetting = frost.vcountSetting;
    this.vcount = frost.vcount;
    this.lastHblank = frost.lastHblank;
    this.nextHblank = frost.nextHblank;
    this.nextEvent = frost.nextEvent;
    this.nextHblankIRQ = frost.nextHblankIRQ;
    this.nextVblankIRQ = frost.nextVblankIRQ;
    this.nextVcounterIRQ = frost.nextVcounterIRQ;
    this.renderPath.defrost(frost.renderPath, this.core.decodeBase64);
  }

  setBacking(backing: CanvasRenderingContext2D) {
    const pixelData = backing.createImageData(HORIZONTAL_PIXELS, VERTICAL_PIXELS);
    this.context = backing;

    // Clear backing first
    for (let offset = 0; offset < HORIZONTAL_PIXELS * VERTICAL_PIXELS * 4; ) {
      pixelData.data[offset++] = 0xff;
      pixelData.data[offset++] = 0xff;
      pixelData.data[offset++] = 0xff;
      pixelData.data[offset++] = 0xff;
    }

    this.renderPath.setBacking(pixelData);
  }

  updateTimers(cpu: ARMCore) {
    const cycles = cpu.cycles;

    if (this.nextEvent <= cycles) {
      if (this.inHblank) {
        // End Hblank
        this.inHblank = false;
        this.nextEvent = this.nextHblank;

        ++this.vcount;

        switch (this.vcount) {
          case VERTICAL_PIXELS:
            this.inVblank = true;
            this.renderPath.finishDraw(this);
            this.nextVblankIRQ = this.nextEvent + TOTAL_LENGTH;
            this.cpu.mmu.runVblankDmas();
            if (this.vblankIRQ) this.cpu.irq?.raiseIRQ(irqIdx.VBLANK);
            this.vblankCallback();
            break;
          case VERTICAL_TOTAL_PIXELS - 1:
            this.inVblank = false;
            break;
          case VERTICAL_TOTAL_PIXELS:
            this.vcount = 0;
            this.renderPath.startDraw();
            break;
        }

        this.vcounter = this.vcount == this.vcountSetting;
        if (this.vcounter && this.vcounterIRQ) {
          this.cpu.irq?.raiseIRQ(irqIdx.VCOUNTER);
          this.nextVcounterIRQ += TOTAL_LENGTH;
        }

        if (this.vcount < VERTICAL_PIXELS) this.renderPath.drawScanline(this.vcount);
      } else {
        // Begin Hblank
        this.inHblank = true;
        this.lastHblank = this.nextHblank;
        this.nextEvent = this.lastHblank + HBLANK_LENGTH;
        this.nextHblank = this.nextEvent + HDRAW_LENGTH;
        this.nextHblankIRQ = this.nextHblank;

        if (this.vcount < VERTICAL_PIXELS) this.cpu.mmu.runHblankDmas();
        if (this.hblankIRQ) this.cpu.irq?.raiseIRQ(irqIdx.HBLANK);
      }
    }
  }

  writeDisplayStat(value: number) {
    this.vblankIRQ = value & 0x0008;
    this.hblankIRQ = value & 0x0010;
    this.vcounterIRQ = value & 0x0020;
    this.vcountSetting = (value & 0xff00) >> 8;

    if (this.vcounterIRQ) {
      // FIXME: this can be too late if we're in the middle of an Hblank
      this.nextVcounterIRQ =
        this.nextHblank + HBLANK_LENGTH + (this.vcountSetting - this.vcount) * HORIZONTAL_LENGTH;
      if (this.nextVcounterIRQ < this.nextEvent) this.nextVcounterIRQ += TOTAL_LENGTH;
    }
  }

  readDisplayStat() {
    return Number(this.inVblank) | (Number(this.inHblank) << 1) | (Number(this.vcounter) << 2);
  }

  finishDraw(pixelData: ImageData) {
    if (this.context) this.context.putImageData(pixelData, 0, 0);
    this.drawCallback();
  }

  scheduleVCaptureDma(dma: any, info: any) {}
}
