import { GameBoyAdvance } from './gba';
import { hex } from './util';

const mode = {
  NORMAL_8: 0,
  NORMAL_32: 1,
  MULTI: 2,
  UART: 3,
  GPIO: 8,
  JOYBUS: 12,
} as const;

const baud = [9600, 38400, 57600, 115200] as const;

export class GameBoyAdvanceSIO {
  core: GameBoyAdvance;
  mode: number;
  sd: boolean;
  irq: boolean;
  multiplayer: any;
  linkLayer: any;

  constructor(core: GameBoyAdvance) {
    this.core = core;
    this.mode = 0;
    this.sd = false;
    this.irq = false;
    this.multiplayer = null;
    this.linkLayer = null;
  }

  clear() {
    this.mode = mode.GPIO;
    this.sd = false;

    this.irq = false;
    this.multiplayer = {
      baud: 0,
      si: 0,
      id: 0,
      error: 0,
      busy: 0,

      states: [0xffff, 0xffff, 0xffff, 0xffff],
    };

    this.linkLayer = null;
  }

  setMode(mode: number) {
    mode &= mode & 0x8 ? 0xc : 0x3;
    this.mode = mode;
    this.core.INFO('Setting SIO mode to ' + hex(mode, 1));
  }

  writeRCNT(value: number) {
    if (this.mode != mode.GPIO) return;
    this.core.STUB('General purpose serial not supported');
  }

  writeSIOCNT(value: number) {
    switch (this.mode) {
      case mode.NORMAL_8:
        this.core.STUB('8-bit transfer unsupported');
        break;
      case mode.NORMAL_32:
        this.core.STUB('32-bit transfer unsupported');
        break;
      case mode.MULTI:
        this.multiplayer.baud = value & 0x0003;
        if (this.linkLayer) {
          this.linkLayer.setBaud(baud[this.multiplayer.baud]);
        }

        if (!this.multiplayer.si) {
          this.multiplayer.busy = value & 0x0080;
          if (this.linkLayer && this.multiplayer.busy) {
            this.linkLayer.startMultiplayerTransfer();
          }
        }
        this.irq = !!(value & 0x4000);
        break;
      case mode.UART:
        this.core.STUB('UART unsupported');
        break;
      case mode.GPIO:
        // This register isn't used in general-purpose mode
        break;
      case mode.JOYBUS:
        this.core.STUB('JOY BUS unsupported');
        break;
    }
  }

  readSIOCNT() {
    let value = (this.mode << 12) & 0xffff;
    switch (this.mode) {
      case mode.NORMAL_8:
        this.core.STUB('8-bit transfer unsupported');
        break;
      case mode.NORMAL_32:
        this.core.STUB('32-bit transfer unsupported');
        break;
      case mode.MULTI:
        value |= this.multiplayer.baud;
        value |= this.multiplayer.si;

        value |= Number(this.sd) << 3;
        value |= this.multiplayer.id << 4;
        value |= this.multiplayer.error;
        value |= this.multiplayer.busy;

        value |= Number(!!this.multiplayer.irq) << 14;
        break;
      case mode.UART:
        this.core.STUB('UART unsupported');
        break;
      case mode.GPIO:
        // This register isn't used in general-purpose mode
        break;
      case mode.JOYBUS:
        this.core.STUB('JOY BUS unsupported');
        break;
    }

    return value;
  }

  read(slot: any) {
    switch (this.mode) {
      case mode.NORMAL_32:
        this.core.STUB('32-bit transfer unsupported');
        break;
      case mode.MULTI:
        return this.multiplayer.states[slot];
      case mode.UART:
        this.core.STUB('UART unsupported');
        break;
      default:
        this.core.WARN('Reading from transfer register in unsupported mode');
        break;
    }

    return 0;
  }
}
