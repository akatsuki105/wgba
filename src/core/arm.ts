import { ARMCore, bitMask, LR, PC, privMode } from './core';

type ImmFunc = (rn: number, offset: number, condOp?: () => boolean) => () => number;
type RegFunc = (rn: number, rm: number, condOp?: () => boolean) => () => number;
type RegSFunc = (rn: number, shiftOp: () => void, condOp?: () => boolean) => () => number;

export class ARMCoreArm {
  cpu: ARMCore;
  addressingMode23Immediate: (ImmFunc | null)[];
  addressingMode23Register: (RegFunc | null)[];
  addressingMode2RegisterShifted: (RegSFunc | null)[];

  constructor(cpu: ARMCore) {
    this.cpu = cpu;

    this.addressingMode23Immediate = [
      // 000x0
      (rn, offset, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn];
          if (!condOp || condOp()) gprs[rn] -= offset;

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      // 000xW
      null,

      null,
      null,

      // 00Ux0
      (rn, offset, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn];
          if (!condOp || condOp()) {
            gprs[rn] += offset;
          }

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      // 00UxW
      null,

      null,
      null,

      // 0P0x0
      (rn, offset, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          return gprs[rn] - offset;
        };

        address.writesPC = false;

        return address;
      },

      // 0P0xW
      (rn, offset, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn] - offset;
          if (!condOp || condOp()) gprs[rn] = addr;

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      null,
      null,

      // 0PUx0
      (rn, offset, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          return gprs[rn] + offset;
        };

        address.writesPC = false;

        return address;
      },

