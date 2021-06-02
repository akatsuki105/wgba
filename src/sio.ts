import { GameBoyAdvance } from './gba';
import { hex } from './util';

export class GameBoyAdvanceSIO {
  SIO_NORMAL_8: number;
  SIO_NORMAL_32: number;
  SIO_MULTI: number;
  SIO_UART: number;
  SIO_GPIO: number;
  SIO_JOYBUS: number;
  BAUD: number[];
  mode: number;
  sd: boolean;
  irq: boolean;
  multiplayer: any;
  linkLayer: any;
  core: GameBoyAdvance;

  constructor(core: GameBoyAdvance) {
    this.core = core;

    this.SIO_NORMAL_8 = 0;
    this.SIO_NORMAL_32 = 1;
    this.SIO_MULTI = 2;
    this.SIO_UART = 3;
    this.SIO_GPIO = 8;
    this.SIO_JOYBUS = 12;

    this.BAUD = [9600, 38400, 57600, 115200];

    this.mode = 0;
    this.sd = false;
    this.irq = false;
    this.multiplayer = null;
    this.linkLayer = null;
  }

  clear() {
    this.mode = this.SIO_GPIO;
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
    if (this.mode != this.SIO_GPIO) return;
    this.core.STUB('General purpose serial not supported');
  }

  writeSIOCNT(value: number) {
    switch (this.mode) {
      case this.SIO_NORMAL_8:
        this.core.STUB('8-bit transfer unsupported');
        break;
      case this.SIO_NORMAL_32:
        this.core.STUB('32-bit transfer unsupported');
        break;
      case this.SIO_MULTI:
        this.multiplayer.baud = value & 0x0003;
        if (this.linkLayer) {
          this.linkLayer.setBaud(this.BAUD[this.multiplayer.baud]);
        }

        if (!this.multiplayer.si) {
          this.multiplayer.busy = value & 0x0080;
          if (this.linkLayer && this.multiplayer.busy) {
            this.linkLayer.startMultiplayerTransfer();
          }
        }
        this.irq = !!(value & 0x4000);
        break;
      case this.SIO_UART:
        this.core.STUB('UART unsupported');
        break;
      case this.SIO_GPIO:
        // This register isn't used in general-purpose mode
        break;
      case this.SIO_JOYBUS:
        this.core.STUB('JOY BUS unsupported');
        break;
    }
  }

  readSIOCNT() {
    let value = (this.mode << 12) & 0xffff;
    switch (this.mode) {
      case this.SIO_NORMAL_8:
        this.core.STUB('8-bit transfer unsupported');
        break;
      case this.SIO_NORMAL_32:
        this.core.STUB('32-bit transfer unsupported');
        break;
      case this.SIO_MULTI:
        value |= this.multiplayer.baud;
        value |= this.multiplayer.si;

        value |= Number(this.sd) << 3;
        value |= this.multiplayer.id << 4;
        value |= this.multiplayer.error;
        value |= this.multiplayer.busy;

        value |= Number(!!this.multiplayer.irq) << 14;
        break;
      case this.SIO_UART:
        this.core.STUB('UART unsupported');
        break;
      case this.SIO_GPIO:
        // This register isn't used in general-purpose mode
        break;
      case this.SIO_JOYBUS:
        this.core.STUB('JOY BUS unsupported');
        break;
    }

    return value;
  }

  read(slot: any) {
    switch (this.mode) {
      case this.SIO_NORMAL_32:
        this.core.STUB('32-bit transfer unsupported');
        break;
      case this.SIO_MULTI:
        return this.multiplayer.states[slot];
      case this.SIO_UART:
        this.core.STUB('UART unsupported');
        break;
      default:
        this.core.WARN('Reading from transfer register in unsupported mode');
        break;
    }

    return 0;
  }
}
