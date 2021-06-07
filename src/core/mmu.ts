import { ARMCore, execMode, PC } from './core';
import { GameBoyAdvance } from './gba';
import { GameBoyAdvanceGPIO } from './gpio';
import { GameBoyAdvanceIO, ioAddr } from './io';
import { DMA } from './irq';
import { EEPROMSavedata, FlashSavedata, SRAMSavedata } from './savedata';
import { Serializer } from './util';
import { MemoryProxy } from './video/proxy';

export class MemoryView {
  buffer: ArrayBufferLike;
  view: DataView;
  mask: number;
  mask8: number;
  mask16: number;
  mask32: number;
  icache: any[];

  constructor(memory: ArrayBufferLike, offset = 0) {
    // this.inherit();
    this.buffer = memory;
    this.view = new DataView(this.buffer, typeof offset === 'number' ? offset : 0);
    this.mask = memory.byteLength - 1;
    this.mask8 = 0;
    this.mask16 = 0;
    this.mask32 = 0;
    this.icache = [];
    this.resetMask();
  }

  resetMask() {
    this.mask8 = this.mask & 0xffffffff;
    this.mask16 = this.mask & 0xfffffffe;
    this.mask32 = this.mask & 0xfffffffc;
  }

  load8(offset: number) {
    if ((offset & this.mask8) >= this.view.byteLength) return 0;

    return this.view.getInt8(offset & this.mask8);
  }

  load16(offset: number) {
    if ((offset & this.mask) >= this.view.byteLength) return 0;

    // Unaligned 16-bit loads are unpredictable...let's just pretend they work
    return this.view.getInt16(offset & this.mask, true);
  }

  loadU8(offset: number) {
    if ((offset & this.mask8) >= this.view.byteLength) return 0;

    return this.view.getUint8(offset & this.mask8);
  }

  loadU16(offset: number) {
    // Unaligned 16-bit loads are unpredictable...let's just pretend they work
    if ((offset & this.mask) >= this.view.byteLength) return 0;

    return this.view.getUint16(offset & this.mask, true);
  }

  load32(offset: number) {
    // Unaligned 32-bit loads are "rotated" so they make some semblance of sense
    const rotate = (offset & 3) << 3;
    if ((offset & this.mask32) >= this.view.byteLength) return 0;
    const mem = this.view.getInt32(offset & this.mask32, true);

    return (mem >>> rotate) | (mem << (32 - rotate));
  }

  store8(offset: number, value: number) {
    this.view.setInt8(offset & this.mask8, value);
  }

  store16(offset: number, value: number) {
    this.view.setInt16(offset & this.mask16, value, true);
  }

  store32(offset: number, value: number) {
    this.view.setInt32(offset & this.mask32, value, true);
  }

  invalidatePage(address: number) {}

  replaceData(memory: ArrayBufferLike, offset: number) {
    this.buffer = memory;
    this.view = new DataView(this.buffer, typeof offset === 'number' ? offset : 0);
    if (this.icache) this.icache = new Array(this.icache.length);
  }
}

export class MemoryBlock extends MemoryView {
  ICACHE_PAGE_BITS: number;
  PAGE_MASK: number;

  constructor(size: number, cacheBits: number) {
    super(new ArrayBuffer(size));
    this.ICACHE_PAGE_BITS = cacheBits;
    this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
    this.icache = new Array(size >> (this.ICACHE_PAGE_BITS + 1));
  }

  invalidatePage(address: number) {
    const page = this.icache[(address & this.mask) >> this.ICACHE_PAGE_BITS];
    if (page) page.invalid = true;
  }
}

export class ROMView extends MemoryView {
  ICACHE_PAGE_BITS: number;
  PAGE_MASK: number;
  gpio?: GameBoyAdvanceGPIO;
  mmu?: GameBoyAdvanceMMU;

  constructor(rom: any, offset: number) {
    super(rom, offset);
    this.ICACHE_PAGE_BITS = 10;
    this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
    this.icache = new Array(rom.byteLength >> (this.ICACHE_PAGE_BITS + 1));
    this.mask = 0x01ffffff;
    this.resetMask();
  }