      // 0PUxW
      (rn, offset, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn] + offset;
          if (!condOp || condOp()) gprs[rn] = addr;

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      null,
      null,
    ];

    this.addressingMode23Register = [
      // I00x0
      (rn, rm, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn];
          if (!condOp || condOp()) gprs[rn] -= gprs[rm];

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      // I00xW
      null,

      null,
      null,

      // I0Ux0
      (rn, rm, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn];
          if (!condOp || condOp()) gprs[rn] += gprs[rm];

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      // I0UxW
      null,

      null,
      null,

      // IP0x0
      (rn, rm, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          return gprs[rn] - gprs[rm];
        };

        address.writesPC = false;

        return address;
      },

      // IP0xW
      (rn, rm, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn] - gprs[rm];
          if (!condOp || condOp()) gprs[rn] = addr;

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      null,
      null,

      // IPUx0
      (rn, rm, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn] + gprs[rm];

          return addr;
        };

        address.writesPC = false;

        return address;
      },

      // IPUxW
      (rn, rm, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn] + gprs[rm];
          if (!condOp || condOp()) gprs[rn] = addr;

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      null,
      null,
    ];

    this.addressingMode2RegisterShifted = [
      // I00x0
      (rn, shiftOp, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn];
          if (!condOp || condOp()) {
            shiftOp();
            gprs[rn] -= cpu.shifterOperand;
          }

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      // I00xW
      null,

      null,
      null,

      // I0Ux0
      (rn, shiftOp, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          const addr = gprs[rn];
          if (!condOp || condOp()) {
            shiftOp();
            gprs[rn] += cpu.shifterOperand;
          }

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },
      // I0UxW
      null,

      null,
      null,

      // IP0x0
      (rn, shiftOp, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          shiftOp();

          return gprs[rn] - cpu.shifterOperand;
        };

        address.writesPC = false;

        return address;
      },

      // IP0xW
      (rn, shiftOp, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          shiftOp();
          const addr = gprs[rn] - cpu.shifterOperand;
          if (!condOp || condOp()) {
            gprs[rn] = addr;
          }

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      null,
      null,

      // IPUx0
      (rn, shiftOp, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          shiftOp();

          return gprs[rn] + cpu.shifterOperand;
        };

        address.writesPC = false;

        return address;
      },

      // IPUxW
      (rn, shiftOp, condOp) => {
        const gprs = cpu.gprs;
        const address = () => {
          shiftOp();
          const addr = gprs[rn] + cpu.shifterOperand;
          if (!condOp || condOp()) gprs[rn] = addr;

          return addr;
        };

        address.writesPC = rn == PC;

        return address;
      },

      null,
      null,
    ];
  }

  constructAddressingMode1ASR(rs: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      ++cpu.cycles;
      let shift = gprs[rs];
      if (rs == PC) shift += 4;
      shift &= 0xff;

      let shiftVal = gprs[rm];
      if (rm == PC) shiftVal += 4;

      if (shift == 0) {
        cpu.shifterOperand = shiftVal;
        cpu.shifterCarryOut = Number(cpu.cpsrC);
      } else if (shift < 32) {
        cpu.shifterOperand = shiftVal >> shift;
        cpu.shifterCarryOut = shiftVal & (1 << (shift - 1));
      } else if (gprs[rm] >> 31) {
        cpu.shifterOperand = 0xffffffff;
        cpu.shifterCarryOut = 0x80000000;
      } else {
        cpu.shifterOperand = 0;
        cpu.shifterCarryOut = 0;
      }
    };
  }

  constructAddressingMode1Immediate(immediate: number): () => void {
    const cpu = this.cpu;

    return () => {
      cpu.shifterOperand = immediate;
      cpu.shifterCarryOut = Number(cpu.cpsrC);
    };
  }

  constructAddressingMode1ImmediateRotate(immediate: number, rotate: number): () => void {
    const cpu = this.cpu;

    return () => {
      cpu.shifterOperand = (immediate >>> rotate) | (immediate << (32 - rotate));
      cpu.shifterCarryOut = cpu.shifterOperand >> 31;
    };
  }

  constructAddressingMode1LSL(rs: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      ++cpu.cycles;

      let shift = gprs[rs];
      if (rs == PC) shift += 4;
      shift &= 0xff;

      let shiftVal = gprs[rm];
      if (rm == PC) shiftVal += 4;
      if (shift == 0) {
        cpu.shifterOperand = shiftVal;
        cpu.shifterCarryOut = Number(cpu.cpsrC);
      } else if (shift < 32) {
        cpu.shifterOperand = shiftVal << shift;
        cpu.shifterCarryOut = shiftVal & (1 << (32 - shift));
      } else if (shift == 32) {
        cpu.shifterOperand = 0;
        cpu.shifterCarryOut = shiftVal & 1;
      } else {
        cpu.shifterOperand = 0;
        cpu.shifterCarryOut = 0;
      }
    };
  }

  constructAddressingMode1LSR(rs: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      ++cpu.cycles;

      let shift = gprs[rs];
      if (rs == PC) shift += 4;
      shift &= 0xff;

      let shiftVal = gprs[rm];
      if (rm == PC) shiftVal += 4;

      if (shift == 0) {
        cpu.shifterOperand = shiftVal;
        cpu.shifterCarryOut = Number(cpu.cpsrC);
      } else if (shift < 32) {
        cpu.shifterOperand = shiftVal >>> shift;
        cpu.shifterCarryOut = shiftVal & (1 << (shift - 1));
      } else if (shift == 32) {
        cpu.shifterOperand = 0;
        cpu.shifterCarryOut = shiftVal >> 31;
      } else {
        cpu.shifterOperand = 0;
        cpu.shifterCarryOut = 0;
      }
    };
  }

  constructAddressingMode1ROR(rs: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      ++cpu.cycles;

      let shift = gprs[rs];
      if (rs == PC) shift += 4;
      shift &= 0xff;

      let shiftVal = gprs[rm];
      if (rm == PC) shiftVal += 4;

      const rotate = shift & 0x1f;
      if (shift == 0) {
        cpu.shifterOperand = shiftVal;
        cpu.shifterCarryOut = Number(cpu.cpsrC);
      } else if (rotate) {
        cpu.shifterOperand = (gprs[rm] >>> rotate) | (gprs[rm] << (32 - rotate));
        cpu.shifterCarryOut = shiftVal & (1 << (rotate - 1));
      } else {
        cpu.shifterOperand = shiftVal;
        cpu.shifterCarryOut = shiftVal >> 31;
      }
    };
  }

  constructAddressingMode23Immediate(
    instruction: number,
    immediate: number,
    condOp?: () => boolean,
  ) {
    const rn = (instruction & 0x000f0000) >> 16;
    if (this.addressingMode23Immediate[(instruction & 0x01a00000) >> 21]) {
      return (this.addressingMode23Immediate[(instruction & 0x01a00000) >> 21] as ImmFunc)(
        rn,
        immediate,
        condOp,
      );
    }
  }

  constructAddressingMode23Register(instruction: number, rm: number, condOp?: () => boolean) {
    const rn = (instruction & 0x000f0000) >> 16;
    if (this.addressingMode23Register[(instruction & 0x01a00000) >> 21]) {
      return (this.addressingMode23Register[(instruction & 0x01a00000) >> 21] as RegFunc)(
        rn,
        rm,
        condOp,
      );
    }
  }

  constructAddressingMode2RegisterShifted(
    instruction: number,
    shiftOp: () => void,
    condOp?: () => boolean,
  ) {
    const rn = (instruction & 0x000f0000) >> 16;
    if (this.addressingMode2RegisterShifted[(instruction & 0x01a00000) >> 21]) {
      return (this.addressingMode2RegisterShifted[(instruction & 0x01a00000) >> 21] as RegSFunc)(
        rn,
        shiftOp,
        condOp,
      );
    }
  }

  constructAddressingMode4(immediate: number, rn: number): (writeInitial: boolean) => number {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return (writeInitial: boolean): number => {
      const addr = gprs[rn] + immediate;

      return addr;
    };
  }

  constructAddressingMode4Writeback(
    immediate: number,
    offset: number,
    rn: number,
    overlap: boolean,
  ): (writeInitial: boolean) => number {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return (writeInitial: boolean): number => {
      const addr = gprs[rn] + immediate;
      if (writeInitial && overlap) cpu.mmu?.store32(gprs[rn] + immediate - 4, gprs[rn]);
      gprs[rn] += offset;

      return addr;
    };
  }

  constructADC(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu?.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const shifterOperand = (cpu.shifterOperand >>> 0) + Number(!!cpu.cpsrC);
      gprs[rd] = (gprs[rn] >>> 0) + shifterOperand;
    };
  }

  constructADCS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const shifterOperand = (cpu.shifterOperand >>> 0) + Number(!!cpu.cpsrC);
      const d = (gprs[rn] >>> 0) + shifterOperand;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(d >> 31);
        cpu.cpsrZ = !(d & 0xffffffff);
        cpu.cpsrC = d > 0xffffffff;
        cpu.cpsrV =
          gprs[rn] >> 31 == shifterOperand >> 31 &&
          gprs[rn] >> 31 != d >> 31 &&
          shifterOperand >> 31 != d >> 31;
      }
      gprs[rd] = d;
    };
  }

  constructADD(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
    };
  }

  constructADDS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const d = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(d >> 31);
        cpu.cpsrZ = !(d & 0xffffffff);
        cpu.cpsrC = d > 0xffffffff;
        cpu.cpsrV =
          gprs[rn] >> 31 == cpu.shifterOperand >> 31 &&
          gprs[rn] >> 31 != d >> 31 &&
          cpu.shifterOperand >> 31 != d >> 31;
      }
      gprs[rd] = d;
    };
  }

  constructAND(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = gprs[rn] & cpu.shifterOperand;
    };
  }

  constructANDS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = gprs[rn] & cpu.shifterOperand;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(gprs[rd] >> 31);
        cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
        cpu.cpsrC = !!cpu.shifterCarryOut;
      }
    };
  }

  constructB(immediate: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      if (condOp && !condOp()) {
        cpu.mmu.waitPrefetch32(gprs[PC]);

        return;
      }
      cpu.mmu.waitPrefetch32(gprs[PC]);
      gprs[PC] += immediate;
    };
  }

  constructBIC(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = gprs[rn] & ~cpu.shifterOperand;
    };
  }

  constructBICS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = gprs[rn] & ~cpu.shifterOperand;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(gprs[rd] >> 31);
        cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
        cpu.cpsrC = !!cpu.shifterCarryOut;
      }
    };
  }

  constructBL(immediate: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      if (condOp && !condOp()) {
        cpu.mmu.waitPrefetch32(gprs[PC]);

        return;
      }
      cpu.mmu.waitPrefetch32(gprs[PC]);
      gprs[LR] = gprs[PC] - 4;
      gprs[PC] += immediate;
    };
  }

  constructBX(rm: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      if (condOp && !condOp()) {
        cpu.mmu.waitPrefetch32(gprs[PC]);

        return;
      }
      cpu.mmu.waitPrefetch32(gprs[PC]);
      cpu.switchExecMode(gprs[rm] & 0x00000001);
      gprs[PC] = gprs[rm] & 0xfffffffe;
    };
  }

  constructCMN(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const aluOut = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
      cpu.cpsrN = !!(aluOut >> 31);
      cpu.cpsrZ = !(aluOut & 0xffffffff);
      cpu.cpsrC = aluOut > 0xffffffff;
      cpu.cpsrV =
        gprs[rn] >> 31 == cpu.shifterOperand >> 31 &&
        gprs[rn] >> 31 != aluOut >> 31 &&
        cpu.shifterOperand >> 31 != aluOut >> 31;
    };
  }

  constructCMP(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const aluOut = gprs[rn] - cpu.shifterOperand;
      cpu.cpsrN = !!(aluOut >> 31);
      cpu.cpsrZ = !(aluOut & 0xffffffff);
      cpu.cpsrC = gprs[rn] >>> 0 >= cpu.shifterOperand >>> 0;
      cpu.cpsrV = gprs[rn] >> 31 != cpu.shifterOperand >> 31 && gprs[rn] >> 31 != aluOut >> 31;
    };
  }

  constructEOR(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = gprs[rn] ^ cpu.shifterOperand;
    };
  }

  constructEORS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = gprs[rn] ^ cpu.shifterOperand;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(gprs[rd] >> 31);
        cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
        cpu.cpsrC = !!cpu.shifterCarryOut;
      }
    };
  }

  constructLDM(rs: number, address: (w: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;
    const mmu = cpu.mmu;

    return () => {
      mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      let addr = address(false);
      let total = 0;
      let m, i;
      for (m = rs, i = 0; m; m >>= 1, ++i) {
        if (m & 1) {
          gprs[i] = mmu.load32(addr & 0xfffffffc);
          addr += 4;
          ++total;
        }
      }
      mmu.waitMulti32(addr, total);
      ++cpu.cycles;
    };
  }

  constructLDMS(rs: number, address: (w: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;
    const mmu = cpu.mmu;

    return () => {
      mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      let addr = address(false);
      let total = 0;
      const mode = cpu.mode;
      cpu.switchMode(privMode.SYSTEM);
      let m, i;
      for (m = rs, i = 0; m; m >>= 1, ++i) {
        if (m & 1) {
          gprs[i] = mmu.load32(addr & 0xfffffffc);
          addr += 4;
          ++total;
        }
      }
      cpu.switchMode(mode);
      mmu.waitMulti32(addr, total);
      ++cpu.cycles;
    };
  }

  constructLDR(rd: number, address: (w?: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      const addr = address();
      gprs[rd] = cpu.mmu.load32(addr);
      cpu.mmu.wait32(addr);
      ++cpu.cycles;
    };
  }

  constructLDRB(rd: number, address: (w?: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      const addr = address();
      gprs[rd] = cpu.mmu.loadU8(addr);
      cpu.mmu.wait(addr);
      ++cpu.cycles;
    };
  }

  constructLDRH(rd: number, address: (w?: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      const addr = address();
      gprs[rd] = cpu.mmu.loadU16(addr);
      cpu.mmu.wait(addr);
      ++cpu.cycles;
    };
  }

  constructLDRSB(rd: number, address: (w?: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      const addr = address();
      gprs[rd] = cpu.mmu.load8(addr);
      cpu.mmu.wait(addr);
      ++cpu.cycles;
    };
  }

  constructLDRSH(rd: number, address: (w?: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      const addr = address();
      gprs[rd] = cpu.mmu.load16(addr);
      cpu.mmu.wait(addr);
      ++cpu.cycles;
    };
  }

  constructMLA(rd: number, rn: number, rs: number, rm: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      ++cpu.cycles;
      cpu.mmu.waitMul(rs);
      if (gprs[rm] & 0xffff0000 && gprs[rs] & 0xffff0000) {
        // Our data type is a double--we'll lose bits if we do it all at once!
        const hi = ((gprs[rm] & 0xffff0000) * gprs[rs]) & 0xffffffff;
        const lo = ((gprs[rm] & 0x0000ffff) * gprs[rs]) & 0xffffffff;
        gprs[rd] = (hi + lo + gprs[rn]) & 0xffffffff;
      } else {
        gprs[rd] = gprs[rm] * gprs[rs] + gprs[rn];
      }
    };
  }

  constructMLAS(
    rd: number,
    rn: number,
    rs: number,
    rm: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      ++cpu.cycles;
      cpu.mmu.waitMul(rs);
      if (gprs[rm] & 0xffff0000 && gprs[rs] & 0xffff0000) {
        // Our data type is a double--we'll lose bits if we do it all at once!
        const hi = ((gprs[rm] & 0xffff0000) * gprs[rs]) & 0xffffffff;
        const lo = ((gprs[rm] & 0x0000ffff) * gprs[rs]) & 0xffffffff;
        gprs[rd] = (hi + lo + gprs[rn]) & 0xffffffff;
      } else {
        gprs[rd] = gprs[rm] * gprs[rs] + gprs[rn];
      }
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructMOV(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = cpu.shifterOperand;
    };
  }

  constructMOVS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = cpu.shifterOperand;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(gprs[rd] >> 31);
        cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
        cpu.cpsrC = !!cpu.shifterCarryOut;
      }
    };
  }

  constructMRS(rd: number, r: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      gprs[rd] = r ? cpu.spsr : cpu.packCPSR();
    };
  }

  constructMSR(
    rm: number,
    r: number,
    instruction: number,
    immediate: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;
    const c = instruction & 0x00010000;
    const f = instruction & 0x00080000;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      const operand = !!(instruction & 0x02000000) ? immediate : gprs[rm];
      let mask = (c ? 0x000000ff : 0x00000000) | (f ? 0xff000000 : 0x00000000);

      if (r) {
        mask &= bitMask.USER_MASK | bitMask.PRIV_MASK | bitMask.STATE_MASK;
        cpu.spsr = (cpu.spsr & ~mask) | (operand & mask);
      } else {
        if (mask & bitMask.USER_MASK) {
          cpu.cpsrN = !!(operand >> 31);
          cpu.cpsrZ = !!(operand & 0x40000000);
          cpu.cpsrC = !!(operand & 0x20000000);
          cpu.cpsrV = !!(operand & 0x10000000);
        }

        if (cpu.mode != privMode.USER && mask & bitMask.PRIV_MASK) {
          cpu.switchMode((operand & 0x0000000f) | 0x00000010);
          cpu.cpsrI = !!(operand & 0x00000080);
          cpu.cpsrF = !!(operand & 0x00000040);
        }
      }
    };
  }

  constructMUL(rd: number, rs: number, rm: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      cpu.mmu.waitMul(gprs[rs]);
      if (gprs[rm] & 0xffff0000 && gprs[rs] & 0xffff0000) {
        // Our data type is a double--we'll lose bits if we do it all at once!
        const hi = ((gprs[rm] & 0xffff0000) * gprs[rs]) | 0;
        const lo = ((gprs[rm] & 0x0000ffff) * gprs[rs]) | 0;
        gprs[rd] = hi + lo;
      } else {
        gprs[rd] = gprs[rm] * gprs[rs];
      }
    };
  }

  constructMULS(rd: number, rs: number, rm: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      cpu.mmu.waitMul(gprs[rs]);
      if (gprs[rm] & 0xffff0000 && gprs[rs] & 0xffff0000) {
        // Our data type is a double--we'll lose bits if we do it all at once!
        const hi = ((gprs[rm] & 0xffff0000) * gprs[rs]) | 0;
        const lo = ((gprs[rm] & 0x0000ffff) * gprs[rs]) | 0;
        gprs[rd] = hi + lo;
      } else {
        gprs[rd] = gprs[rm] * gprs[rs];
      }
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructMVN(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = ~cpu.shifterOperand;
    };
  }

  constructMVNS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = ~cpu.shifterOperand;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(gprs[rd] >> 31);
        cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
        cpu.cpsrC = !!cpu.shifterCarryOut;
      }
    };
  }

  constructORR(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = gprs[rn] | cpu.shifterOperand;
    };
  }

  constructORRS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = gprs[rn] | cpu.shifterOperand;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(gprs[rd] >> 31);
        cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
        cpu.cpsrC = !!cpu.shifterCarryOut;
      }
    };
  }

  constructRSB(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = cpu.shifterOperand - gprs[rn];
    };
  }

  constructRSBS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const d = cpu.shifterOperand - gprs[rn];
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(d >> 31);
        cpu.cpsrZ = !(d & 0xffffffff);
        cpu.cpsrC = cpu.shifterOperand >>> 0 >= gprs[rn] >>> 0;
        cpu.cpsrV =
          cpu.shifterOperand >> 31 != gprs[rn] >> 31 && cpu.shifterOperand >> 31 != d >> 31;
      }
      gprs[rd] = d;
    };
  }

  constructRSC(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const n = (gprs[rn] >>> 0) + Number(!cpu.cpsrC);
      gprs[rd] = (cpu.shifterOperand >>> 0) - n;
    };
  }

  constructRSCS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const n = (gprs[rn] >>> 0) + Number(!cpu.cpsrC);
      const d = (cpu.shifterOperand >>> 0) - n;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(d >> 31);
        cpu.cpsrZ = !(d & 0xffffffff);
        cpu.cpsrC = cpu.shifterOperand >>> 0 >= d >>> 0;
        cpu.cpsrV = cpu.shifterOperand >> 31 != n >> 31 && cpu.shifterOperand >> 31 != d >> 31;
      }
      gprs[rd] = d;
    };
  }

  constructSBC(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const shifterOperand = (cpu.shifterOperand >>> 0) + Number(!cpu.cpsrC);
      gprs[rd] = (gprs[rn] >>> 0) - shifterOperand;
    };
  }

  constructSBCS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const shifterOperand = (cpu.shifterOperand >>> 0) + Number(!cpu.cpsrC);
      const d = (gprs[rn] >>> 0) - shifterOperand;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(d >> 31);
        cpu.cpsrZ = !(d & 0xffffffff);
        cpu.cpsrC = gprs[rn] >>> 0 >= d >>> 0;
        cpu.cpsrV = gprs[rn] >> 31 != shifterOperand >> 31 && gprs[rn] >> 31 != d >> 31;
      }
      gprs[rd] = d;
    };
  }

  constructSMLAL(
    rd: number,
    rn: number,
    rs: number,
    rm: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const SHIFT_32 = 1 / 0x100000000;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      cpu.cycles += 2;
      cpu.mmu.waitMul(rs);
      const hi = (gprs[rm] & 0xffff0000) * gprs[rs];
      const lo = (gprs[rm] & 0x0000ffff) * gprs[rs];
      const carry = (gprs[rn] >>> 0) + hi + lo;
      gprs[rn] = carry;
      gprs[rd] += Math.floor(carry * SHIFT_32);
    };
  }

  constructSMLALS(
    rd: number,
    rn: number,
    rs: number,
    rm: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const SHIFT_32 = 1 / 0x100000000;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      cpu.cycles += 2;
      cpu.mmu.waitMul(rs);
      const hi = (gprs[rm] & 0xffff0000) * gprs[rs];
      const lo = (gprs[rm] & 0x0000ffff) * gprs[rs];
      const carry = (gprs[rn] >>> 0) + hi + lo;
      gprs[rn] = carry;
      gprs[rd] += Math.floor(carry * SHIFT_32);
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff || gprs[rn] & 0xffffffff);
    };
  }

  constructSMULL(
    rd: number,
    rn: number,
    rs: number,
    rm: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const SHIFT_32 = 1 / 0x100000000;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      ++cpu.cycles;
      cpu.mmu.waitMul(gprs[rs]);
      const hi = ((gprs[rm] & 0xffff0000) >> 0) * (gprs[rs] >> 0);
      const lo = ((gprs[rm] & 0x0000ffff) >> 0) * (gprs[rs] >> 0);
      gprs[rn] = ((hi & 0xffffffff) + (lo & 0xffffffff)) & 0xffffffff;
      gprs[rd] = Math.floor(hi * SHIFT_32 + lo * SHIFT_32);
    };
  }

  constructSMULLS(
    rd: number,
    rn: number,
    rs: number,
    rm: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const SHIFT_32 = 1 / 0x100000000;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      ++cpu.cycles;
      cpu.mmu.waitMul(gprs[rs]);
      const hi = ((gprs[rm] & 0xffff0000) >> 0) * (gprs[rs] >> 0);
      const lo = ((gprs[rm] & 0x0000ffff) >> 0) * (gprs[rs] >> 0);
      gprs[rn] = ((hi & 0xffffffff) + (lo & 0xffffffff)) & 0xffffffff;
      gprs[rd] = Math.floor(hi * SHIFT_32 + lo * SHIFT_32);
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff || gprs[rn] & 0xffffffff);
    };
  }

  constructSTM(rs: number, address: (w: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;
    const mmu = cpu.mmu;

    return () => {
      if (condOp && !condOp()) {
        mmu.waitPrefetch32(gprs[PC]);

        return;
      }
      mmu.wait32(gprs[PC]);
      let addr = address(true);
      let total = 0;
      let m, i;
      for (m = rs, i = 0; m; m >>= 1, ++i) {
        if (m & 1) {
          mmu.store32(addr, gprs[i]);
          addr += 4;
          ++total;
        }
      }
      mmu.waitMulti32(addr, total);
    };
  }

  constructSTMS(rs: number, address: (w: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;
    const mmu = cpu.mmu;

    return () => {
      if (condOp && !condOp()) {
        mmu.waitPrefetch32(gprs[PC]);

        return;
      }
      mmu.wait32(gprs[PC]);
      const mode = cpu.mode;
      let addr = address(true);
      let total = 0;
      let m, i;
      cpu.switchMode(privMode.SYSTEM);
      for (m = rs, i = 0; m; m >>= 1, ++i) {
        if (m & 1) {
          mmu.store32(addr, gprs[i]);
          addr += 4;
          ++total;
        }
      }
      cpu.switchMode(mode);
      mmu.waitMulti32(addr, total);
    };
  }

  constructSTR(rd: number, address: (w?: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      if (condOp && !condOp()) {
        cpu.mmu.waitPrefetch32(gprs[PC]);

        return;
      }
      const addr = address();
      cpu.mmu.store32(addr, gprs[rd]);
      cpu.mmu.wait32(addr);
      cpu.mmu.wait32(gprs[PC]);
    };
  }

  constructSTRB(rd: number, address: (w?: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      if (condOp && !condOp()) {
        cpu.mmu.waitPrefetch32(gprs[PC]);

        return;
      }
      const addr = address();
      cpu.mmu.store8(addr, gprs[rd]);
      cpu.mmu.wait(addr);
      cpu.mmu.wait32(gprs[PC]);
    };
  }

  constructSTRH(rd: number, address: (w?: boolean) => number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      if (condOp && !condOp()) {
        cpu.mmu.waitPrefetch32(gprs[PC]);

        return;
      }
      const addr = address();
      cpu.mmu.store16(addr, gprs[rd]);
      cpu.mmu.wait(addr);
      cpu.mmu.wait32(gprs[PC]);
    };
  }

  constructSUB(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      gprs[rd] = gprs[rn] - cpu.shifterOperand;
    };
  }

  constructSUBS(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const d = gprs[rn] - cpu.shifterOperand;
      if (rd == PC && cpu.hasSPSR()) {
        cpu.unpackCPSR(cpu.spsr);
      } else {
        cpu.cpsrN = !!(d >> 31);
        cpu.cpsrZ = !(d & 0xffffffff);
        cpu.cpsrC = gprs[rn] >>> 0 >= cpu.shifterOperand >>> 0;
        cpu.cpsrV = gprs[rn] >> 31 != cpu.shifterOperand >> 31 && gprs[rn] >> 31 != d >> 31;
      }
      gprs[rd] = d;
    };
  }

  constructSWI(immediate: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      if (condOp && !condOp()) {
        cpu.mmu.waitPrefetch32(gprs[PC]);

        return;
      }
      cpu.irq?.swi32(immediate);
      cpu.mmu.waitPrefetch32(gprs[PC]);
    };
  }

  constructSWP(rd: number, rn: number, rm: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      cpu.mmu.wait32(gprs[rn]);
      cpu.mmu.wait32(gprs[rn]);
      const d = cpu.mmu.load32(gprs[rn]);
      cpu.mmu.store32(gprs[rn], gprs[rm]);
      gprs[rd] = d;
      ++cpu.cycles;
    };
  }

  constructSWPB(rd: number, rn: number, rm: number, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      cpu.mmu.wait(gprs[rn]);
      cpu.mmu.wait(gprs[rn]);
      const d = cpu.mmu.load8(gprs[rn]);
      cpu.mmu.store8(gprs[rn], gprs[rm]);
      gprs[rd] = d;
      ++cpu.cycles;
    };
  }

  constructTEQ(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const aluOut = gprs[rn] ^ cpu.shifterOperand;
      cpu.cpsrN = !!(aluOut >> 31);
      cpu.cpsrZ = !(aluOut & 0xffffffff);
      cpu.cpsrC = !!cpu.shifterCarryOut;
    };
  }

  constructTST(rd: number, rn: number, shiftOp: () => void, condOp?: () => boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      shiftOp();
      const aluOut = gprs[rn] & cpu.shifterOperand;
      cpu.cpsrN = !!(aluOut >> 31);
      cpu.cpsrZ = !(aluOut & 0xffffffff);
      cpu.cpsrC = !!cpu.shifterCarryOut;
    };
  }

  constructUMLAL(
    rd: number,
    rn: number,
    rs: number,
    rm: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const SHIFT_32 = 1 / 0x100000000;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      cpu.cycles += 2;
      cpu.mmu.waitMul(rs);
      const hi = ((gprs[rm] & 0xffff0000) >>> 0) * (gprs[rs] >>> 0);
      const lo = (gprs[rm] & 0x0000ffff) * (gprs[rs] >>> 0);
      const carry = (gprs[rn] >>> 0) + hi + lo;
      gprs[rn] = carry;
      gprs[rd] += carry * SHIFT_32;
    };
  }

  constructUMLALS(
    rd: number,
    rn: number,
    rs: number,
    rm: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const SHIFT_32 = 1 / 0x100000000;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      cpu.cycles += 2;
      cpu.mmu.waitMul(rs);
      const hi = ((gprs[rm] & 0xffff0000) >>> 0) * (gprs[rs] >>> 0);
      const lo = (gprs[rm] & 0x0000ffff) * (gprs[rs] >>> 0);
      const carry = (gprs[rn] >>> 0) + hi + lo;
      gprs[rn] = carry;
      gprs[rd] += carry * SHIFT_32;
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff || gprs[rn] & 0xffffffff);
    };
  }

  constructUMULL(
    rd: number,
    rn: number,
    rs: number,
    rm: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const SHIFT_32 = 1 / 0x100000000;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      ++cpu.cycles;
      cpu.mmu.waitMul(gprs[rs]);
      const hi = ((gprs[rm] & 0xffff0000) >>> 0) * (gprs[rs] >>> 0);
      const lo = ((gprs[rm] & 0x0000ffff) >>> 0) * (gprs[rs] >>> 0);
      gprs[rn] = ((hi & 0xffffffff) + (lo & 0xffffffff)) & 0xffffffff;
      gprs[rd] = (hi * SHIFT_32 + lo * SHIFT_32) >>> 0;
    };
  }

  constructUMULLS(
    rd: number,
    rn: number,
    rs: number,
    rm: number,
    condOp?: () => boolean,
  ): () => void {
    const cpu = this.cpu;
    const SHIFT_32 = 1 / 0x100000000;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch32(gprs[PC]);
      if (condOp && !condOp()) return;
      ++cpu.cycles;
      cpu.mmu.waitMul(gprs[rs]);
      const hi = ((gprs[rm] & 0xffff0000) >>> 0) * (gprs[rs] >>> 0);
      const lo = ((gprs[rm] & 0x0000ffff) >>> 0) * (gprs[rs] >>> 0);
      gprs[rn] = ((hi & 0xffffffff) + (lo & 0xffffffff)) & 0xffffffff;
      gprs[rd] = (hi * SHIFT_32 + lo * SHIFT_32) >>> 0;
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff || gprs[rn] & 0xffffffff);
    };
  }
}
