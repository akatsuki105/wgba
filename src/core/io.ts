import { GameBoyAdvanceAudio } from './audio';
import { ARMCore } from './core';
import { GameBoyAdvance } from './gba';
import { GameBoyAdvanceKeypad } from './keypad';
import { size } from './mmu';
import { GameBoyAdvanceSIO } from './sio';
import { Serializer } from './util';
import { GameBoyAdvanceVideo } from './video';

export type FrostIO = {
  registers: any;
};

export const ioAddr = {
  // Video
  DISPCNT: 0x000,
  GREENSWP: 0x002,
  DISPSTAT: 0x004,
  VCOUNT: 0x006,
  BG0CNT: 0x008,
  BG1CNT: 0x00a,
  BG2CNT: 0x00c,
  BG3CNT: 0x00e,
  BG0HOFS: 0x010,
  BG0VOFS: 0x012,
  BG1HOFS: 0x014,
  BG1VOFS: 0x016,
  BG2HOFS: 0x018,
  BG2VOFS: 0x01a,
  BG3HOFS: 0x01c,
  BG3VOFS: 0x01e,
  BG2PA: 0x020,
  BG2PB: 0x022,
  BG2PC: 0x024,
  BG2PD: 0x026,
  BG2X_LO: 0x028,
  BG2X_HI: 0x02a,
  BG2Y_LO: 0x02c,
  BG2Y_HI: 0x02e,
  BG3PA: 0x030,
  BG3PB: 0x032,
  BG3PC: 0x034,
  BG3PD: 0x036,
  BG3X_LO: 0x038,
  BG3X_HI: 0x03a,
  BG3Y_LO: 0x03c,
  BG3Y_HI: 0x03e,
  WIN0H: 0x040,
  WIN1H: 0x042,
  WIN0V: 0x044,
  WIN1V: 0x046,
  WININ: 0x048,
  WINOUT: 0x04a,
  MOSAIC: 0x04c,
  BLDCNT: 0x050,
  BLDALPHA: 0x052,
  BLDY: 0x054,

  // Sound
  SOUND1CNT_LO: 0x060,
  SOUND1CNT_HI: 0x062,
  SOUND1CNT_X: 0x064,
  SOUND2CNT_LO: 0x068,
  SOUND2CNT_HI: 0x06c,
  SOUND3CNT_LO: 0x070,
  SOUND3CNT_HI: 0x072,
  SOUND3CNT_X: 0x074,
  SOUND4CNT_LO: 0x078,
  SOUND4CNT_HI: 0x07c,
  SOUNDCNT_LO: 0x080,
  SOUNDCNT_HI: 0x082,
  SOUNDCNT_X: 0x084,
  SOUNDBIAS: 0x088,
  WAVE_RAM0_LO: 0x090,
  WAVE_RAM0_HI: 0x092,
  WAVE_RAM1_LO: 0x094,
  WAVE_RAM1_HI: 0x096,
  WAVE_RAM2_LO: 0x098,
  WAVE_RAM2_HI: 0x09a,
  WAVE_RAM3_LO: 0x09c,
  WAVE_RAM3_HI: 0x09e,
  FIFO_A_LO: 0x0a0,
  FIFO_A_HI: 0x0a2,
  FIFO_B_LO: 0x0a4,
  FIFO_B_HI: 0x0a6,

  // DMA
  DMA0SAD_LO: 0x0b0,
  DMA0SAD_HI: 0x0b2,
  DMA0DAD_LO: 0x0b4,
  DMA0DAD_HI: 0x0b6,
  DMA0CNT_LO: 0x0b8,
  DMA0CNT_HI: 0x0ba,
  DMA1SAD_LO: 0x0bc,
  DMA1SAD_HI: 0x0be,
  DMA1DAD_LO: 0x0c0,
  DMA1DAD_HI: 0x0c2,
  DMA1CNT_LO: 0x0c4,
  DMA1CNT_HI: 0x0c6,
  DMA2SAD_LO: 0x0c8,
  DMA2SAD_HI: 0x0ca,
  DMA2DAD_LO: 0x0cc,
  DMA2DAD_HI: 0x0ce,
  DMA2CNT_LO: 0x0d0,
  DMA2CNT_HI: 0x0d2,
  DMA3SAD_LO: 0x0d4,
  DMA3SAD_HI: 0x0d6,
  DMA3DAD_LO: 0x0d8,
  DMA3DAD_HI: 0x0da,
  DMA3CNT_LO: 0x0dc,
  DMA3CNT_HI: 0x0de,

  // Timers
  TM0CNT_LO: 0x100,
  TM0CNT_HI: 0x102,
  TM1CNT_LO: 0x104,
  TM1CNT_HI: 0x106,
  TM2CNT_LO: 0x108,
  TM2CNT_HI: 0x10a,
  TM3CNT_LO: 0x10c,
  TM3CNT_HI: 0x10e,

  // SIO (note: some of these are repeated)
  SIODATA32_LO: 0x120,
  SIOMULTI0: 0x120,
  SIODATA32_HI: 0x122,
  SIOMULTI1: 0x122,
  SIOMULTI2: 0x124,
  SIOMULTI3: 0x126,
  SIOCNT: 0x128,
  SIOMLT_SEND: 0x12a,
  SIODATA8: 0x12a,
  RCNT: 0x134,
  JOYCNT: 0x140,
  JOY_RECV: 0x150,
  JOY_TRANS: 0x154,
  JOYSTAT: 0x158,

  // Keypad
  KEYINPUT: 0x130,
  KEYCNT: 0x132,

  // Interrupts, etc
  IE: 0x200,
  IF: 0x202,
  WAITCNT: 0x204,
  IME: 0x208,

  POSTFLG: 0x300,
  HALTCNT: 0x301,

  DEFAULT_DISPCNT: 0x0080,
  DEFAULT_SOUNDBIAS: 0x200,
  DEFAULT_BGPA: 1,
  DEFAULT_BGPD: 1,
  DEFAULT_RCNT: 0x8000,
} as const;