  store8(offset: number, value: number) {}

  store16(offset: number, value: number) {
    if (offset < 0xca && offset >= 0xc4) {
      if (!this.gpio) this.gpio = this.mmu?.allocGPIO(this);
      this.gpio?.store16(offset, value);
    }
  }

  store32(offset: number, value: number) {
    if (offset < 0xca && offset >= 0xc4) {
      if (!this.gpio) this.gpio = this.mmu?.allocGPIO(this);
      this.gpio?.store32(offset, value);
    }
  }
}

export class BIOSView extends MemoryView {
  ICACHE_PAGE_BITS: number;
  PAGE_MASK: number;
  real: boolean;

  constructor(rom: ArrayBufferLike, offset: number) {
    super(rom, offset);

    this.ICACHE_PAGE_BITS = 16;
    this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
    this.icache = new Array(1);
    this.real = false;
  }

  load8(offset: number) {
    if (offset >= this.buffer.byteLength) return -1;

    return this.view.getInt8(offset);
  }

  load16(offset: number) {
    if (offset >= this.buffer.byteLength) return -1;

    return this.view.getInt16(offset, true);
  }

  loadU8(offset: number) {
    if (offset >= this.buffer.byteLength) return -1;

    return this.view.getUint8(offset);
  }

  loadU16(offset: number) {
    if (offset >= this.buffer.byteLength) return -1;

    return this.view.getUint16(offset, true);
  }

  load32(offset: number) {
    if (offset >= this.buffer.byteLength) return -1;

    return this.view.getInt32(offset, true);
  }

  store8(offset: number, value: number) {}
  store16(offset: number, value: number) {}
  store32(offset: number, value: number) {}
}

class BadMemory {
  cpu: ARMCore;
  mmu: GameBoyAdvanceMMU;

  constructor(cpu: ARMCore, mmu: GameBoyAdvanceMMU) {
    this.cpu = cpu;
    this.mmu = mmu;
  }

  load8(offset: number) {
    return this.mmu.load8(this.cpu.gprs[PC] - this.cpu.instructionWidth + (offset & 0x3));
  }

  load16(offset: number) {
    return this.mmu.load16(this.cpu.gprs[PC] - this.cpu.instructionWidth + (offset & 0x2));
  }

  loadU8(offset: number) {
    return this.mmu.loadU8(this.cpu.gprs[PC] - this.cpu.instructionWidth + (offset & 0x3));
  }

  loadU16(offset: number) {
    return this.mmu.loadU16(this.cpu.gprs[PC] - this.cpu.instructionWidth + (offset & 0x2));
  }

  load32(offset: number) {
    if (this.cpu.execMode == execMode.ARM) {
      return this.mmu.load32(this.cpu.gprs[PC] - this.cpu.instructionWidth);
    }

    const halfword = this.mmu.loadU16(this.cpu.gprs[PC] - this.cpu.instructionWidth);

    return halfword | (halfword << 16);
  }

  store8(offset: number, value: number) {}
  store16(offset: number, value: number) {}
  store32(offset: number, value: number) {}
  invalidatePage(address: number) {}
}

export type Cart = {
  title: string;
  code: string;
  maker: string;
  memory: ArrayBufferLike;
  saveType: string;
};

export const defaultCart = {
  title: '',
  code: '',
  maker: '',
  memory: new ArrayBuffer(1),
  saveType: '',
};

export type FrostMMU = {
  ram: ArrayBuffer;
  iram: ArrayBuffer;
};

export type Page = {
  thumb: any[];
  arm: any[];
  invalid: boolean;
};

export const region = {
  BIOS: 0x0,
  WORKING_RAM: 0x2,
  WORKING_IRAM: 0x3,
  IO: 0x4,
  PALETTE_RAM: 0x5,
  VRAM: 0x6,
  OAM: 0x7,
  CART0: 0x8,
  CART1: 0xa,
  CART2: 0xc,
  CART_SRAM: 0xe,
} as const;

