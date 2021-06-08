import { ARMCore, LR, PC, SP } from './core';
import { ror } from 'src/utils';

export class ARMCoreThumb {
  cpu: ARMCore;

  constructor(cpu: ARMCore) {
    this.cpu = cpu;
  }

  constructADC(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const m = (gprs[rm] >>> 0) + Number(!!cpu.cpsrC);
      const oldD = gprs[rd];
      const d = (oldD >>> 0) + m;
      const oldDn = oldD >> 31;
      const dn = d >> 31;
      const mn = m >> 31;
      cpu.cpsrN = !!dn;
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = d > 0xffffffff;
      cpu.cpsrV = oldDn == mn && oldDn != dn && mn != dn;
      gprs[rd] = d;
    };
  }

  constructADD1(rd: number, rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const d = (gprs[rn] >>> 0) + immediate;
      cpu.cpsrN = !!(d >> 31);
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = d > 0xffffffff;
      cpu.cpsrV = !!(!(gprs[rn] >> 31) && ((gprs[rn] >> 31) ^ d) >> 31 && d >> 31);
      gprs[rd] = d;
    };
  }

  constructADD2(rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const d = (gprs[rn] >>> 0) + immediate;
      cpu.cpsrN = !!(d >> 31);
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = d > 0xffffffff;
      cpu.cpsrV = !!(!(gprs[rn] >> 31) && (gprs[rn] ^ d) >> 31 && (immediate ^ d) >> 31);
      gprs[rn] = d;
    };
  }

  constructADD3(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const d = (gprs[rn] >>> 0) + (gprs[rm] >>> 0);
      cpu.cpsrN = !!(d >> 31);
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = d > 0xffffffff;
      cpu.cpsrV = !!(
        !((gprs[rn] ^ gprs[rm]) >> 31) &&
        (gprs[rn] ^ d) >> 31 &&
        (gprs[rm] ^ d) >> 31
      );
      gprs[rd] = d;
    };
  }

  constructADD4(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] += gprs[rm];
    };
  }

  constructADD5(rd: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = (gprs[PC] & 0xfffffffc) + immediate;
    };
  }

  constructADD6(rd: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = gprs[SP] + immediate;
    };
  }

  constructADD7(immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[SP] += immediate;
    };
  }

  constructAND(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = gprs[rd] & gprs[rm];
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructASR1(rd: number, rm: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      if (immediate == 0) {
        cpu.cpsrC = !!(gprs[rm] >> 31);
        gprs[rd] = cpu.cpsrC ? 0xffffffff : 0;
      } else {
        cpu.cpsrC = !!(gprs[rm] & (1 << (immediate - 1)));
        gprs[rd] = gprs[rm] >> immediate;
      }
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructASR2(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const rs = gprs[rm] & 0xff;
      if (rs) {
        if (rs < 32) {
          cpu.cpsrC = !!(gprs[rd] & (1 << (rs - 1)));
          gprs[rd] >>= rs;
        } else {
          cpu.cpsrC = !!(gprs[rd] >> 31);
          gprs[rd] = cpu.cpsrC ? 0xffffffff : 0;
        }
      }
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructB1(immediate: number, condOp: any): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      if (condOp()) gprs[PC] += immediate;
    };
  }

  constructB2(immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[PC] += immediate;
    };
  }

  constructBIC(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = gprs[rd] & ~gprs[rm];
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructBL1(immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[LR] = gprs[PC] + immediate;
    };
  }

  constructBL2(immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const pc = gprs[PC];
      gprs[PC] = gprs[LR] + (immediate << 1);
      gprs[LR] = pc - 1;
    };
  }

  constructBX(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      cpu.switchExecMode(gprs[rm] & 0x00000001);
      const misalign = rm == 15 ? gprs[rm] & 0x00000002 : 0;
      gprs[PC] = gprs[rm] & (0xfffffffe - misalign);
    };
  }

  constructCMN(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const aluOut = (gprs[rd] >>> 0) + (gprs[rm] >>> 0);
      cpu.cpsrN = !!(aluOut >> 31);
      cpu.cpsrZ = !(aluOut & 0xffffffff);
      cpu.cpsrC = aluOut > 0xffffffff;
      cpu.cpsrV =
        gprs[rd] >> 31 == gprs[rm] >> 31 &&
        gprs[rd] >> 31 != aluOut >> 31 &&
        gprs[rm] >> 31 != aluOut >> 31;
    };
  }

  constructCMP1(rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const aluOut = gprs[rn] - immediate;
      cpu.cpsrN = !!(aluOut >> 31);
      cpu.cpsrZ = !(aluOut & 0xffffffff);
      cpu.cpsrC = gprs[rn] >>> 0 >= immediate;
      cpu.cpsrV = !!(gprs[rn] >> 31 && (gprs[rn] ^ aluOut) >> 31);
    };
  }

  constructCMP2(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const d = gprs[rd];
      const m = gprs[rm];
      const aluOut = d - m;
      const an = aluOut >> 31;
      const dn = d >> 31;
      cpu.cpsrN = !!an;
      cpu.cpsrZ = !(aluOut & 0xffffffff);
      cpu.cpsrC = d >>> 0 >= m >>> 0;
      cpu.cpsrV = dn != m >> 31 && dn != an;
    };
  }

  constructCMP3(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const aluOut = gprs[rd] - gprs[rm];
      cpu.cpsrN = !!(aluOut >> 31);
      cpu.cpsrZ = !(aluOut & 0xffffffff);
      cpu.cpsrC = gprs[rd] >>> 0 >= gprs[rm] >>> 0;
      cpu.cpsrV = !!((gprs[rd] ^ gprs[rm]) >> 31 && (gprs[rd] ^ aluOut) >> 31);
    };
  }

  constructEOR(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = gprs[rd] ^ gprs[rm];
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructLDMIA(rn: number, rs: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      let address = gprs[rn];
      let total = 0;
      let m, i;
      for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
        if (rs & m) {
          gprs[i] = cpu.mmu.load32(address);
          address += 4;
          ++total;
        }
      }
      cpu.mmu.waitMulti32(address, total);
      if (!((1 << rn) & rs)) {
        gprs[rn] = address;
      }
    };
  }

  constructLDR1(rd: number, rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const n = gprs[rn] + immediate;
      gprs[rd] = cpu.mmu.load32(n);
      cpu.mmu.wait32(n);
      ++cpu.cycles;
    };
  }

  constructLDR2(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = cpu.mmu.load32(gprs[rn] + gprs[rm]);
      cpu.mmu.wait32(gprs[rn] + gprs[rm]);
      ++cpu.cycles;
    };
  }

  constructLDR3(rd: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = cpu.mmu.load32((gprs[PC] & 0xfffffffc) + immediate);
      cpu.mmu.wait32(gprs[PC]);
      ++cpu.cycles;
    };
  }

  constructLDR4(rd: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = cpu.mmu.load32(gprs[SP] + immediate);
      cpu.mmu.wait32(gprs[SP] + immediate);
      ++cpu.cycles;
    };
  }

  constructLDRB1(rd: number, rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      const n = gprs[rn] + immediate;
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = cpu.mmu.loadU8(n);
      cpu.mmu.wait(n);
      ++cpu.cycles;
    };
  }

  constructLDRB2(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = cpu.mmu.loadU8(gprs[rn] + gprs[rm]);
      cpu.mmu.wait(gprs[rn] + gprs[rm]);
      ++cpu.cycles;
    };
  }

  constructLDRH1(rd: number, rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      const n = gprs[rn] + immediate;
      cpu.mmu.waitPrefetch(gprs[PC]);

      const misaligned = n % 2;
      gprs[rd] = cpu.mmu.loadU16(n - misaligned);
      if (misaligned) {
        // https://github.com/jsmolka/gba-tests/blob/a6447c5404c8fc2898ddc51f438271f832083b7e/thumb/memory.asm#L320
        gprs[rd] = ror(gprs[rd], 8);
      }

      cpu.mmu.wait(n);
      ++cpu.cycles;
    };
  }

  constructLDRH2(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);

      const misaligned = (gprs[rn] + gprs[rm]) % 2;
      gprs[rd] = cpu.mmu.loadU16(gprs[rn] + gprs[rm] - misaligned);
      if (misaligned) {
        // https://github.com/jsmolka/gba-tests/blob/a6447c5404c8fc2898ddc51f438271f832083b7e/thumb/memory.asm#L189
        gprs[rd] = ror(gprs[rd], 8);
      }
      cpu.mmu.wait(gprs[rn] + gprs[rm]);
      ++cpu.cycles;
    };
  }

  constructLDRSB(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = cpu.mmu.load8(gprs[rn] + gprs[rm]);
      cpu.mmu.wait(gprs[rn] + gprs[rm]);
      ++cpu.cycles;
    };
  }

  constructLDRSH(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);

      const misaligned = (gprs[rn] + gprs[rm]) % 2;
      gprs[rd] = cpu.mmu.load16(gprs[rn] + gprs[rm]);
      if (misaligned) {
        // https://github.com/jsmolka/gba-tests/blob/a6447c5404c8fc2898ddc51f438271f832083b7e/thumb/memory.asm#L207
        const val = gprs[rd];
        gprs[rd] = ((val & 0xff) << 24) | ((val & 0xff) << 16) | ((val & 0xff) << 8) | val;
      }

      cpu.mmu.wait(gprs[rn] + gprs[rm]);
      ++cpu.cycles;
    };
  }

  constructLSL1(rd: number, rm: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      if (immediate == 0) {
        gprs[rd] = gprs[rm];
      } else {
        cpu.cpsrC = !!(gprs[rm] & (1 << (32 - immediate)));
        gprs[rd] = gprs[rm] << immediate;
      }
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructLSL2(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const rs = gprs[rm] & 0xff;
      if (rs) {
        if (rs < 32) {
          cpu.cpsrC = !!(gprs[rd] & (1 << (32 - rs)));
          gprs[rd] <<= rs;
        } else {
          cpu.cpsrC = rs > 32 ? false : !!(gprs[rd] & 0x00000001);
          gprs[rd] = 0;
        }
      }
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructLSR1(rd: number, rm: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      if (immediate == 0) {
        cpu.cpsrC = !!(gprs[rm] >> 31);
        gprs[rd] = 0;
      } else {
        cpu.cpsrC = !!(gprs[rm] & (1 << (immediate - 1)));
        gprs[rd] = gprs[rm] >>> immediate;
      }
      cpu.cpsrN = false;
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructLSR2(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const rs = gprs[rm] & 0xff;
      if (rs) {
        if (rs < 32) {
          cpu.cpsrC = !!(gprs[rd] & (1 << (rs - 1)));
          gprs[rd] >>>= rs;
        } else {
          cpu.cpsrC = rs > 32 ? false : !!(gprs[rd] >> 31);
          gprs[rd] = 0;
        }
      }
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructMOV1(rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rn] = immediate;
      cpu.cpsrN = !!(immediate >> 31);
      cpu.cpsrZ = !(immediate & 0xffffffff);
    };
  }

  constructMOV2(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const d = gprs[rn];
      cpu.cpsrN = !!(d >> 31);
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = false;
      cpu.cpsrV = false;
      gprs[rd] = d;
    };
  }

  constructMOV3(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = gprs[rm];
    };
  }

  constructMUL(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      cpu.mmu.waitMul(gprs[rm]);
      if (gprs[rm] & 0xffff0000 && gprs[rd] & 0xffff0000) {
        // Our data type is a double--we'll lose bits if we do it all at once!
        const hi = ((gprs[rd] & 0xffff0000) * gprs[rm]) & 0xffffffff;
        const lo = ((gprs[rd] & 0x0000ffff) * gprs[rm]) & 0xffffffff;
        gprs[rd] = (hi + lo) & 0xffffffff;
      } else {
        gprs[rd] *= gprs[rm];
      }
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructMVN(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = ~gprs[rm];
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructNEG(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const d = -gprs[rm];
      cpu.cpsrN = !!(d >> 31);
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = 0 >= d >>> 0;
      cpu.cpsrV = !!(gprs[rm] >> 31 && d >> 31);
      gprs[rd] = d;
    };
  }

  constructORR(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      gprs[rd] = gprs[rd] | gprs[rm];
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructPOP(rs: number, r: boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      ++cpu.cycles;
      let address = gprs[SP];
      let total = 0;
      let m, i;
      for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
        if (rs & m) {
          cpu.mmu.waitSeq32(address);
          gprs[i] = cpu.mmu.load32(address);
          address += 4;
          ++total;
        }
      }
      if (r) {
        gprs[PC] = cpu.mmu.load32(address) & 0xfffffffe;
        address += 4;
        ++total;
      }
      cpu.mmu.waitMulti32(address, total);
      gprs[SP] = address;
    };
  }

  constructPUSH(rs: number, r: boolean): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      let address = gprs[SP] - 4;
      let total = 0;
      cpu.mmu.waitPrefetch(gprs[PC]);
      if (r) {
        cpu.mmu.store32(address, gprs[LR]);
        address -= 4;
        ++total;
      }
      let m, i;
      for (m = 0x80, i = 7; m; m >>= 1, --i) {
        if (rs & m) {
          cpu.mmu.store32(address, gprs[i]);
          address -= 4;
          ++total;
          break;
        }
      }
      for (m >>= 1, --i; m; m >>= 1, --i) {
        if (rs & m) {
          cpu.mmu.store32(address, gprs[i]);
          address -= 4;
          ++total;
        }
      }
      cpu.mmu.waitMulti32(address, total);
      gprs[SP] = address + 4;
    };
  }

  constructROR(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const rs = gprs[rm] & 0xff;
      if (rs) {
        const r4 = rs & 0x1f;
        if (r4 > 0) {
          cpu.cpsrC = !!(gprs[rd] & (1 << (r4 - 1)));
          gprs[rd] = (gprs[rd] >>> r4) | (gprs[rd] << (32 - r4));
        } else {
          cpu.cpsrC = !!(gprs[rd] >> 31);
        }
      }
      cpu.cpsrN = !!(gprs[rd] >> 31);
      cpu.cpsrZ = !(gprs[rd] & 0xffffffff);
    };
  }

  constructSBC(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const m = (gprs[rm] >>> 0) + Number(!cpu.cpsrC);
      const d = (gprs[rd] >>> 0) - m;
      cpu.cpsrN = !!(d >> 31);
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = gprs[rd] >>> 0 >= d >>> 0;
      cpu.cpsrV = !!((gprs[rd] ^ m) >> 31 && (gprs[rd] ^ d) >> 31);
      gprs[rd] = d;
    };
  }

  constructSTMIA(rn: number, rs: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.wait(gprs[PC]);
      let address = gprs[rn];
      let total = 0;
      let m, i;
      for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
        if (rs & m) {
          cpu.mmu.store32(address, gprs[i]);
          address += 4;
          ++total;
          break;
        }
      }
      for (m <<= 1, ++i; i < 8; m <<= 1, ++i) {
        if (rs & m) {
          cpu.mmu.store32(address, gprs[i]);
          address += 4;
          ++total;
        }
      }
      cpu.mmu.waitMulti32(address, total);
      gprs[rn] = address;
    };
  }

  constructSTR1(rd: number, rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      const n = gprs[rn] + immediate;
      cpu.mmu.store32(n, gprs[rd]);
      cpu.mmu.wait(gprs[PC]);
      cpu.mmu.wait32(n);
    };
  }

  constructSTR2(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.store32(gprs[rn] + gprs[rm], gprs[rd]);
      cpu.mmu.wait(gprs[PC]);
      cpu.mmu.wait32(gprs[rn] + gprs[rm]);
    };
  }

  constructSTR3(rd: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.store32(gprs[SP] + immediate, gprs[rd]);
      cpu.mmu.wait(gprs[PC]);
      cpu.mmu.wait32(gprs[SP] + immediate);
    };
  }

  constructSTRB1(rd: number, rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      const n = gprs[rn] + immediate;
      cpu.mmu.store8(n, gprs[rd]);
      cpu.mmu.wait(gprs[PC]);
      cpu.mmu.wait(n);
    };
  }

  constructSTRB2(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.store8(gprs[rn] + gprs[rm], gprs[rd]);
      cpu.mmu.wait(gprs[PC]);
      cpu.mmu.wait(gprs[rn] + gprs[rm]);
    };
  }

  constructSTRH1(rd: number, rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      const n = gprs[rn] + immediate;
      cpu.mmu.store16(n, gprs[rd]);
      cpu.mmu.wait(gprs[PC]);
      cpu.mmu.wait(n);
    };
  }

  constructSTRH2(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.store16(gprs[rn] + gprs[rm], gprs[rd]);
      cpu.mmu.wait(gprs[PC]);
      cpu.mmu.wait(gprs[rn] + gprs[rm]);
    };
  }

  constructSUB1(rd: number, rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const d = gprs[rn] - immediate;
      cpu.cpsrN = !!(d >> 31);
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = gprs[rn] >>> 0 >= immediate;
      cpu.cpsrV = !!(gprs[rn] >> 31 && (gprs[rn] ^ d) >> 31);
      gprs[rd] = d;
    };
  }

  constructSUB2(rn: number, immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const d = gprs[rn] - immediate;
      cpu.cpsrN = !!(d >> 31);
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = gprs[rn] >>> 0 >= immediate;
      cpu.cpsrV = !!(gprs[rn] >> 31 && (gprs[rn] ^ d) >> 31);
      gprs[rn] = d;
    };
  }

  constructSUB3(rd: number, rn: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const d = gprs[rn] - gprs[rm];
      cpu.cpsrN = !!(d >> 31);
      cpu.cpsrZ = !(d & 0xffffffff);
      cpu.cpsrC = gprs[rn] >>> 0 >= gprs[rm] >>> 0;
      cpu.cpsrV = gprs[rn] >> 31 != gprs[rm] >> 31 && gprs[rn] >> 31 != d >> 31;
      gprs[rd] = d;
    };
  }

  constructSWI(immediate: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.irq?.swi(immediate);
      cpu.mmu.waitPrefetch(gprs[PC]);
    };
  }

  constructTST(rd: number, rm: number): () => void {
    const cpu = this.cpu;
    const gprs = cpu.gprs;

    return () => {
      cpu.mmu.waitPrefetch(gprs[PC]);
      const aluOut = gprs[rd] & gprs[rm];
      cpu.cpsrN = !!(aluOut >> 31);
      cpu.cpsrZ = !(aluOut & 0xffffffff);
    };
  }
}