export class GameBoyAdvanceIO {
  cpu: ARMCore;
  core: GameBoyAdvance;
  audio?: GameBoyAdvanceAudio;
  video?: GameBoyAdvanceVideo;
  keypad?: GameBoyAdvanceKeypad;
  sio?: GameBoyAdvanceSIO;
  registers: Uint16Array;
  value: any;

  constructor(cpu: ARMCore, core: GameBoyAdvance) {
    this.cpu = cpu;
    this.core = core;

    this.registers = new Uint16Array(size.IO);
  }

  setIOComponent(
    audio: GameBoyAdvanceAudio,
    video: GameBoyAdvanceVideo,
    keypad: GameBoyAdvanceKeypad,
    sio: GameBoyAdvanceSIO,
  ) {
    this.audio = audio;
    this.video = video;
    this.keypad = keypad;
    this.sio = sio;
  }

  clear() {
    this.registers = new Uint16Array(size.IO);

    this.registers[ioAddr.DISPCNT >> 1] = ioAddr.DEFAULT_DISPCNT;
    this.registers[ioAddr.SOUNDBIAS >> 1] = ioAddr.DEFAULT_SOUNDBIAS;
    this.registers[ioAddr.BG2PA >> 1] = ioAddr.DEFAULT_BGPA;
    this.registers[ioAddr.BG2PD >> 1] = ioAddr.DEFAULT_BGPD;
    this.registers[ioAddr.BG3PA >> 1] = ioAddr.DEFAULT_BGPA;
    this.registers[ioAddr.BG3PD >> 1] = ioAddr.DEFAULT_BGPD;
    this.registers[ioAddr.RCNT >> 1] = ioAddr.DEFAULT_RCNT;
  }

  freeze(): FrostIO {
    return {
      registers: Serializer.prefix(this.registers.buffer),
    };
  }

  defrost(frost: FrostIO) {
    this.registers = new Uint16Array(frost.registers);
    // Video registers don't serialize themselves
    for (let i = 0; i <= ioAddr.BLDY; i += 2) {
      this.store16(i, this.registers[i >> 1]);
    }
  }

  load8(offset: number): number {
    throw 'Unimplmeneted unaligned I/O access';
  }

  load16(offset: number): number {
    return (this.loadU16(offset) << 16) >> 16;
  }

