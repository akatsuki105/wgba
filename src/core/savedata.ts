import { GameBoyAdvanceMMU } from './mmu';

class MemoryView {
  buffer: ArrayBufferLike;
  view: DataView;
  mask: number;
  mask8: number;
  mask16: number;
  mask32: number;
  icache: any[];

  constructor(memory: ArrayBufferLike, offset = 0) {
    this.buffer = memory;
    this.view = new DataView(this.buffer, offset);
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
    return this.view.getInt8(offset & this.mask8);
  }

  load16(offset: number) {
    // Unaligned 16-bit loads are unpredictable...let's just pretend they work
    return this.view.getInt16(offset & this.mask, true);
  }

  loadU8(offset: number) {
    return this.view.getUint8(offset & this.mask8);
  }

  loadU16(offset: number) {
    // Unaligned 16-bit loads are unpredictable...let's just pretend they work
    return this.view.getUint16(offset & this.mask, true);
  }

  load32(offset: number) {
    // Unaligned 32-bit loads are "rotated" so they make some semblance of sense
    const rotate = (offset & 3) << 3;
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

export class SRAMSavedata extends MemoryView {
  writePending: boolean;

  constructor(size: number) {
    super(new ArrayBuffer(size), 0);
    this.writePending = false;
  }

  store8(offset: number, value: number) {
    if (offset >= this.view.byteLength) return;
    this.view.setInt8(offset, value);
    this.writePending = true;
  }

  store16(offset: number, value: number) {
    if (offset >= this.view.byteLength) return;
    this.view.setInt16(offset, value, true);
    this.writePending = true;
  }

  store32(offset: number, value: number) {
    if (offset >= this.view.byteLength) return;
    this.view.setInt32(offset, value, true);
    this.writePending = true;
  }
}

const flashCmd = {
  wipe: 0x10,
  eraseSector: 0x30,
  erase: 0x80,
  id: 0x90,
  write: 0xa0,
  switchBank: 0xb0,
  terminateId: 0xf0,
} as const;

const panasonic = 0x1b32;
const sanyo = 0x1362;

export class FlashSavedata extends MemoryView {
  bank0: DataView;
  bank1: DataView | null;
  bank: DataView;
  id: number;

  idMode: boolean;
  writePending: boolean;

  first: number;
  second: number;
  command: number;
  pendingCommand: number;

  constructor(size: number) {
    super(new ArrayBuffer(size), 0);

    this.bank0 = new DataView(this.buffer, 0, 0x00010000);
    if (size > 0x00010000) {
      this.id = sanyo;
      this.bank1 = new DataView(this.buffer, 0x00010000);
    } else {
      this.id = panasonic;
      this.bank1 = null;
    }
    this.bank = this.bank0;

    this.idMode = false;
    this.writePending = false;

    this.first = 0;
    this.second = 0;
    this.command = 0;
    this.pendingCommand = 0;
  }

  load8(offset: number) {
    if (this.idMode && offset < 2) {
      return (this.id >> (offset << 3)) & 0xff;
    } else if (offset < 0x10000) {
      return this.bank.getInt8(offset);
    } else {
      return 0;
    }
  }

  load16(offset: number) {
    return (this.load8(offset) & 0xff) | (this.load8(offset + 1) << 8);
  }

  load32(offset: number) {
    return (
      (this.load8(offset) & 0xff) |
      (this.load8(offset + 1) << 8) |
      (this.load8(offset + 2) << 16) |
      (this.load8(offset + 3) << 24)
    );
  }

  loadU8(offset: number) {
    return this.load8(offset) & 0xff;
  }

  loadU16(offset: number) {
    return (this.loadU8(offset) & 0xff) | (this.loadU8(offset + 1) << 8);
  }

  store8(offset: number, value: number) {
    switch (this.command) {
      case 0:
        if (offset == 0x5555) {
          if (this.second == 0x55) {
            switch (value) {
              case flashCmd.erase:
                this.pendingCommand = value;
                break;
              case flashCmd.id:
                this.idMode = true;
                break;
              case flashCmd.terminateId:
                this.idMode = false;
                break;
              default:
                this.command = value;
                break;
            }
            this.second = 0;
            this.first = 0;
          } else {
            this.command = 0;
            this.first = value;
            this.idMode = false;
          }
        } else if (offset == 0x2aaa && this.first == 0xaa) {
          this.first = 0;
          if (this.pendingCommand) {
            this.command = this.pendingCommand;
          } else {
            this.second = value;
          }
        }
        break;
      case flashCmd.erase:
        switch (value) {
          case flashCmd.wipe:
            if (offset == 0x5555) {
              for (let i = 0; i < this.view.byteLength; i += 4) {
                this.view.setInt32(i, -1);
              }
            }
            break;
          case flashCmd.eraseSector:
            if ((offset & 0x0fff) == 0) {
              for (let i = offset; i < offset + 0x1000; i += 4) {
                this.bank.setInt32(i, -1);
              }
            }
            break;
        }
        this.pendingCommand = 0;
        this.command = 0;
        break;
      case flashCmd.write:
        this.bank.setInt8(offset, value);
        this.command = 0;

        this.writePending = true;
        break;
      case flashCmd.switchBank:
        if (this.bank1 && offset == 0) {
          this.bank = value == 1 ? this.bank1 : this.bank0;
        }
        this.command = 0;
        break;
    }
  }

  store16(offset: number, value: number) {
    throw new Error('Unaligned save to flash!');
  }

  store32(offset: number, value: number) {
    throw new Error('Unaligned save to flash!');
  }

  replaceData(memory: ArrayBufferLike) {
    const bank = this.view === this.bank1;
    MemoryView.prototype.replaceData.call(this, memory, 0);

    this.bank0 = new DataView(this.buffer, 0, 0x00010000);
    if (memory.byteLength > 0x00010000) {
      this.bank1 = new DataView(this.buffer, 0x00010000);
    } else {
      this.bank1 = null;
    }
    this.bank = bank ? (this.bank1 as DataView) : this.bank0;
  }
}

const eepromCmd = {
  null: 0,
  pending: 1,
  write: 2,
  readPending: 3,
  read: 4,
} as const;

export class EEPROMSavedata extends MemoryView {
  writeAddress: number;
  readBitsRemaining: number;
  readAddress: number;

  command: number;
  commandBitsRemaining: number;

  realSize: number;
  addressBits: number;
  writePending: boolean;

  dma: any;

  constructor(size: number, mmu: GameBoyAdvanceMMU) {
    super(new ArrayBuffer(size), 0);

    this.writeAddress = 0;
    this.readBitsRemaining = 0;
    this.readAddress = 0;

    this.command = 0;
    this.commandBitsRemaining = 0;

    this.realSize = 0;
    this.addressBits = 0;
    this.writePending = false;

    this.dma = mmu.core.irq.dma[3];
  }

  load8(offset: number) {
    throw new Error('Unsupported 8-bit access!');

    return 0;
  }

  load16(offset: number) {
    return this.loadU16(offset);
  }

  loadU8(offset: number) {
    throw new Error('Unsupported 8-bit access!');

    return 0;
  }

  loadU16(offset: number) {
    if (this.command != eepromCmd.read || !this.dma.enable) return 1;
    --this.readBitsRemaining;
    if (this.readBitsRemaining < 64) {
      const step = 63 - this.readBitsRemaining;
      const data = this.view.getUint8((this.readAddress + step) >> 3) >> (0x7 - (step & 0x7));
      if (!this.readBitsRemaining) {
        this.command = eepromCmd.null;
      }

      return data & 0x1;
    }

    return 0;
  }

  load32(offset: number) {
    throw new Error('Unsupported 32-bit access!');

    return 0;
  }

  store8(offset: number, value: number) {
    throw new Error('Unsupported 8-bit access!');
  }

  store16(offset: number, value: number) {
    switch (this.command) {
      // Read header
      case eepromCmd.null:
      default:
        this.command = value & 0x1;
        break;
      case eepromCmd.pending:
        this.command <<= 1;
        this.command |= value & 0x1;
        if (this.command == eepromCmd.write) {
          if (!this.realSize) {
            const bits = this.dma.count - 67;
            this.realSize = 8 << bits;
            this.addressBits = bits;
          }
          this.commandBitsRemaining = this.addressBits + 64 + 1;
          this.writeAddress = 0;
        } else {
          if (!this.realSize) {
            const bits = this.dma.count - 3;
            this.realSize = 8 << bits;
            this.addressBits = bits;
          }
          this.commandBitsRemaining = this.addressBits + 1;
          this.readAddress = 0;
        }
        break;
      // Do commands
      case eepromCmd.write:
        // Write
        if (--this.commandBitsRemaining > 64) {
          this.writeAddress <<= 1;
          this.writeAddress |= (value & 0x1) << 6;
        } else if (this.commandBitsRemaining <= 0) {
          this.command = eepromCmd.null;
          this.writePending = true;
        } else {
          let current = this.view.getUint8(this.writeAddress >> 3);
          current &= ~(1 << (0x7 - (this.writeAddress & 0x7)));
          current |= (value & 0x1) << (0x7 - (this.writeAddress & 0x7));
          this.view.setUint8(this.writeAddress >> 3, current);
          ++this.writeAddress;
        }
        break;
      case eepromCmd.readPending:
        // Read
        if (--this.commandBitsRemaining > 0) {
          this.readAddress <<= 1;
          if (value & 0x1) {
            this.readAddress |= 0x40;
          }
        } else {
          this.readBitsRemaining = 68;
          this.command = eepromCmd.read;
        }
        break;
    }
  }

  store32(offset: number, value: number) {
    throw new Error('Unsupported 32-bit access!');
  }

  replaceData(memory: ArrayBufferLike) {
    MemoryView.prototype.replaceData.call(this, memory, 0);
  }
}