export const size = {
  BIOS: 0x00004000,
  WORKING_RAM: 0x00040000,
  WORKING_IRAM: 0x00008000,
  IO: 0x00000400,
  PALETTE_RAM: 0x00000400,
  VRAM: 0x00018000,
  OAM: 0x00000400,
  CART0: 0x02000000,
  CART1: 0x02000000,
  CART2: 0x02000000,
  CART_SRAM: 0x00008000,
  CART_FLASH512: 0x00010000,
  CART_FLASH1M: 0x00020000,
  CART_EEPROM: 0x00002000,
} as const;

export class GameBoyAdvanceMMU {
  BASE_BIOS: number;
  BASE_WORKING_RAM: number;
  BASE_WORKING_IRAM: number;
  BASE_IO: number;
  BASE_PALETTE_RAM: number;
  BASE_VRAM: number;
  BASE_OAM: number;
  BASE_CART0: number;
  BASE_CART1: number;
  BASE_CART2: number;
  BASE_CART_SRAM: number;

  BASE_MASK: number;
  BASE_OFFSET: number;
  OFFSET_MASK: number;

  DMA_TIMING_NOW: number;
  DMA_TIMING_VBLANK: number;
  DMA_TIMING_HBLANK: number;
  DMA_TIMING_CUSTOM: number;

  DMA_INCREMENT: number;
  DMA_DECREMENT: number;
  DMA_FIXED: number;
  DMA_INCREMENT_RELOAD: number;
  DMA_OFFSET: number[];

  WAITSTATES: number[];
  WAITSTATES_32: number[];
  WAITSTATES_SEQ: number[];
  WAITSTATES_SEQ_32: number[];
  NULLWAIT: number[];
  ROM_WS: number[];
  ROM_WS_SEQ: [number, number][];

  ICACHE_PAGE_BITS: number;
  PAGE_MASK: number;

  bios?: BIOSView;
  cpu: ARMCore;
  core: GameBoyAdvance;
  memory: any;
  badMemory: any;

  DMA_REGISTER: any;
  waitstates: any;
  waitstatesSeq: any;
  waitstates32: any;
  waitstatesSeq32: any;
  waitstatesPrefetch: any;
  waitstatesPrefetch32: any;

  cart: Cart;
  save: any;

  constructor(cpu: ARMCore, core: GameBoyAdvance) {
    this.cpu = cpu;
    this.core = core;

    this.BASE_BIOS = 0x00000000;
    this.BASE_WORKING_RAM = 0x02000000;
    this.BASE_WORKING_IRAM = 0x03000000;
    this.BASE_IO = 0x04000000;
    this.BASE_PALETTE_RAM = 0x05000000;
    this.BASE_VRAM = 0x06000000;
    this.BASE_OAM = 0x07000000;
    this.BASE_CART0 = 0x08000000;
    this.BASE_CART1 = 0x0a000000;
    this.BASE_CART2 = 0x0c000000;
    this.BASE_CART_SRAM = 0x0e000000;

    this.BASE_MASK = 0x0f000000;
    this.BASE_OFFSET = 24;
    this.OFFSET_MASK = 0x00ffffff;

    this.DMA_TIMING_NOW = 0;
    this.DMA_TIMING_VBLANK = 1;
    this.DMA_TIMING_HBLANK = 2;
    this.DMA_TIMING_CUSTOM = 3;

    this.DMA_INCREMENT = 0;
    this.DMA_DECREMENT = 1;
    this.DMA_FIXED = 2;
    this.DMA_INCREMENT_RELOAD = 3;

    this.DMA_OFFSET = [1, -1, 0, 1];

    this.WAITSTATES = [0, 0, 2, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4];
    this.WAITSTATES_32 = [0, 0, 5, 0, 0, 1, 0, 1, 7, 7, 9, 9, 13, 13, 8];
    this.WAITSTATES_SEQ = [0, 0, 2, 0, 0, 0, 0, 0, 2, 2, 4, 4, 8, 8, 4];
    this.WAITSTATES_SEQ_32 = [0, 0, 5, 0, 0, 1, 0, 1, 5, 5, 9, 9, 17, 17, 8];
    this.NULLWAIT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 15; i < 256; ++i) {
      this.WAITSTATES[i] = 0;
      this.WAITSTATES_32[i] = 0;
      this.WAITSTATES_SEQ[i] = 0;
      this.WAITSTATES_SEQ_32[i] = 0;
      this.NULLWAIT[i] = 0;
    }