  load32(offset: number): number {
    offset &= 0xfffffffc;
    switch (offset) {
      case ioAddr.DMA0CNT_LO:
      case ioAddr.DMA1CNT_LO:
      case ioAddr.DMA2CNT_LO:
      case ioAddr.DMA3CNT_LO:
        return this.loadU16(offset | 2) << 16;
      case ioAddr.IME:
        return this.loadU16(offset) & 0xffff;
      case ioAddr.JOY_RECV:
      case ioAddr.JOY_TRANS:
        this.core.STUB('Unimplemented JOY register read: 0x' + offset.toString(16));

        return 0;
    }

    return this.loadU16(offset) | (this.loadU16(offset | 2) << 16);
  }

  loadU8(offset: number): number {
    const odd = offset & 0x0001;
    const value = this.loadU16(offset & 0xfffe);

    return (value >>> (odd << 3)) & 0xff;
  }

  loadU16(offset: number): number {
    switch (offset) {
      case ioAddr.DISPCNT:
      case ioAddr.BG0CNT:
      case ioAddr.BG1CNT:
      case ioAddr.BG2CNT:
      case ioAddr.BG3CNT:
      case ioAddr.WININ:
      case ioAddr.WINOUT:
      case ioAddr.SOUND1CNT_LO:
      case ioAddr.SOUND3CNT_LO:
      case ioAddr.SOUNDCNT_LO:
      case ioAddr.SOUNDBIAS:
      case ioAddr.BLDCNT:
      case ioAddr.BLDALPHA:

      case ioAddr.TM0CNT_HI:
      case ioAddr.TM1CNT_HI:
      case ioAddr.TM2CNT_HI:
      case ioAddr.TM3CNT_HI:
      case ioAddr.DMA0CNT_HI:
      case ioAddr.DMA1CNT_HI:
      case ioAddr.DMA2CNT_HI:
      case ioAddr.DMA3CNT_HI:
      case ioAddr.RCNT:
      case ioAddr.WAITCNT:
      case ioAddr.IE:
      case ioAddr.IF:
      case ioAddr.IME:
      case ioAddr.POSTFLG:
        // Handled transparently by the written registers
        break;

      // Video
      case ioAddr.DISPSTAT:
        return this.registers[offset >> 1] | (this.video?.readDisplayStat() || 0);
      case ioAddr.VCOUNT:
        return this.video?.vcount || 0;

      // Sound
      case ioAddr.SOUND1CNT_HI:
      case ioAddr.SOUND2CNT_LO:
        return this.registers[offset >> 1] & 0xffc0;
      case ioAddr.SOUND1CNT_X:
      case ioAddr.SOUND2CNT_HI:
      case ioAddr.SOUND3CNT_X:
        return this.registers[offset >> 1] & 0x4000;
      case ioAddr.SOUND3CNT_HI:
        return this.registers[offset >> 1] & 0xe000;
      case ioAddr.SOUND4CNT_LO:
        return this.registers[offset >> 1] & 0xff00;
      case ioAddr.SOUND4CNT_HI:
        return this.registers[offset >> 1] & 0x40ff;
      case ioAddr.SOUNDCNT_HI:
        return this.registers[offset >> 1] & 0x770f;
      case ioAddr.SOUNDCNT_X: {
        this.core.STUB('Unimplemented sound register read: SOUNDCNT_X');

        return this.registers[offset >> 1] | 0x0000;
      }

      // WAVE RAM
      case ioAddr.WAVE_RAM0_LO:
      case ioAddr.WAVE_RAM0_HI:
      case ioAddr.WAVE_RAM1_LO:
      case ioAddr.WAVE_RAM1_HI:
      case ioAddr.WAVE_RAM2_LO:
      case ioAddr.WAVE_RAM2_HI:
      case ioAddr.WAVE_RAM3_LO:
      case ioAddr.WAVE_RAM3_HI:
        return this.audio?.readWaveData(offset - ioAddr.WAVE_RAM0_LO, 2) || 0;

      // Timers
      case ioAddr.TM0CNT_LO:
        return this.cpu.irq?.timerRead(0) || 0;
      case ioAddr.TM1CNT_LO:
        return this.cpu.irq?.timerRead(1) || 0;
      case ioAddr.TM2CNT_LO:
        return this.cpu.irq?.timerRead(2) || 0;
      case ioAddr.TM3CNT_LO:
        return this.cpu.irq?.timerRead(3) || 0;

      // SIO
      case ioAddr.SIOCNT:
        return this.sio?.readSIOCNT() || 0;

      case ioAddr.KEYINPUT:
        this.keypad?.pollGamepads();

        return this.keypad?.currentDown || 0;
      case ioAddr.KEYCNT:
        this.core.STUB('Unimplemented I/O register read: KEYCNT');

        return 0;

      case ioAddr.BG0HOFS:
      case ioAddr.BG0VOFS:
      case ioAddr.BG1HOFS:
      case ioAddr.BG1VOFS:
      case ioAddr.BG2HOFS:
      case ioAddr.BG2VOFS:
      case ioAddr.BG3HOFS:
      case ioAddr.BG3VOFS:
      case ioAddr.BG2PA:
      case ioAddr.BG2PB:
      case ioAddr.BG2PC:
      case ioAddr.BG2PD:
      case ioAddr.BG3PA:
      case ioAddr.BG3PB:
      case ioAddr.BG3PC:
      case ioAddr.BG3PD:
      case ioAddr.BG2X_LO:
      case ioAddr.BG2X_HI:
      case ioAddr.BG2Y_LO:
      case ioAddr.BG2Y_HI:
      case ioAddr.BG3X_LO:
      case ioAddr.BG3X_HI:
      case ioAddr.BG3Y_LO:
      case ioAddr.BG3Y_HI:
      case ioAddr.WIN0H:
      case ioAddr.WIN1H:
      case ioAddr.WIN0V:
      case ioAddr.WIN1V:
      case ioAddr.BLDY:
      case ioAddr.DMA0SAD_LO:
      case ioAddr.DMA0SAD_HI:
      case ioAddr.DMA0DAD_LO:
      case ioAddr.DMA0DAD_HI:
      case ioAddr.DMA0CNT_LO:
      case ioAddr.DMA1SAD_LO:
      case ioAddr.DMA1SAD_HI:
      case ioAddr.DMA1DAD_LO:
      case ioAddr.DMA1DAD_HI:
      case ioAddr.DMA1CNT_LO:
      case ioAddr.DMA2SAD_LO:
      case ioAddr.DMA2SAD_HI:
      case ioAddr.DMA2DAD_LO:
      case ioAddr.DMA2DAD_HI:
      case ioAddr.DMA2CNT_LO:
      case ioAddr.DMA3SAD_LO:
      case ioAddr.DMA3SAD_HI:
      case ioAddr.DMA3DAD_LO:
      case ioAddr.DMA3DAD_HI:
      case ioAddr.DMA3CNT_LO:
      case ioAddr.FIFO_A_LO:
      case ioAddr.FIFO_A_HI:
      case ioAddr.FIFO_B_LO:
      case ioAddr.FIFO_B_HI: {
        this.core.WARN('Read for write-only register: 0x' + offset.toString(16));

        return this.core.mmu.badMemory.loadU16(0);
      }

      case ioAddr.MOSAIC:
        this.core.WARN('Read for write-only register: 0x' + offset.toString(16));

        return 0;

      case ioAddr.SIOMULTI0:
      case ioAddr.SIOMULTI1:
      case ioAddr.SIOMULTI2:
      case ioAddr.SIOMULTI3:
        return this.sio?.read((offset - ioAddr.SIOMULTI0) >> 1);

      case ioAddr.SIODATA8:
        this.core.STUB('Unimplemented SIO register read: 0x' + offset.toString(16));

        return 0;
      case ioAddr.JOYCNT:
      case ioAddr.JOYSTAT:
        this.core.STUB('Unimplemented JOY register read: 0x' + offset.toString(16));

        return 0;

      default:
        this.core.WARN('Bad I/O register read: 0x' + offset.toString(16));

        return this.core.mmu.badMemory.loadU16(0);
    }

    return this.registers[offset >> 1];
  }

  store8(offset: number, value: number) {
    value &= 0xff;
    switch (offset) {
      case ioAddr.WININ:
        value &= 0x3f;
        break;
      case ioAddr.WININ | 1:
        value &= 0x3f;
        break;
      case ioAddr.WINOUT:
        value &= 0x3f;
        break;
      case ioAddr.WINOUT | 1:
        value &= 0x3f;
        break;
      case ioAddr.SOUND1CNT_LO:
      case ioAddr.SOUND1CNT_LO | 1:
      case ioAddr.SOUND1CNT_HI:
      case ioAddr.SOUND1CNT_HI | 1:
      case ioAddr.SOUND1CNT_X:
      case ioAddr.SOUND1CNT_X | 1:
      case ioAddr.SOUND2CNT_LO:
      case ioAddr.SOUND2CNT_LO | 1:
      case ioAddr.SOUND2CNT_HI:
      case ioAddr.SOUND2CNT_HI | 1:
      case ioAddr.SOUND3CNT_LO:
      case ioAddr.SOUND3CNT_LO | 1:
      case ioAddr.SOUND3CNT_HI:
      case ioAddr.SOUND3CNT_HI | 1:
      case ioAddr.SOUND3CNT_X:
      case ioAddr.SOUND3CNT_X | 1:
      case ioAddr.SOUND4CNT_LO:
      case ioAddr.SOUND4CNT_LO | 1:
      case ioAddr.SOUND4CNT_HI:
      case ioAddr.SOUND4CNT_HI | 1:
      case ioAddr.SOUNDCNT_LO:
      case ioAddr.SOUNDCNT_LO | 1:
      case ioAddr.SOUNDCNT_X:
      case ioAddr.IF:
      case ioAddr.IME:
        break;
      case ioAddr.SOUNDBIAS | 1:
        this.STUB_REG('sound', offset);
        break;
      case ioAddr.HALTCNT:
        value &= 0x80;
        if (!value) {
          this.core.irq.halt();
        } else {
          this.core.STUB('Stop');
        }

        return;
      default:
        this.STUB_REG('8-bit I/O', offset);
        break;
    }

    if (offset & 1) {
      value <<= 8;
      value |= this.registers[offset >> 1] & 0x00ff;
    } else {
      value &= 0x00ff;
      value |= this.registers[offset >> 1] & 0xff00;
    }
    this.store16(offset & 0xffffffe, value);
  }