    this.ROM_WS = [4, 3, 2, 8];
    this.ROM_WS_SEQ = [
      [2, 1],
      [4, 1],
      [8, 1],
    ];

    this.ICACHE_PAGE_BITS = 8;
    this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
    this.cart = defaultCart;
  }

  mmap(region: number, object: GameBoyAdvanceIO | MemoryProxy) {
    this.memory[region] = object;
  }

  clear() {
    this.badMemory = new BadMemory(this.cpu, this);
    this.memory = [
      this.bios,
      this.badMemory,
      new MemoryBlock(size.WORKING_RAM, 9),
      new MemoryBlock(size.WORKING_IRAM, 7),
      null, // This is owned by GameBoyAdvanceIO
      null, // This is owned by GameBoyAdvancePalette
      null, // This is owned by GameBoyAdvanceVRAM
      null, // This is owned by GameBoyAdvanceOAM
      this.badMemory,
      this.badMemory,
      this.badMemory,
      this.badMemory,
      this.badMemory,
      this.badMemory,
      this.badMemory,
      this.badMemory, // Unused
    ];

    for (let i = 16; i < 256; ++i) {
      this.memory[i] = this.badMemory;
    }

    this.waitstates = this.WAITSTATES.slice(0);
    this.waitstatesSeq = this.WAITSTATES_SEQ.slice(0);
    this.waitstates32 = this.WAITSTATES_32.slice(0);
    this.waitstatesSeq32 = this.WAITSTATES_SEQ_32.slice(0);
    this.waitstatesPrefetch = this.WAITSTATES_SEQ.slice(0);
    this.waitstatesPrefetch32 = this.WAITSTATES_SEQ_32.slice(0);

    this.cart = defaultCart;
    this.save = null;

    this.DMA_REGISTER = [
      ioAddr.DMA0CNT_HI >> 1,
      ioAddr.DMA1CNT_HI >> 1,
      ioAddr.DMA2CNT_HI >> 1,
      ioAddr.DMA3CNT_HI >> 1,
    ];
  }

  freeze(): FrostMMU {
    return {
      ram: Serializer.prefix(this.memory[region.WORKING_RAM].buffer),
      iram: Serializer.prefix(this.memory[region.WORKING_IRAM].buffer),
    };
  }

  defrost(frost: FrostMMU) {
    this.memory[region.WORKING_RAM].replaceData(frost.ram);
    this.memory[region.WORKING_IRAM].replaceData(frost.iram);
  }

  loadBios(bios: ArrayBufferLike, real: boolean) {
    this.bios = new BIOSView(bios, 0);
    this.bios.real = !!real;
  }

  loadRom(rom: ArrayBufferLike, process: boolean): Cart {
    const cart = defaultCart;
    cart.memory = rom;

    const lo = new ROMView(rom, 0);
    if (lo.view.getUint8(0xb2) != 0x96) return cart; // Not a valid ROM

    lo.mmu = this; // Needed for GPIO
    this.memory[region.CART0] = lo;
    this.memory[region.CART1] = lo;
    this.memory[region.CART2] = lo;

    if (rom.byteLength > 0x01000000) {
      const hi = new ROMView(rom, 0x01000000);
      this.memory[region.CART0 + 1] = hi;
      this.memory[region.CART1 + 1] = hi;
      this.memory[region.CART2 + 1] = hi;
    }

    if (process) {
      let name = '';
      for (let i = 0; i < 12; ++i) {
        const c = lo.loadU8(i + 0xa0);
        if (!c) break;
        name += String.fromCharCode(c);
      }
      cart.title = name;

      let code = '';
      for (let i = 0; i < 4; ++i) {
        const c = lo.loadU8(i + 0xac);
        if (!c) break;
        code += String.fromCharCode(c);
      }
      cart.code = code;

      let maker = '';
      for (let i = 0; i < 2; ++i) {
        const c = lo.loadU8(i + 0xb0);
        if (!c) break;
        maker += String.fromCharCode(c);
      }
      cart.maker = maker;

      // Find savedata type
      let state = '';
      let next;
      let terminal = false;
      for (let i = 0xe4; i < rom.byteLength && !terminal; ++i) {
        next = String.fromCharCode(lo.loadU8(i));
        state += next;
        switch (state) {
          case 'F':
          case 'FL':
          case 'FLA':
          case 'FLAS':
          case 'FLASH':
          case 'FLASH_':
          case 'FLASH5':
          case 'FLASH51':
          case 'FLASH512':
          case 'FLASH512_':
          case 'FLASH1':
          case 'FLASH1M':
          case 'FLASH1M_':
          case 'S':
          case 'SR':
          case 'SRA':
          case 'SRAM':
          case 'SRAM_':
          case 'E':
          case 'EE':
          case 'EEP':
          case 'EEPR':
          case 'EEPRO':
          case 'EEPROM':
          case 'EEPROM_':
            break;
          case 'FLASH_V':
          case 'FLASH512_V':
          case 'FLASH1M_V':
          case 'SRAM_V':
          case 'EEPROM_V':
            terminal = true;
            break;
          default:
            state = next;
            break;
        }
      }

      if (terminal) {
        cart.saveType = state;
        switch (state) {
          case 'FLASH_V':
          case 'FLASH512_V':
            this.save = this.memory[region.CART_SRAM] = new FlashSavedata(size.CART_FLASH512);
            break;
          case 'FLASH1M_V':
            this.save = this.memory[region.CART_SRAM] = new FlashSavedata(size.CART_FLASH1M);
            break;
          case 'SRAM_V':
            this.save = this.memory[region.CART_SRAM] = new SRAMSavedata(size.CART_SRAM);
            break;
          case 'EEPROM_V':
            this.save = this.memory[region.CART2 + 1] = new EEPROMSavedata(size.CART_EEPROM, this);
            break;
        }
      }

      if (!this.save) this.save = this.memory[region.CART_SRAM] = new SRAMSavedata(size.CART_SRAM); // Assume we have SRAM
    }

    this.cart = cart;

    return cart;
  }

  loadSavedata(save: ArrayBufferLike) {
    this.save.replaceData(save);
  }

  load8(offset: number) {
    return this.memory[offset >>> this.BASE_OFFSET].load8(offset & 0x00ffffff);
  }

  load16(offset: number) {
    return this.memory[offset >>> this.BASE_OFFSET].load16(offset & 0x00ffffff);
  }

  load32(offset: number) {
    return this.memory[offset >>> this.BASE_OFFSET].load32(offset & 0x00ffffff);
  }

  loadU8(offset: number) {
    return this.memory[offset >>> this.BASE_OFFSET].loadU8(offset & 0x00ffffff);
  }

  loadU16(offset: number) {
    return this.memory[offset >>> this.BASE_OFFSET].loadU16(offset & 0x00ffffff);
  }

  store8(offset: number, value: number) {
    const maskedOffset = offset & 0x00ffffff;
    const memory = this.memory[offset >>> this.BASE_OFFSET];
    memory.store8(maskedOffset, value);
    memory.invalidatePage(maskedOffset);
  }

  store16(offset: number, value: number) {
    const maskedOffset = offset & 0x00fffffe;
    const memory = this.memory[offset >>> this.BASE_OFFSET];
    memory.store16(maskedOffset, value);
    memory.invalidatePage(maskedOffset);
  }

  store32(offset: number, value: number) {
    const maskedOffset = offset & 0x00fffffc;
    const memory = this.memory[offset >>> this.BASE_OFFSET];
    memory.store32(maskedOffset, value);
    memory.invalidatePage(maskedOffset);
    memory.invalidatePage(maskedOffset + 2);
  }

  waitPrefetch(memory: number) {
    this.cpu.cycles += 1 + this.waitstatesPrefetch[memory >>> this.BASE_OFFSET];
  }

  waitPrefetch32(memory: number) {
    this.cpu.cycles += 1 + this.waitstatesPrefetch32[memory >>> this.BASE_OFFSET];
  }

  wait(memory: number) {
    this.cpu.cycles += 1 + this.waitstates[memory >>> this.BASE_OFFSET];
  }

  wait32(memory: number) {
    this.cpu.cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
  }

  waitSeq(memory: number) {
    this.cpu.cycles += 1 + this.waitstatesSeq[memory >>> this.BASE_OFFSET];
  }

  waitSeq32(memory: number) {
    this.cpu.cycles += 1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET];
  }

  waitMul(rs: number) {
    if (rs & Number(0xffffff00 == 0xffffff00) || !(rs & 0xffffff00)) {
      this.cpu.cycles += 1;
    } else if (rs & Number(0xffff0000 == 0xffff0000) || !(rs & 0xffff0000)) {
      this.cpu.cycles += 2;
    } else if (rs & Number(0xff000000 == 0xff000000) || !(rs & 0xff000000)) {
      this.cpu.cycles += 3;
    } else {
      this.cpu.cycles += 4;
    }
  }

  waitMulti32(memory: number, seq: number) {
    this.cpu.cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
    this.cpu.cycles += (1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET]) * (seq - 1);
  }

  addressToPage(region: number, address: number) {
    return address >> this.memory[region].ICACHE_PAGE_BITS;
  }

  accessPage(region: number, pageId: number): Page {
    const memory = this.memory[region];
    let page = memory.icache[pageId];
    if (!page || page.invalid) {
      page = {
        thumb: new Array(1 << memory.ICACHE_PAGE_BITS),
        arm: new Array(1 << (memory.ICACHE_PAGE_BITS - 1)),
        invalid: false,
      };
      memory.icache[pageId] = page;
    }

    return page;
  }

  scheduleDma(number: number, info: DMA) {
    switch (info.timing) {
      case this.DMA_TIMING_NOW:
        this.serviceDma(number, info);
        break;
      case this.DMA_TIMING_HBLANK:
        // Handled implicitly
        break;
      case this.DMA_TIMING_VBLANK:
        // Handled implicitly
        break;
      case this.DMA_TIMING_CUSTOM:
        switch (number) {
          case 0:
            this.core.WARN('Discarding invalid DMA0 scheduling');
            break;
          case 1:
          case 2:
            this.cpu.irq?.audio?.scheduleFIFODma(number, info);
            break;
          case 3:
            // TODO
            this.cpu.irq?.video?.scheduleVCaptureDma(number, info);
            break;
        }
    }
  }

  runHblankDmas() {
    const len = this.cpu.irq?.dma.length || 0;
    for (let i = 0; i < len; ++i) {
      const dma = this.cpu.irq?.dma[i];
      if (dma && dma.enable && dma.timing == this.DMA_TIMING_HBLANK) this.serviceDma(i, dma);
    }
  }

  runVblankDmas() {
    const len = this.cpu.irq?.dma.length || 0;
    for (let i = 0; i < len; ++i) {
      const dma = this.cpu.irq?.dma[i];
      if (dma && dma.enable && dma.timing == this.DMA_TIMING_VBLANK) this.serviceDma(i, dma);
    }
  }

  serviceDma(number: number, info: DMA) {
    if (!info.enable) return; // There was a DMA scheduled that got canceled

    const width = info.width;
    const sourceOffset = this.DMA_OFFSET[info.srcControl] * width;
    const destOffset = this.DMA_OFFSET[info.dstControl] * width;
    let wordsRemaining = info.nextCount;
    let source = info.nextSource & this.OFFSET_MASK;
    let dest = info.nextDest & this.OFFSET_MASK;
    const sourceRegion = info.nextSource >>> this.BASE_OFFSET;
    const destRegion = info.nextDest >>> this.BASE_OFFSET;
    const sourceBlock = this.memory[sourceRegion];
    const destBlock = this.memory[destRegion];
    let sourceView = null;
    let destView = null;
    let sourceMask = 0xffffffff;
    let destMask = 0xffffffff;
    let word;

    if (destBlock.ICACHE_PAGE_BITS) {
      const endPage = (dest + wordsRemaining * width) >> destBlock.ICACHE_PAGE_BITS;
      for (let i = dest >> destBlock.ICACHE_PAGE_BITS; i <= endPage; ++i) {
        destBlock.invalidatePage(i << destBlock.ICACHE_PAGE_BITS);
      }
    }

    if (destRegion == region.WORKING_RAM || destRegion == region.WORKING_IRAM) {
      destView = destBlock.view;
      destMask = destBlock.mask;
    }

    if (
      sourceRegion == region.WORKING_RAM ||
      sourceRegion == region.WORKING_IRAM ||
      sourceRegion == region.CART0 ||
      sourceRegion == region.CART1
    ) {
      sourceView = sourceBlock.view;
      sourceMask = sourceBlock.mask;
    }

    if (sourceBlock && destBlock) {
      if (sourceView && destView) {
        if (width == 4) {
          source &= 0xfffffffc;
          dest &= 0xfffffffc;
          while (wordsRemaining--) {
            word = sourceView.getInt32(source & sourceMask);
            destView.setInt32(dest & destMask, word);
            source += sourceOffset;
            dest += destOffset;
          }
        } else {
          while (wordsRemaining--) {
            word = sourceView.getUint16(source & sourceMask);
            destView.setUint16(dest & destMask, word);
            source += sourceOffset;
            dest += destOffset;
          }
        }
      } else if (sourceView) {
        if (width == 4) {
          source &= 0xfffffffc;
          dest &= 0xfffffffc;
          while (wordsRemaining--) {
            word = sourceView.getInt32(source & sourceMask, true);
            destBlock.store32(dest, word);
            source += sourceOffset;
            dest += destOffset;
          }
        } else {
          while (wordsRemaining--) {
            word = sourceView.getUint16(source & sourceMask, true);
            destBlock.store16(dest, word);
            source += sourceOffset;
            dest += destOffset;
          }
        }
      } else {
        if (width == 4) {
          source &= 0xfffffffc;
          dest &= 0xfffffffc;
          while (wordsRemaining--) {
            word = sourceBlock.load32(source);
            destBlock.store32(dest, word);
            source += sourceOffset;
            dest += destOffset;
          }
        } else {
          while (wordsRemaining--) {
            word = sourceBlock.loadU16(source);
            destBlock.store16(dest, word);
            source += sourceOffset;
            dest += destOffset;
          }
        }
      }
    } else {
      this.core.WARN('Invalid DMA');
    }

    if (info.doIrq) {
      info.nextIRQ = this.cpu.cycles + 2;
      info.nextIRQ +=
        width == 4
          ? this.waitstates32[sourceRegion] + this.waitstates32[destRegion]
          : this.waitstates[sourceRegion] + this.waitstates[destRegion];
      info.nextIRQ +=
        (info.count - 1) *
        (width == 4
          ? this.waitstatesSeq32[sourceRegion] + this.waitstatesSeq32[destRegion]
          : this.waitstatesSeq[sourceRegion] + this.waitstatesSeq[destRegion]);
    }

    info.nextSource = source | (sourceRegion << this.BASE_OFFSET);
    info.nextDest = dest | (destRegion << this.BASE_OFFSET);
    info.nextCount = wordsRemaining;

    if (!info.repeat) {
      info.enable = false;

      // Clear the enable bit in memory
      const io = this.memory[region.IO] as GameBoyAdvanceIO;
      io.registers[this.DMA_REGISTER[number]] &= 0x7fe0;
    } else {
      info.nextCount = info.count;
      if (info.dstControl == this.DMA_INCREMENT_RELOAD) info.nextDest = info.dest;
      this.scheduleDma(number, info);
    }
  }

  adjustTimings(word: number) {
    const sram = word & 0x0003;
    const [ws0, ws0seq] = [(word & 0x000c) >> 2, (word & 0x0010) >> 4];
    const [ws1, ws1seq] = [(word & 0x0060) >> 5, (word & 0x0080) >> 7];
    const [ws2, ws2seq] = [(word & 0x0300) >> 8, (word & 0x0400) >> 10];
    const prefetch = word & 0x4000;

    this.waitstates[region.CART_SRAM] = this.ROM_WS[sram];
    this.waitstatesSeq[region.CART_SRAM] = this.ROM_WS[sram];
    this.waitstates32[region.CART_SRAM] = this.ROM_WS[sram];
    this.waitstatesSeq32[region.CART_SRAM] = this.ROM_WS[sram];

    this.waitstates[region.CART0] = this.waitstates[region.CART0 + 1] = this.ROM_WS[ws0];
    this.waitstates[region.CART1] = this.waitstates[region.CART1 + 1] = this.ROM_WS[ws1];
    this.waitstates[region.CART2] = this.waitstates[region.CART2 + 1] = this.ROM_WS[ws2];

    this.waitstatesSeq[region.CART0] = this.waitstatesSeq[region.CART0 + 1] =
      this.ROM_WS_SEQ[0][ws0seq];
    this.waitstatesSeq[region.CART1] = this.waitstatesSeq[region.CART1 + 1] =
      this.ROM_WS_SEQ[1][ws1seq];
    this.waitstatesSeq[region.CART2] = this.waitstatesSeq[region.CART2 + 1] =
      this.ROM_WS_SEQ[2][ws2seq];

    this.waitstates32[region.CART0] = this.waitstates32[region.CART0 + 1] =
      this.waitstates[region.CART0] + 1 + this.waitstatesSeq[region.CART0];
    this.waitstates32[region.CART1] = this.waitstates32[region.CART1 + 1] =
      this.waitstates[region.CART1] + 1 + this.waitstatesSeq[region.CART1];
    this.waitstates32[region.CART2] = this.waitstates32[region.CART2 + 1] =
      this.waitstates[region.CART2] + 1 + this.waitstatesSeq[region.CART2];

    this.waitstatesSeq32[region.CART0] = this.waitstatesSeq32[region.CART0 + 1] =
      2 * this.waitstatesSeq[region.CART0] + 1;
    this.waitstatesSeq32[region.CART1] = this.waitstatesSeq32[region.CART1 + 1] =
      2 * this.waitstatesSeq[region.CART1] + 1;
    this.waitstatesSeq32[region.CART2] = this.waitstatesSeq32[region.CART2 + 1] =
      2 * this.waitstatesSeq[region.CART2] + 1;

    if (prefetch) {
      this.waitstatesPrefetch[region.CART0] = this.waitstatesPrefetch[region.CART0 + 1] = 0;
      this.waitstatesPrefetch[region.CART1] = this.waitstatesPrefetch[region.CART1 + 1] = 0;
      this.waitstatesPrefetch[region.CART2] = this.waitstatesPrefetch[region.CART2 + 1] = 0;

      this.waitstatesPrefetch32[region.CART0] = this.waitstatesPrefetch32[region.CART0 + 1] = 0;
      this.waitstatesPrefetch32[region.CART1] = this.waitstatesPrefetch32[region.CART1 + 1] = 0;
      this.waitstatesPrefetch32[region.CART2] = this.waitstatesPrefetch32[region.CART2 + 1] = 0;
    } else {
      this.waitstatesPrefetch[region.CART0] = this.waitstatesPrefetch[region.CART0 + 1] =
        this.waitstatesSeq[region.CART0];
      this.waitstatesPrefetch[region.CART1] = this.waitstatesPrefetch[region.CART1 + 1] =
        this.waitstatesSeq[region.CART1];
      this.waitstatesPrefetch[region.CART2] = this.waitstatesPrefetch[region.CART2 + 1] =
        this.waitstatesSeq[region.CART2];

      this.waitstatesPrefetch32[region.CART0] = this.waitstatesPrefetch32[region.CART0 + 1] =
        this.waitstatesSeq32[region.CART0];
      this.waitstatesPrefetch32[region.CART1] = this.waitstatesPrefetch32[region.CART1 + 1] =
        this.waitstatesSeq32[region.CART1];
      this.waitstatesPrefetch32[region.CART2] = this.waitstatesPrefetch32[region.CART2 + 1] =
        this.waitstatesSeq32[region.CART2];
    }
  }

  saveNeedsFlush(): boolean {
    return this.save.writePending;
  }

  flushSave() {
    this.save.writePending = false;
  }

  allocGPIO(rom: ROMView) {
    return new GameBoyAdvanceGPIO(this.core, rom);
  }
}