  store16(offset: number, value: number) {
    switch (offset) {
      // Video
      case ioAddr.DISPCNT: {
        this.video?.renderPath.writeDisplayControl(value);
        break;
      }
      case ioAddr.DISPSTAT: {
        value &= this.video?.DISPSTAT_MASK || 0;
        this.video?.writeDisplayStat(value);
        break;
      }
      case ioAddr.BG0CNT: {
        value &= 0xdfff;
        this.video?.renderPath.writeBackgroundControl(0, value);
        break;
      }
      case ioAddr.BG1CNT: {
        value &= 0xdfff;
        this.video?.renderPath.writeBackgroundControl(1, value);
        break;
      }
      case ioAddr.BG2CNT: {
        this.video?.renderPath.writeBackgroundControl(2, value);
        break;
      }
      case ioAddr.BG3CNT: {
        this.video?.renderPath.writeBackgroundControl(3, value);
        break;
      }
      case ioAddr.BG0HOFS:
        this.video?.renderPath.writeBackgroundHOffset(0, value);
        break;
      case ioAddr.BG0VOFS:
        this.video?.renderPath.writeBackgroundVOffset(0, value);
        break;
      case ioAddr.BG1HOFS:
        this.video?.renderPath.writeBackgroundHOffset(1, value);
        break;
      case ioAddr.BG1VOFS:
        this.video?.renderPath.writeBackgroundVOffset(1, value);
        break;
      case ioAddr.BG2HOFS:
        this.video?.renderPath.writeBackgroundHOffset(2, value);
        break;
      case ioAddr.BG2VOFS:
        this.video?.renderPath.writeBackgroundVOffset(2, value);
        break;
      case ioAddr.BG3HOFS:
        this.video?.renderPath.writeBackgroundHOffset(3, value);
        break;
      case ioAddr.BG3VOFS:
        this.video?.renderPath.writeBackgroundVOffset(3, value);
        break;
      case ioAddr.BG2X_LO:
        this.video?.renderPath.writeBackgroundRefX(
          2,
          (this.registers[(offset >> 1) | 1] << 16) | value,
        );
        break;
      case ioAddr.BG2X_HI:
        this.video?.renderPath.writeBackgroundRefX(
          2,
          this.registers[(offset >> 1) ^ 1] | (value << 16),
        );
        break;
      case ioAddr.BG2Y_LO:
        this.video?.renderPath.writeBackgroundRefY(
          2,
          (this.registers[(offset >> 1) | 1] << 16) | value,
        );
        break;
      case ioAddr.BG2Y_HI:
        this.video?.renderPath.writeBackgroundRefY(
          2,
          this.registers[(offset >> 1) ^ 1] | (value << 16),
        );
        break;
      case ioAddr.BG2PA:
        this.video?.renderPath.writeBackgroundParamA(2, value);
        break;
      case ioAddr.BG2PB:
        this.video?.renderPath.writeBackgroundParamB(2, value);
        break;
      case ioAddr.BG2PC:
        this.video?.renderPath.writeBackgroundParamC(2, value);
        break;
      case ioAddr.BG2PD:
        this.video?.renderPath.writeBackgroundParamD(2, value);
        break;
      case ioAddr.BG3X_LO:
        this.video?.renderPath.writeBackgroundRefX(
          3,
          (this.registers[(offset >> 1) | 1] << 16) | value,
        );
        break;
      case ioAddr.BG3X_HI:
        this.video?.renderPath.writeBackgroundRefX(
          3,
          this.registers[(offset >> 1) ^ 1] | (value << 16),
        );
        break;
      case ioAddr.BG3Y_LO:
        this.video?.renderPath.writeBackgroundRefY(
          3,
          (this.registers[(offset >> 1) | 1] << 16) | value,
        );
        break;
      case ioAddr.BG3Y_HI:
        this.video?.renderPath.writeBackgroundRefY(
          3,
          this.registers[(offset >> 1) ^ 1] | (value << 16),
        );
        break;
      case ioAddr.BG3PA:
        this.video?.renderPath.writeBackgroundParamA(3, value);
        break;
      case ioAddr.BG3PB:
        this.video?.renderPath.writeBackgroundParamB(3, value);
        break;
      case ioAddr.BG3PC:
        this.video?.renderPath.writeBackgroundParamC(3, value);
        break;
      case ioAddr.BG3PD:
        this.video?.renderPath.writeBackgroundParamD(3, value);
        break;
      case ioAddr.WIN0H:
        this.video?.renderPath.writeWin0H(value);
        break;
      case ioAddr.WIN1H:
        this.video?.renderPath.writeWin1H(value);
        break;
      case ioAddr.WIN0V:
        this.video?.renderPath.writeWin0V(value);
        break;
      case ioAddr.WIN1V:
        this.video?.renderPath.writeWin1V(value);
        break;
      case ioAddr.WININ:
        value &= 0x3f3f;
        this.video?.renderPath.writeWinIn(value);
        break;
      case ioAddr.WINOUT:
        value &= 0x3f3f;
        this.video?.renderPath.writeWinOut(value);
        break;
      case ioAddr.BLDCNT:
        value &= 0x7fff;
        this.video?.renderPath.writeBlendControl(value);
        break;
      case ioAddr.BLDALPHA:
        value &= 0x1f1f;
        this.video?.renderPath.writeBlendAlpha(value);
        break;
      case ioAddr.BLDY:
        value &= 0x001f;
        this.video?.renderPath.writeBlendY(value);
        break;
      case ioAddr.MOSAIC:
        this.video?.renderPath.writeMosaic(value);
        break;

      // Sound
      case ioAddr.SOUND1CNT_LO:
        value &= 0x007f;
        this.audio?.writeSquareChannelSweep(0, value);
        break;
      case ioAddr.SOUND1CNT_HI:
        this.audio?.writeSquareChannelDLE(0, value);
        break;
      case ioAddr.SOUND1CNT_X:
        value &= 0xc7ff;
        this.audio?.writeSquareChannelFC(0, value);
        value &= ~0x8000;
        break;
      case ioAddr.SOUND2CNT_LO:
        this.audio?.writeSquareChannelDLE(1, value);
        break;
      case ioAddr.SOUND2CNT_HI:
        value &= 0xc7ff;
        this.audio?.writeSquareChannelFC(1, value);
        value &= ~0x8000;
        break;
      case ioAddr.SOUND3CNT_LO:
        value &= 0x00e0;
        this.audio?.writeChannel3Lo(value);
        break;
      case ioAddr.SOUND3CNT_HI:
        value &= 0xe0ff;
        this.audio?.writeChannel3Hi(value);
        break;
      case ioAddr.SOUND3CNT_X:
        value &= 0xc7ff;
        this.audio?.writeChannel3X(value);
        value &= ~0x8000;
        break;
      case ioAddr.SOUND4CNT_LO:
        value &= 0xff3f;
        this.audio?.writeChannel4LE(value);
        break;
      case ioAddr.SOUND4CNT_HI:
        value &= 0xc0ff;
        this.audio?.writeChannel4FC(value);
        value &= ~0x8000;
        break;
      case ioAddr.SOUNDCNT_LO:
        value &= 0xff77;
        this.audio?.writeSoundControlLo(value);
        break;
      case ioAddr.SOUNDCNT_HI:
        value &= 0xff0f;
        this.audio?.writeSoundControlHi(value);
        break;
      case ioAddr.SOUNDCNT_X:
        value &= 0x0080;
        this.audio?.writeEnable(value);
        break;
      case ioAddr.WAVE_RAM0_LO:
      case ioAddr.WAVE_RAM0_HI:
      case ioAddr.WAVE_RAM1_LO:
      case ioAddr.WAVE_RAM1_HI:
      case ioAddr.WAVE_RAM2_LO:
      case ioAddr.WAVE_RAM2_HI:
      case ioAddr.WAVE_RAM3_LO:
      case ioAddr.WAVE_RAM3_HI:
        this.audio?.writeWaveData(offset - ioAddr.WAVE_RAM0_LO, value, 2);
        break;

      // DMA
      case ioAddr.DMA0SAD_LO:
      case ioAddr.DMA0DAD_LO:
      case ioAddr.DMA1SAD_LO:
      case ioAddr.DMA1DAD_LO:
      case ioAddr.DMA2SAD_LO:
      case ioAddr.DMA2DAD_LO:
      case ioAddr.DMA3SAD_LO:
      case ioAddr.DMA3DAD_LO:
        this.store32(offset, (this.registers[(offset >> 1) + 1] << 16) | value);

        return;

      case ioAddr.DMA0SAD_HI:
      case ioAddr.DMA0DAD_HI:
      case ioAddr.DMA1SAD_HI:
      case ioAddr.DMA1DAD_HI:
      case ioAddr.DMA2SAD_HI:
      case ioAddr.DMA2DAD_HI:
      case ioAddr.DMA3SAD_HI:
      case ioAddr.DMA3DAD_HI:
        this.store32(offset - 2, this.registers[(offset >> 1) - 1] | (value << 16));

        return;

      case ioAddr.DMA0CNT_LO:
        this.cpu.irq?.dmaSetWordCount(0, value);
        break;
      case ioAddr.DMA0CNT_HI:
        // The DMA registers need to set the values before writing the control, as writing the
        // control can synchronously trigger a DMA transfer
        this.registers[offset >> 1] = value & 0xffe0;
        this.cpu.irq?.dmaWriteControl(0, value);

        return;
      case ioAddr.DMA1CNT_LO:
        this.cpu.irq?.dmaSetWordCount(1, value);
        break;
      case ioAddr.DMA1CNT_HI:
        this.registers[offset >> 1] = value & 0xffe0;
        this.cpu.irq?.dmaWriteControl(1, value);

        return;
      case ioAddr.DMA2CNT_LO:
        this.cpu.irq?.dmaSetWordCount(2, value);
        break;
      case ioAddr.DMA2CNT_HI:
        this.registers[offset >> 1] = value & 0xffe0;
        this.cpu.irq?.dmaWriteControl(2, value);

        return;
      case ioAddr.DMA3CNT_LO:
        this.cpu.irq?.dmaSetWordCount(3, value);
        break;
      case ioAddr.DMA3CNT_HI:
        this.registers[offset >> 1] = value & 0xffe0;
        this.cpu.irq?.dmaWriteControl(3, value);

        return;

      // Timers
      case ioAddr.TM0CNT_LO:
        this.cpu.irq?.timerSetReload(0, value);

        return;
      case ioAddr.TM1CNT_LO:
        this.cpu.irq?.timerSetReload(1, value);

        return;
      case ioAddr.TM2CNT_LO:
        this.cpu.irq?.timerSetReload(2, value);

        return;
      case ioAddr.TM3CNT_LO:
        this.cpu.irq?.timerSetReload(3, value);

        return;

      case ioAddr.TM0CNT_HI:
        value &= 0x00c7;
        this.cpu.irq?.timerWriteControl(0, value);
        break;
      case ioAddr.TM1CNT_HI:
        value &= 0x00c7;
        this.cpu.irq?.timerWriteControl(1, value);
        break;
      case ioAddr.TM2CNT_HI:
        value &= 0x00c7;
        this.cpu.irq?.timerWriteControl(2, value);
        break;
      case ioAddr.TM3CNT_HI:
        value &= 0x00c7;
        this.cpu.irq?.timerWriteControl(3, value);
        break;

      // SIO
      case ioAddr.SIOMULTI0:
      case ioAddr.SIOMULTI1:
      case ioAddr.SIOMULTI2:
      case ioAddr.SIOMULTI3:
      case ioAddr.SIODATA8:
        this.STUB_REG('SIO', offset);
        break;
      case ioAddr.RCNT:
        this.sio?.setMode(
          ((value >> 12) & 0xc) | ((this.registers[ioAddr.SIOCNT >> 1] >> 12) & 0x3),
        );
        this.sio?.writeRCNT(value);
        break;
      case ioAddr.SIOCNT:
        this.sio?.setMode(((value >> 12) & 0x3) | ((this.registers[ioAddr.RCNT >> 1] >> 12) & 0xc));
        this.sio?.writeSIOCNT(value);

        return;
      case ioAddr.JOYCNT:
      case ioAddr.JOYSTAT:
        this.STUB_REG('JOY', offset);
        break;

      // Misc
      case ioAddr.IE:
        value &= 0x3fff;
        this.cpu.irq?.setInterruptsEnabled(value);
        break;
      case ioAddr.IF:
        this.cpu.irq?.dismissIRQs(value);

        return;
      case ioAddr.WAITCNT:
        value &= 0xdfff;
        this.cpu.mmu.adjustTimings(value);
        break;
      case ioAddr.IME:
        value &= 0x0001;
        this.cpu.irq?.masterEnable(!!value);
        break;
      default:
        this.STUB_REG('I/O', offset);
    }
    this.registers[offset >> 1] = value;
  }

  store32(offset: number, value: number) {
    switch (offset) {
      case ioAddr.BG2X_LO:
        value &= 0x0fffffff;
        this.video?.renderPath.writeBackgroundRefX(2, value);
        break;
      case ioAddr.BG2Y_LO:
        value &= 0x0fffffff;
        this.video?.renderPath.writeBackgroundRefY(2, value);
        break;
      case ioAddr.BG3X_LO:
        value &= 0x0fffffff;
        this.video?.renderPath.writeBackgroundRefX(3, value);
        break;
      case ioAddr.BG3Y_LO:
        value &= 0x0fffffff;
        this.video?.renderPath.writeBackgroundRefY(3, value);
        break;
      case ioAddr.DMA0SAD_LO:
        this.cpu.irq?.dmaSetSourceAddress(0, value);
        break;
      case ioAddr.DMA0DAD_LO:
        this.cpu.irq?.dmaSetDestAddress(0, value);
        break;
      case ioAddr.DMA1SAD_LO:
        this.cpu.irq?.dmaSetSourceAddress(1, value);
        break;
      case ioAddr.DMA1DAD_LO:
        this.cpu.irq?.dmaSetDestAddress(1, value);
        break;
      case ioAddr.DMA2SAD_LO:
        this.cpu.irq?.dmaSetSourceAddress(2, value);
        break;
      case ioAddr.DMA2DAD_LO:
        this.cpu.irq?.dmaSetDestAddress(2, value);
        break;
      case ioAddr.DMA3SAD_LO:
        this.cpu.irq?.dmaSetSourceAddress(3, value);
        break;
      case ioAddr.DMA3DAD_LO:
        this.cpu.irq?.dmaSetDestAddress(3, value);
        break;
      case ioAddr.FIFO_A_LO:
        this.audio?.appendToFifoA(value);

        return;
      case ioAddr.FIFO_B_LO:
        this.audio?.appendToFifoB(value);

        return;

      // High bits of this write should be ignored
      case ioAddr.IME:
        this.store16(offset, value & 0xffff);

        return;
      case ioAddr.JOY_RECV:
      case ioAddr.JOY_TRANS:
        this.STUB_REG('JOY', offset);

        return;
      default:
        this.store16(offset, value & 0xffff);
        this.store16(offset | 2, value >>> 16);

        return;
    }

    this.registers[offset >> 1] = value & 0xffff;
    this.registers[(offset >> 1) + 1] = value >>> 16;
  }

  invalidatePage(address: number) {}

  STUB_REG(type: string, offset: number) {
    this.core.STUB('Unimplemented ' + type + ' register write: ' + offset.toString(16));
  }
}
