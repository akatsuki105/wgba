import { ARMCoreArm } from './arm';
import { GameBoyAdvance } from './gba';
import { GameBoyAdvanceInterruptHandler } from './irq';
import { GameBoyAdvanceMMU, Page } from './mmu';
import { ARMCoreThumb } from './thumb';
import { printAddr } from 'src/utils';

export const SP = 13;
export const LR = 14;
export const PC = 15;

export const bank = {
  NONE: 0,
  FIQ: 1,
  IRQ: 2,
  SUPERVISOR: 3,
  ABORT: 4,
  UNDEFINED: 5,
} as const;

export const privMode = {
  USER: 0x10, // 0b10000
  FIQ: 0x11,
  IRQ: 0x12,
  SUPERVISOR: 0x13,
  ABORT: 0x17,
  UNDEFINED: 0x1b,
  SYSTEM: 0x1f, // 0b11111
} as const;

export const execMode = {
  ARM: 0,
  THUMB: 1,
} as const;

export const bitMask = {
  UNALLOC_MASK: 0x0fffff00,
  USER_MASK: 0xf000_0000,
  PRIV_MASK: 0x0000_00df, // This is out of spec, but it seems to be what's done in other implementations
  STATE_MASK: 0x0000_0020,
} as const;

const exceptionAddr = {
  RESET: 0x00000000,
  UNDEF: 0x00000004,
  SWI: 0x00000008,
  PABT: 0x0000000c,
  DABT: 0x00000010,
  IRQ: 0x00000018,
  FIQ: 0x0000001c,
} as const;

const wordSize = {
  ARM: 4,
  THUMB: 2,
} as const;

export class ARMCore {
  core: GameBoyAdvance;
  armCompiler: ARMCoreArm;
  thumbCompiler: ARMCoreThumb;
  gprs: Int32Array;
  mmu: GameBoyAdvanceMMU;
  irq?: GameBoyAdvanceInterruptHandler;

  loadInstruction: (addr: number) => any;
  execMode: number;
  instructionWidth: number;

  mode: number;

  cpsrI: boolean;
  cpsrF: boolean;
  cpsrV: boolean;
  cpsrC: boolean;
  cpsrZ: boolean;
  cpsrN: boolean;

  bankedRegisters: Int32Array[];

  spsr: number;
  bankedSPSRs: Int32Array;

  cycles: number;

  shifterOperand: number;
  shifterCarryOut: number;

  page: Page | null;
  pageId: number;
  pageRegion: number;
  instruction: any;
  step: () => void;

  pageMask: number;
  conds: ((() => boolean) | null)[];
  conditionPassed: boolean;

  constructor(core: GameBoyAdvance) {
    this.core = core;

    this.armCompiler = new ARMCoreArm(this);
    this.thumbCompiler = new ARMCoreThumb(this);
    this.conds = [];
    this.generateConds();

    this.gprs = new Int32Array(16);

    this.execMode = execMode.ARM;
    this.instructionWidth = wordSize.ARM;

    this.mode = privMode.SYSTEM;
    this.cpsrI = false;
    this.cpsrF = false;
    this.cpsrV = false;
    this.cpsrC = false;
    this.cpsrZ = false;
    this.cpsrN = false;

    this.bankedRegisters = [];

    this.spsr = 0;
    this.bankedSPSRs = new Int32Array();

    this.cycles = 0;

    this.shifterOperand = 0;
    this.shifterCarryOut = 0;

    this.page = null;
    this.pageId = 0;
    this.pageRegion = 0;
    this.instruction = null;
    this.step = () => {};

    this.pageMask = 0;
    this.conditionPassed = false;

    this.loadInstruction = (addr: number) => {};
    this.mmu = new GameBoyAdvanceMMU(this, core);
  }

  setComponent(mmu: GameBoyAdvanceMMU, irq: GameBoyAdvanceInterruptHandler) {
    this.mmu = mmu;
    this.irq = irq;
  }

  resetCPU(startOffset: number) {
    this.gprs.fill(0, 0, PC);
    this.gprs[PC] = startOffset + wordSize.ARM;

    this.loadInstruction = this.loadInstructionArm;
    this.execMode = execMode.ARM;
    this.instructionWidth = wordSize.ARM;

    this.mode = privMode.SYSTEM;

    this.cpsrI = false;
    this.cpsrF = false;

    this.cpsrV = false;
    this.cpsrC = false;
    this.cpsrZ = false;
    this.cpsrN = false;

    this.bankedRegisters = [
      new Int32Array(7),
      new Int32Array(7),
      new Int32Array(2),
      new Int32Array(2),
      new Int32Array(2),
      new Int32Array(2),
    ];
    this.spsr = 0;
    this.bankedSPSRs = new Int32Array(6);

    this.cycles = 0;

    this.shifterOperand = 0;
    this.shifterCarryOut = 0;

    this.page = null;
    this.pageId = 0;
    this.pageRegion = -1;

    this.instruction = null;

    this.irq?.clear();

    const gprs = this.gprs;
    const mmu = this.mmu;
    this.step = () => {
      if (!this.instruction) {
        this.instruction = this.loadInstruction(gprs[PC] - this.instructionWidth);
      }

      const pc = gprs[PC] - this.instructionWidth;
      if (([] as number[]).includes(pc)) {
        printAddr(pc);
      }

      // exec instruction
      const instruction = this.instruction;
      gprs[PC] += this.instructionWidth; // i.e. r15 = pc + 8
      this.conditionPassed = true;
      instruction();

      if (!instruction.writesPC) {
        if (this.instruction != null) {
          // We might have gotten an interrupt from the instruction
          if (instruction.next == null || instruction.next.page.invalid) {
            instruction.next = this.loadInstruction(gprs[PC] - this.instructionWidth);
          }
          this.instruction = instruction.next;
        }
      } else {
        // flush the pipeline
        if (this.conditionPassed && mmu) {
          const pc = (gprs[PC] &= 0xfffffffe);
          if (this.execMode == execMode.ARM) {
            mmu.wait32(pc);
            mmu.waitPrefetch32(pc);
          } else {
            mmu.wait(pc);
            mmu.waitPrefetch(pc);
          }
          gprs[PC] += this.instructionWidth;
          if (!instruction.fixedJump) {
            this.instruction = null;
          } else if (this.instruction != null) {
            if (instruction.next == null || instruction.next.page.invalid) {
              instruction.next = this.loadInstruction(gprs[PC] - this.instructionWidth);
            }
            this.instruction = instruction.next;
          }
        } else {
          this.instruction = null;
        }
      }
      this.irq?.updateTimers();
    };
  }

  freeze(): any {
    return {
      gprs: [
        this.gprs[0],
        this.gprs[1],
        this.gprs[2],
        this.gprs[3],
        this.gprs[4],
        this.gprs[5],
        this.gprs[6],
        this.gprs[7],
        this.gprs[8],
        this.gprs[9],
        this.gprs[10],
        this.gprs[11],
        this.gprs[12],
        this.gprs[13],
        this.gprs[14],
        this.gprs[15],
      ],
      mode: this.mode,
      cpsrI: this.cpsrI,
      cpsrF: this.cpsrF,
      cpsrV: this.cpsrV,
      cpsrC: this.cpsrC,
      cpsrZ: this.cpsrZ,
      cpsrN: this.cpsrN,
      bankedRegisters: [
        [
          this.bankedRegisters[0][0],
          this.bankedRegisters[0][1],
          this.bankedRegisters[0][2],
          this.bankedRegisters[0][3],
          this.bankedRegisters[0][4],
          this.bankedRegisters[0][5],
          this.bankedRegisters[0][6],
        ],
        [
          this.bankedRegisters[1][0],
          this.bankedRegisters[1][1],
          this.bankedRegisters[1][2],
          this.bankedRegisters[1][3],
          this.bankedRegisters[1][4],
          this.bankedRegisters[1][5],
          this.bankedRegisters[1][6],
        ],
        [this.bankedRegisters[2][0], this.bankedRegisters[2][1]],
        [this.bankedRegisters[3][0], this.bankedRegisters[3][1]],
        [this.bankedRegisters[4][0], this.bankedRegisters[4][1]],
        [this.bankedRegisters[5][0], this.bankedRegisters[5][1]],
      ],
      spsr: this.spsr,
      bankedSPSRs: [
        this.bankedSPSRs[0],
        this.bankedSPSRs[1],
        this.bankedSPSRs[2],
        this.bankedSPSRs[3],
        this.bankedSPSRs[4],
        this.bankedSPSRs[5],
      ],
      cycles: this.cycles,
    };
  }

  defrost(frost: any) {
    this.instruction = null;

    this.page = null;
    this.pageId = 0;
    this.pageRegion = -1;

    this.gprs[0] = frost.gprs[0];
    this.gprs[1] = frost.gprs[1];
    this.gprs[2] = frost.gprs[2];
    this.gprs[3] = frost.gprs[3];
    this.gprs[4] = frost.gprs[4];
    this.gprs[5] = frost.gprs[5];
    this.gprs[6] = frost.gprs[6];
    this.gprs[7] = frost.gprs[7];
    this.gprs[8] = frost.gprs[8];
    this.gprs[9] = frost.gprs[9];
    this.gprs[10] = frost.gprs[10];
    this.gprs[11] = frost.gprs[11];
    this.gprs[12] = frost.gprs[12];
    this.gprs[13] = frost.gprs[13];
    this.gprs[14] = frost.gprs[14];
    this.gprs[15] = frost.gprs[15];

    this.mode = frost.mode;
    this.cpsrI = frost.cpsrI;
    this.cpsrF = frost.cpsrF;
    this.cpsrV = frost.cpsrV;
    this.cpsrC = frost.cpsrC;
    this.cpsrZ = frost.cpsrZ;
    this.cpsrN = frost.cpsrN;

    this.bankedRegisters[0][0] = frost.bankedRegisters[0][0];
    this.bankedRegisters[0][1] = frost.bankedRegisters[0][1];
    this.bankedRegisters[0][2] = frost.bankedRegisters[0][2];
    this.bankedRegisters[0][3] = frost.bankedRegisters[0][3];
    this.bankedRegisters[0][4] = frost.bankedRegisters[0][4];
    this.bankedRegisters[0][5] = frost.bankedRegisters[0][5];
    this.bankedRegisters[0][6] = frost.bankedRegisters[0][6];

    this.bankedRegisters[1][0] = frost.bankedRegisters[1][0];
    this.bankedRegisters[1][1] = frost.bankedRegisters[1][1];
    this.bankedRegisters[1][2] = frost.bankedRegisters[1][2];
    this.bankedRegisters[1][3] = frost.bankedRegisters[1][3];
    this.bankedRegisters[1][4] = frost.bankedRegisters[1][4];
    this.bankedRegisters[1][5] = frost.bankedRegisters[1][5];
    this.bankedRegisters[1][6] = frost.bankedRegisters[1][6];

    this.bankedRegisters[2][0] = frost.bankedRegisters[2][0];
    this.bankedRegisters[2][1] = frost.bankedRegisters[2][1];

    this.bankedRegisters[3][0] = frost.bankedRegisters[3][0];
    this.bankedRegisters[3][1] = frost.bankedRegisters[3][1];

    this.bankedRegisters[4][0] = frost.bankedRegisters[4][0];
    this.bankedRegisters[4][1] = frost.bankedRegisters[4][1];

    this.bankedRegisters[5][0] = frost.bankedRegisters[5][0];
    this.bankedRegisters[5][1] = frost.bankedRegisters[5][1];

    this.spsr = frost.spsr;
    this.bankedSPSRs[0] = frost.bankedSPSRs[0];
    this.bankedSPSRs[1] = frost.bankedSPSRs[1];
    this.bankedSPSRs[2] = frost.bankedSPSRs[2];
    this.bankedSPSRs[3] = frost.bankedSPSRs[3];
    this.bankedSPSRs[4] = frost.bankedSPSRs[4];
    this.bankedSPSRs[5] = frost.bankedSPSRs[5];

    this.cycles = frost.cycles;
  }

  fetchPage(address: number) {
    if (!this.mmu) return;
    const region = address >> this.mmu.BASE_OFFSET;
    const pageId = this.mmu.addressToPage(region, address & this.mmu.OFFSET_MASK);
    if (region == this.pageRegion) {
      if (pageId == this.pageId && !this.page?.invalid) return;
      this.pageId = pageId;
    } else {
      this.pageMask = this.mmu.memory[region].PAGE_MASK;
      this.pageRegion = region;
      this.pageId = pageId;
    }

    this.page = this.mmu.accessPage(region, pageId);
  }

  loadInstructionArm(address: number) {
    this.fetchPage(address);
    const offset = (address & this.pageMask) >> 2;

    if (!this.page) return;
    let next = this.page.arm[offset] || null;
    if (next) return next;

    const instruction = this.mmu?.load32(address) >>> 0;
    next = this.compileArm(instruction);
    next.next = null;
    next.page = this.page;
    next.address = address;
    next.opcode = instruction;
    this.page.arm[offset] = next;

    return next;
  }

  loadInstructionThumb(address: number) {
    let next = null;
    this.fetchPage(address);
    const offset = (address & this.pageMask) >> 1;

    if (!this.page) return;
    next = this.page.thumb[offset];
    if (next) return next;

    const instruction = this.mmu?.load16(address);
    next = this.compileThumb(instruction);
    next.next = null;
    next.page = this.page;
    next.address = address;
    next.opcode = instruction;
    this.page.thumb[offset] = next;

    return next;
  }

  selectBank(mode: number) {
    switch (mode) {
      case privMode.USER:
      case privMode.SYSTEM:
        // No banked registers
        return bank.NONE;
      case privMode.FIQ:
        return bank.FIQ;
      case privMode.IRQ:
        return bank.IRQ;
      case privMode.SUPERVISOR:
        return bank.SUPERVISOR;
      case privMode.ABORT:
        return bank.ABORT;
      case privMode.UNDEFINED:
        return bank.UNDEFINED;
      default:
        console.error(`Invalid user mode passed to selectBank: ${mode}`);

        return bank.NONE;
    }
  }

  switchExecMode(newMode: number) {
    if (this.execMode != newMode) {
      this.execMode = newMode;
      if (newMode == execMode.ARM) {
        this.instructionWidth = wordSize.ARM;
        this.loadInstruction = this.loadInstructionArm;
      } else {
        this.instructionWidth = wordSize.THUMB;
        this.loadInstruction = this.loadInstructionThumb;
      }
    }
  }

  switchMode(newMode: number) {
    if (newMode == this.mode) return; // Not switching modes after all

    // Switch banked registers
    const newBank = this.selectBank(newMode);
    const oldBank = this.selectBank(this.mode);
    if (newBank != oldBank) {
      // TODO: support FIQ
      if (newMode == privMode.FIQ || this.mode == privMode.FIQ) {
        const oldFiqBank = Number(oldBank == bank.FIQ) + 0;
        const newFiqBank = Number(newBank == bank.FIQ) + 0;
        this.bankedRegisters[oldFiqBank][2] = this.gprs[8];
        this.bankedRegisters[oldFiqBank][3] = this.gprs[9];
        this.bankedRegisters[oldFiqBank][4] = this.gprs[10];
        this.bankedRegisters[oldFiqBank][5] = this.gprs[11];
        this.bankedRegisters[oldFiqBank][6] = this.gprs[12];
        this.gprs[8] = this.bankedRegisters[newFiqBank][2];
        this.gprs[9] = this.bankedRegisters[newFiqBank][3];
        this.gprs[10] = this.bankedRegisters[newFiqBank][4];
        this.gprs[11] = this.bankedRegisters[newFiqBank][5];
        this.gprs[12] = this.bankedRegisters[newFiqBank][6];
      }
      this.bankedRegisters[oldBank][0] = this.gprs[SP];
      this.bankedRegisters[oldBank][1] = this.gprs[LR];
      this.gprs[SP] = this.bankedRegisters[newBank][0];
      this.gprs[LR] = this.bankedRegisters[newBank][1];

      this.bankedSPSRs[oldBank] = this.spsr;
      this.spsr = this.bankedSPSRs[newBank];
    }
    this.mode = newMode;
  }

  packCPSR(): number {
    return (
      this.mode |
      (Number(!!this.execMode) << 5) |
      (Number(!!this.cpsrF) << 6) |
      (Number(!!this.cpsrI) << 7) |
      (Number(!!this.cpsrN) << 31) |
      (Number(!!this.cpsrZ) << 30) |
      (Number(!!this.cpsrC) << 29) |
      (Number(!!this.cpsrV) << 28)
    );
  }

  unpackCPSR(spsr: number) {
    this.switchMode(spsr & 0x0000001f);
    this.switchExecMode(Number(!!(spsr & 0x00000020)));
    this.cpsrF = !!(spsr & 0x00000040);
    this.cpsrI = !!(spsr & 0x00000080);
    this.cpsrN = !!(spsr & 0x80000000);
    this.cpsrZ = !!(spsr & 0x40000000);
    this.cpsrC = !!(spsr & 0x20000000);
    this.cpsrV = !!(spsr & 0x10000000);

    this.irq?.testIRQ();
  }

  hasSPSR(): boolean {
    return this.mode != privMode.SYSTEM && this.mode != privMode.USER;
  }

  raiseIRQ() {
    if (this.cpsrI) return;
    const cpsr = this.packCPSR();
    const instructionWidth = this.instructionWidth;
    this.switchMode(privMode.IRQ);
    this.spsr = cpsr;
    this.gprs[LR] = this.gprs[PC] - instructionWidth + 4;
    this.gprs[PC] = exceptionAddr.IRQ + wordSize.ARM;
    this.instruction = null;
    this.switchExecMode(execMode.ARM);
    this.cpsrI = true;
  }

  raiseTrap() {
    const cpsr = this.packCPSR();
    const instructionWidth = this.instructionWidth;
    this.switchMode(privMode.SUPERVISOR);
    this.spsr = cpsr;
    this.gprs[LR] = this.gprs[PC] - instructionWidth;
    this.gprs[PC] = exceptionAddr.SWI + wordSize.ARM;
    this.instruction = null;
    this.switchExecMode(execMode.ARM);
    this.cpsrI = true;
  }

  badOp(instruction: number) {
    const func = () => {
      throw 'Illegal instruction: 0x' + instruction.toString(16);
    };
    func.writesPC = true;
    func.fixedJump = false;

    return func;
  }

  generateConds() {
    const cpu = this; // eslint-disable-line
    this.conds = [
      // EQ
      (): boolean => {
        return (cpu.conditionPassed = cpu.cpsrZ);
      },
      // NE
      (): boolean => {
        return (cpu.conditionPassed = !cpu.cpsrZ);
      },
      // CS
      (): boolean => {
        return (cpu.conditionPassed = cpu.cpsrC);
      },
      // CC
      (): boolean => {
        return (cpu.conditionPassed = !cpu.cpsrC);
      },
      // MI
      (): boolean => {
        return (cpu.conditionPassed = cpu.cpsrN);
      },
      // PL
      (): boolean => {
        return (cpu.conditionPassed = !cpu.cpsrN);
      },
      // VS
      (): boolean => {
        return (cpu.conditionPassed = cpu.cpsrV);
      },
      // VC
      (): boolean => {
        return (cpu.conditionPassed = !cpu.cpsrV);
      },
      // HI
      (): boolean => {
        return (cpu.conditionPassed = cpu.cpsrC && !cpu.cpsrZ);
      },
      // LS
      (): boolean => {
        return (cpu.conditionPassed = !cpu.cpsrC || cpu.cpsrZ);
      },
      // GE
      (): boolean => {
        return (cpu.conditionPassed = !cpu.cpsrN == !cpu.cpsrV);
      },
      // LT
      (): boolean => {
        return (cpu.conditionPassed = !cpu.cpsrN != !cpu.cpsrV);
      },
      // GT
      (): boolean => {
        return (cpu.conditionPassed = !cpu.cpsrZ && !cpu.cpsrN == !cpu.cpsrV);
      },
      // LE
      (): boolean => {
        return (cpu.conditionPassed = cpu.cpsrZ || !cpu.cpsrN != !cpu.cpsrV);
      },
      // AL
      null,
      null,
    ];
  }

  barrelShiftImmediate(shiftType: number, immediate: number, rm: number) {
    const cpu = this; // eslint-disable-line
    const gprs = this.gprs;
    let shiftOp: any = this.badOp;
    switch (shiftType) {
      case 0x00000000: {
        // LSL
        if (immediate) {
          shiftOp = () => {
            cpu.shifterOperand = gprs[rm] << immediate;
            cpu.shifterCarryOut = gprs[rm] & (1 << (32 - immediate));
          };
        } else {
          // This boils down to no shift
          shiftOp = () => {
            cpu.shifterOperand = gprs[rm];
            cpu.shifterCarryOut = Number(cpu.cpsrC);
          };
        }
        break;
      }
      case 0x00000020: {
        // LSR
        if (immediate) {
          shiftOp = () => {
            cpu.shifterOperand = gprs[rm] >>> immediate;
            cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
          };
        } else {
          shiftOp = () => {
            cpu.shifterOperand = 0;
            cpu.shifterCarryOut = gprs[rm] & 0x80000000;
          };
        }
        break;
      }
      case 0x00000040: {
        // ASR
        if (immediate) {
          shiftOp = () => {
            cpu.shifterOperand = gprs[rm] >> immediate;
            cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
          };
        } else {
          shiftOp = () => {
            cpu.shifterCarryOut = gprs[rm] & 0x80000000;
            if (cpu.shifterCarryOut) {
              cpu.shifterOperand = 0xffffffff;
            } else {
              cpu.shifterOperand = 0;
            }
          };
        }
        break;
      }
      case 0x00000060: {
        // ROR
        if (immediate) {
          shiftOp = () => {
            cpu.shifterOperand = (gprs[rm] >>> immediate) | (gprs[rm] << (32 - immediate));
            cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
          };
        } else {
          // RRX
          shiftOp = () => {
            cpu.shifterOperand = (Number(cpu.cpsrC) << 31) | (gprs[rm] >>> 1);
            cpu.shifterCarryOut = gprs[rm] & 0x00000001;
          };
        }
        break;
      }
    }

    return shiftOp;
  }

  compileArm(instruction: number) {
    let op: any = this.badOp(instruction);
    const i = instruction & 0x0e000000;

    const condOp = this.conds[(instruction & 0xf0000000) >>> 28] || undefined;
    if ((instruction & 0x0ffffff0) == 0x012fff10) {
      // BX
      const rm = instruction & 0xf;
      op = this.armCompiler.constructBX(rm, condOp);
      op.writesPC = true;
      op.fixedJump = false;
    } else if (
      !(instruction & 0x0c000000) &&
      (i == 0x02000000 || (instruction & 0x00000090) != 0x00000090)
    ) {
      const opcode = instruction & 0x01e00000;
      const s = instruction & 0x00100000;
      if ((opcode & 0x01800000) == 0x01000000 && !s) {
        const r = instruction & 0x00400000;
        if ((instruction & 0x00b0f000) == 0x0020f000) {
          // MSR
          const rm = instruction & 0x0000000f;
          let immediate = instruction & 0x000000ff;
          const rotateImm = (instruction & 0x00000f00) >> 7;
          immediate = (immediate >>> rotateImm) | (immediate << (32 - rotateImm));
          op = this.armCompiler.constructMSR(rm, r, instruction, immediate, condOp);
          op.writesPC = false;
        } else if ((instruction & 0x00bf0000) == 0x000f0000) {
          // MRS
          const rd = (instruction & 0x0000f000) >> 12;
          op = this.armCompiler.constructMRS(rd, r, condOp);
          op.writesPC = rd == PC;
        }
      } else {
        // Data processing/FSR transfer
        const rn = (instruction & 0x000f0000) >> 16;
        const rd = (instruction & 0x0000f000) >> 12;

        // Parse shifter operand
        const shiftType = instruction & 0x00000060;
        const rm = instruction & 0x0000000f;
        let shiftOp: any = () => {
          throw 'BUG: invalid barrel shifter';
        };

        let isShiftByRegister = false;
        if (instruction & 0x0200_0000) {
          // shift by immediate
          const immediate = instruction & 0x000000ff;
          const rotate = (instruction & 0x00000f00) >> 7;
          if (!rotate) {
            shiftOp = this.armCompiler.constructAddressingMode1Immediate(immediate);
          } else {
            shiftOp = this.armCompiler.constructAddressingMode1ImmediateRotate(immediate, rotate);
          }
        } else if (instruction & 0x00000010) {
          // shift by register
          const rs = (instruction & 0x00000f00) >> 8; // register contains shift amount
          isShiftByRegister = true;
          switch (shiftType) {
            case 0x00000000:
              // LSL
              shiftOp = this.armCompiler.constructAddressingMode1LSL(rs, rm); // rm lsl#rs
              break;
            case 0x00000020:
              // LSR
              shiftOp = this.armCompiler.constructAddressingMode1LSR(rs, rm);
              break;
            case 0x00000040:
              // ASR
              shiftOp = this.armCompiler.constructAddressingMode1ASR(rs, rm);
              break;
            case 0x00000060:
              // ROR
              shiftOp = this.armCompiler.constructAddressingMode1ROR(rs, rm);
              break;
          }
        } else {
          const immediate = (instruction & 0x00000f80) >> 7;
          shiftOp = this.barrelShiftImmediate(shiftType, immediate, rm);
        }

        let isBadTst = false; // https://github.com/jsmolka/gba-tests/blob/a6447c5404c8fc2898ddc51f438271f832083b7e/arm/data_processing.asm#L495
        switch (opcode) {
          case 0x00000000: {
            // AND
            if (s) {
              op = this.armCompiler.constructANDS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructAND(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x00200000: {
            // EOR
            if (s) {
              op = this.armCompiler.constructEORS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructEOR(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x00400000: {
            // SUB
            if (s) {
              op = this.armCompiler.constructSUBS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructSUB(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x00600000: {
            // RSB
            if (s) {
              op = this.armCompiler.constructRSBS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructRSB(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x00800000: {
            // ADD
            if (s) {
              op = this.armCompiler.constructADDS(rd, rn, isShiftByRegister, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructADD(rd, rn, isShiftByRegister, shiftOp, condOp);
            }
            break;
          }
          case 0x00a00000: {
            // ADC
            if (s) {
              op = this.armCompiler.constructADCS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructADC(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x00c00000: {
            // SBC
            if (s) {
              op = this.armCompiler.constructSBCS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructSBC(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x00e00000: {
            // RSC
            if (s) {
              op = this.armCompiler.constructRSCS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructRSC(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x01000000: {
            // TST
            isBadTst = rd === PC;
            op = this.armCompiler.constructTST(rd, rn, shiftOp, condOp);
            break;
          }
          case 0x01200000: {
            // TEQ
            isBadTst = rd === PC;
            op = this.armCompiler.constructTEQ(rd, rn, shiftOp, condOp);
            break;
          }
          case 0x01400000: {
            // CMP
            isBadTst = rd === PC;
            op = this.armCompiler.constructCMP(rd, rn, shiftOp, condOp);
            break;
          }
          case 0x01600000: {
            // CMN
            isBadTst = rd === PC;
            op = this.armCompiler.constructCMN(rd, rn, shiftOp, condOp);
            break;
          }
          case 0x01800000: {
            // ORR
            if (s) {
              op = this.armCompiler.constructORRS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructORR(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x01a00000: {
            // MOV
            if (s) {
              op = this.armCompiler.constructMOVS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructMOV(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x01c00000: {
            // BIC
            if (s) {
              op = this.armCompiler.constructBICS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructBIC(rd, rn, shiftOp, condOp);
            }
            break;
          }
          case 0x01e00000: {
            // MVN
            if (s) {
              op = this.armCompiler.constructMVNS(rd, rn, shiftOp, condOp);
            } else {
              op = this.armCompiler.constructMVN(rd, rn, shiftOp, condOp);
            }
            break;
          }
        }
        op.writesPC = rd == PC;
        if (isBadTst) op.writesPC = false;
      }
    } else if ((instruction & 0x0fb00ff0) == 0x01000090) {
      // Single data swap
      const rm = instruction & 0x0000000f;
      const rd = (instruction >> 12) & 0x0000000f;
      const rn = (instruction >> 16) & 0x0000000f;
      if (instruction & 0x00400000) {
        op = this.armCompiler.constructSWPB(rd, rn, rm, condOp);
      } else {
        op = this.armCompiler.constructSWP(rd, rn, rm, condOp);
      }
      op.writesPC = rd == PC;
    } else {
      switch (i) {
        case 0x00000000: {
          if ((instruction & 0x010000f0) == 0x00000090) {
            // Multiplies
            const rd = (instruction & 0x000f0000) >> 16;
            const rn = (instruction & 0x0000f000) >> 12;
            const rs = (instruction & 0x00000f00) >> 8;
            const rm = instruction & 0x0000000f;
            switch (instruction & 0x00f00000) {
              case 0x00000000:
                // MUL
                op = this.armCompiler.constructMUL(rd, rs, rm, condOp);
                break;
              case 0x00100000:
                // MULS
                op = this.armCompiler.constructMULS(rd, rs, rm, condOp);
                break;
              case 0x00200000:
                // MLA
                op = this.armCompiler.constructMLA(rd, rn, rs, rm, condOp);
                break;
              case 0x00300000:
                // MLAS
                op = this.armCompiler.constructMLAS(rd, rn, rs, rm, condOp);
                break;
              case 0x00800000:
                // UMULL
                op = this.armCompiler.constructUMULL(rd, rn, rs, rm, condOp);
                break;
              case 0x00900000:
                // UMULLS
                op = this.armCompiler.constructUMULLS(rd, rn, rs, rm, condOp);
                break;
              case 0x00a00000:
                // UMLAL
                op = this.armCompiler.constructUMLAL(rd, rn, rs, rm, condOp);
                break;
              case 0x00b00000:
                // UMLALS
                op = this.armCompiler.constructUMLALS(rd, rn, rs, rm, condOp);
                break;
              case 0x00c00000:
                // SMULL
                op = this.armCompiler.constructSMULL(rd, rn, rs, rm, condOp);
                break;
              case 0x00d00000:
                // SMULLS
                op = this.armCompiler.constructSMULLS(rd, rn, rs, rm, condOp);
                break;
              case 0x00e00000:
                // SMLAL
                op = this.armCompiler.constructSMLAL(rd, rn, rs, rm, condOp);
                break;
              case 0x00f00000:
                // SMLALS
                op = this.armCompiler.constructSMLALS(rd, rn, rs, rm, condOp);
                break;
            }
            op.writesPC = rd == PC;
          } else {
            // Halfword and signed byte data transfer
            const rm = instruction & 0x0000000f;
            const load = instruction & (0b1 << 20);
            const rn = (instruction & 0x000f0000) >> 16;
            const rd = (instruction & 0x0000f000) >> 12;
            const hiOffset = (instruction & 0x00000f00) >> 4;
            const loOffset = rm;
            const h = instruction & 0x00000020;
            const s = instruction & 0x00000040;
            const w = instruction & 0x00200000;
            const i = instruction & 0x00400000;

            let address: any;
            if (i) {
              const immediate = loOffset | hiOffset;
              address = this.armCompiler.constructAddressingMode23Immediate(
                instruction,
                immediate,
                condOp,
              );
            } else {
              address = this.armCompiler.constructAddressingMode23Register(instruction, rm, condOp);
            }
            address && (address.writesPC = !!w && rn == PC);

            if ((instruction & 0x00000090) == 0x00000090) {
              if (load) {
                // Load [signed] halfword/byte
                if (h) {
                  if (s) {
                    // LDRSH
                    op = this.armCompiler.constructLDRSH(rd, address, condOp);
                  } else {
                    // LDRH
                    op = this.armCompiler.constructLDRH(rd, address, condOp);
                  }
                } else {
                  if (s) {
                    // LDRSB
                    op = this.armCompiler.constructLDRSB(rd, address, condOp);
                  }
                }
              } else if (!s && h) {
                // STRH
                op = this.armCompiler.constructSTRH(rd, address, condOp);
              }
            }
            op.writesPC = rd == PC || address.writesPC;
          }
          break;
        }
        case 0x04000000: {
        }
        case 0x06000000: {
          // LDR/STR
          const rd = (instruction & 0x0000_f000) >> 12;
          const load = instruction & (0b1 << 20);
          const b = instruction & (0b1 << 22); // load unit, 0 => 32bit, 1 => 8bit
          const i = instruction & (0b1 << 25); // 0 => immediate, 1 => register
          const p = instruction & (0b1 << 24); // 0 => post, 1 => pre
          const w = instruction & (0b1 << 21); // Is WriteBack enabled?

          let address: any = () => {
            throw 'Unimplemented memory access: 0x' + instruction.toString(16);
          };

          if (~instruction & 0x0100_0000) {
            // Clear the W bit if the P bit is clear--we don't support memory translation, so these turn into regular accesses
            instruction &= 0xffdfffff;
          }

          if (i) {
            // Register offset (e.g. str r13, [r1, r2])
            const rm = instruction & 0x0000000f;
            const shiftType = instruction & 0x00000060; // bit5-6
            const shiftImmediate = (instruction & 0x00000f80) >> 7;

            if (shiftType || shiftImmediate) {
              // e.g. str r13, [r1, r2 lsr#4]
              const shiftOp = this.barrelShiftImmediate(shiftType, shiftImmediate, rm);
              address = this.armCompiler.constructAddressingMode2RegisterShifted(
                instruction,
                shiftOp,
                condOp,
              );
            } else {
              // lsl#0 -> no shift
              address = this.armCompiler.constructAddressingMode23Register(instruction, rm, condOp);
            }
          } else {
            // Immediate e.g. str r13, [r1, 4]
            const offset = instruction & 0x00000fff;
            address = this.armCompiler.constructAddressingMode23Immediate(
              instruction,
              offset,
              condOp,
            );
          }

          if (load) {
            if (b) {
              // LDRB
              op = this.armCompiler.constructLDRB(rd, address, condOp);
            } else {
              // LDR
              op = this.armCompiler.constructLDR(rd, address, condOp);
            }
            op.writesPC = rd == PC || address.writesPC;
          } else {
            if (b) {
              // STRB
              op = this.armCompiler.constructSTRB(rd, address, condOp);
            } else {
              // STR
              op = this.armCompiler.constructSTR(rd, address, condOp);
            }
            op.writesPC = address.writesPC; // storing PC doesn't affect pipeline
          }
          break;
        }

        case 0x08000000: {
          // Block data transfer
          const load = instruction & (0b1 << 20);
          const w = instruction & (0b1 << 21);
          const user = instruction & (0b1 << 22);
          const u = instruction & (0b1 << 23);
          const p = instruction & (0b1 << 24);
          let rs = instruction & 0x0000_ffff; // rlist
          const rn = (instruction & 0x000f_0000) >> 16; // bit19-16

          let address;
          let immediate = 0;
          let offset = 0;
          let overlap = false;
          if (u) {
            if (p) immediate = 4; // increment before or decrement before

            // i: target bit index, m: target bit mask (= 0b1 << i)
            for (let m = 0x01, i = 0; i < 16; m <<= 1, ++i) {
              if (rs & m) {
                if (w && i == rn && !offset) {
                  // same register?
                  rs &= ~m;
                  immediate += 4;
                  overlap = true;
                }
                offset += 4;
              }
            }
          } else {
            if (!p) immediate = 4;
            for (let m = 0x01, i = 0; i < 16; m <<= 1, ++i) {
              if (rs & m) {
                if (w && i == rn && !offset) {
                  rs &= ~m;
                  immediate += 4;
                  overlap = true;
                }
                immediate -= 4;
                offset -= 4;
              }
            }
          }

          if (w) {
            address = this.armCompiler.constructAddressingMode4Writeback(
              immediate,
              offset,
              rn,
              overlap,
            );
          } else {
            address = this.armCompiler.constructAddressingMode4(immediate, rn);
          }

          if (load) {
            // LDM
            if (user) {
              op = this.armCompiler.constructLDMS(rs, address, condOp);
            } else {
              op = this.armCompiler.constructLDM(rs, address, condOp);
            }
            op.writesPC = !!(rs & (1 << 15));
          } else {
            // STM
            if (user) {
              op = this.armCompiler.constructSTMS(rs, address, condOp);
            } else {
              op = this.armCompiler.constructSTM(rs, address, condOp);
            }
            op.writesPC = false;
          }
          break;
        }
        case 0x0a000000: {
          // Branch
          let immediate = instruction & 0x00ffffff;
          if (immediate & 0x00800000) immediate |= 0xff000000;
          immediate <<= 2;

          const link = instruction & 0x01000000;
          if (link) {
            op = this.armCompiler.constructBL(immediate, condOp);
          } else {
            op = this.armCompiler.constructB(immediate, condOp);
          }
          op.writesPC = true;
          op.fixedJump = true;
          break;
        }
        case 0x0c000000: {
          // Coprocessor data transfer
          break;
        }
        case 0x0e000000: {
          // Coprocessor data operation/SWI
          if ((instruction & 0x0f000000) == 0x0f000000) {
            // SWI
            const immediate = instruction & 0x00ffffff;
            op = this.armCompiler.constructSWI(immediate, condOp);
            op.writesPC = false;
          }
          break;
        }
        default: {
          throw 'Bad opcode: 0x' + instruction.toString(16);
        }
      }
    }

    op.execMode = execMode.ARM;
    op.fixedJump = op.fixedJump || false;

    return op;
  }

  compileThumb(instruction: number) {
    let op: any = this.badOp(instruction & 0xffff);

    if ((instruction & 0xfc00) == 0x4000) {
      // Data-processing register
      const rm = (instruction & 0x0038) >> 3;
      const rd = instruction & 0x0007;
      switch (instruction & 0x03c0) {
        case 0x0000:
          // AND
          op = this.thumbCompiler.constructAND(rd, rm);
          break;
        case 0x0040:
          // EOR
          op = this.thumbCompiler.constructEOR(rd, rm);
          break;
        case 0x0080:
          // LSL(2)
          op = this.thumbCompiler.constructLSL2(rd, rm);
          break;
        case 0x00c0:
          // LSR(2)
          op = this.thumbCompiler.constructLSR2(rd, rm);
          break;
        case 0x0100:
          // ASR(2)
          op = this.thumbCompiler.constructASR2(rd, rm);
          break;
        case 0x0140:
          // ADC
          op = this.thumbCompiler.constructADC(rd, rm);
          break;
        case 0x0180:
          // SBC
          op = this.thumbCompiler.constructSBC(rd, rm);
          break;
        case 0x01c0:
          // ROR
          op = this.thumbCompiler.constructROR(rd, rm);
          break;
        case 0x0200:
          // TST
          op = this.thumbCompiler.constructTST(rd, rm);
          break;
        case 0x0240:
          // NEG
          op = this.thumbCompiler.constructNEG(rd, rm);
          break;
        case 0x0280:
          // CMP(2)
          op = this.thumbCompiler.constructCMP2(rd, rm);
          break;
        case 0x02c0:
          // CMN
          op = this.thumbCompiler.constructCMN(rd, rm);
          break;
        case 0x0300:
          // ORR
          op = this.thumbCompiler.constructORR(rd, rm);
          break;
        case 0x0340:
          // MUL
          op = this.thumbCompiler.constructMUL(rd, rm);
          break;
        case 0x0380:
          // BIC
          op = this.thumbCompiler.constructBIC(rd, rm);
          break;
        case 0x03c0:
          // MVN
          op = this.thumbCompiler.constructMVN(rd, rm);
          break;
      }
      op.writesPC = false;
    } else if ((instruction & 0xfc00) == 0x4400) {
      // Special data processing / branch/exchange instruction set
      const rm = (instruction & 0x0078) >> 3;
      const rn = instruction & 0x0007;
      const h1 = instruction & 0x0080;
      const rd = rn | (h1 >> 4);
      switch (instruction & 0x0300) {
        case 0x0000:
          // ADD(4)
          op = this.thumbCompiler.constructADD4(rd, rm);
          op.writesPC = rd == PC;
          break;
        case 0x0100:
          // CMP(3)
          op = this.thumbCompiler.constructCMP3(rd, rm);
          op.writesPC = false;
          break;
        case 0x0200:
          // MOV(3)
          op = this.thumbCompiler.constructMOV3(rd, rm);
          op.writesPC = rd == PC;
          break;
        case 0x0300:
          // BX
          op = this.thumbCompiler.constructBX(rd, rm);
          op.writesPC = true;
          op.fixedJump = false;
          break;
      }
    } else if ((instruction & 0xf800) == 0x1800) {
      // Add/subtract
      const rm = (instruction & 0x01c0) >> 6;
      const rn = (instruction & 0x0038) >> 3;
      const rd = instruction & 0x0007;
      switch (instruction & 0x0600) {
        case 0x0000: {
          // ADD(3)
          op = this.thumbCompiler.constructADD3(rd, rn, rm);
          break;
        }
        case 0x0200: {
          // SUB(3)
          op = this.thumbCompiler.constructSUB3(rd, rn, rm);
          break;
        }
        case 0x0400: {
          const immediate = (instruction & 0x01c0) >> 6;
          if (immediate) {
            // ADD(1)
            op = this.thumbCompiler.constructADD1(rd, rn, immediate);
          } else {
            // MOV(2)
            op = this.thumbCompiler.constructMOV2(rd, rn, rm);
          }
          break;
        }
        case 0x0600: {
          // SUB(1)
          const immediate = (instruction & 0x01c0) >> 6;
          op = this.thumbCompiler.constructSUB1(rd, rn, immediate);
          break;
        }
      }
      op.writesPC = false;
    } else if (!(instruction & 0xe000)) {
      // Shift by immediate
      const rd = instruction & 0x0007;
      const rm = (instruction & 0x0038) >> 3;
      const immediate = (instruction & 0x07c0) >> 6;
      switch (instruction & 0x1800) {
        case 0x0000:
          // LSL(1)
          op = this.thumbCompiler.constructLSL1(rd, rm, immediate);
          break;
        case 0x0800:
          // LSR(1)
          op = this.thumbCompiler.constructLSR1(rd, rm, immediate);
          break;
        case 0x1000:
          // ASR(1)
          op = this.thumbCompiler.constructASR1(rd, rm, immediate);
          break;
        case 0x1800:
          break;
      }
      op.writesPC = false;
    } else if ((instruction & 0xe000) == 0x2000) {
      // Add/subtract/compare/move immediate
      const immediate = instruction & 0x00ff;
      const rn = (instruction & 0x0700) >> 8;
      switch (instruction & 0x1800) {
        case 0x0000:
          // MOV(1)
          op = this.thumbCompiler.constructMOV1(rn, immediate);
          break;
        case 0x0800:
          // CMP(1)
          op = this.thumbCompiler.constructCMP1(rn, immediate);
          break;
        case 0x1000:
          // ADD(2)
          op = this.thumbCompiler.constructADD2(rn, immediate);
          break;
        case 0x1800:
          // SUB(2)
          op = this.thumbCompiler.constructSUB2(rn, immediate);
          break;
      }
      op.writesPC = false;
    } else if ((instruction & 0xf800) == 0x4800) {
      // LDR(3)
      const rd = (instruction & 0x0700) >> 8;
      const immediate = (instruction & 0x00ff) << 2;
      op = this.thumbCompiler.constructLDR3(rd, immediate);
      op.writesPC = false;
    } else if ((instruction & 0xf000) == 0x5000) {
      // Load and store with relative offset
      const rd = instruction & 0x0007;
      const rn = (instruction & 0x0038) >> 3;
      const rm = (instruction & 0x01c0) >> 6;
      const opcode = instruction & 0x0e00;
      switch (opcode) {
        case 0x0000: {
          // STR(2)
          op = this.thumbCompiler.constructSTR2(rd, rn, rm);
          break;
        }
        case 0x0200: {
          // STRH(2)
          op = this.thumbCompiler.constructSTRH2(rd, rn, rm);
          break;
        }
        case 0x0400: {
          // STRB(2)
          op = this.thumbCompiler.constructSTRB2(rd, rn, rm);
          break;
        }
        case 0x0600: {
          // LDRSB
          op = this.thumbCompiler.constructLDRSB(rd, rn, rm);
          break;
        }
        case 0x0800: {
          // LDR(2)
          op = this.thumbCompiler.constructLDR2(rd, rn, rm);
          break;
        }
        case 0x0a00: {
          // LDRH(2)
          op = this.thumbCompiler.constructLDRH2(rd, rn, rm);
          break;
        }
        case 0x0c00: {
          // LDRB(2)
          op = this.thumbCompiler.constructLDRB2(rd, rn, rm);
          break;
        }
        case 0x0e00: {
          // LDRSH
          op = this.thumbCompiler.constructLDRSH(rd, rn, rm);
          break;
        }
      }
      op.writesPC = false;
    } else if ((instruction & 0xe000) == 0x6000) {
      // Load and store with immediate offset
      const rd = instruction & 0x0007;
      const rn = (instruction & 0x0038) >> 3;
      let immediate = (instruction & 0x07c0) >> 4;

      const b = instruction & 0x1000;
      if (b) {
        immediate >>= 2;
      }

      const load = instruction & 0x0800;
      if (load) {
        if (b) {
          // LDRB(1)
          op = this.thumbCompiler.constructLDRB1(rd, rn, immediate);
        } else {
          // LDR(1)
          op = this.thumbCompiler.constructLDR1(rd, rn, immediate);
        }
      } else {
        if (b) {
          // STRB(1)
          op = this.thumbCompiler.constructSTRB1(rd, rn, immediate);
        } else {
          // STR(1)
          op = this.thumbCompiler.constructSTR1(rd, rn, immediate);
        }
      }
      op.writesPC = false;
    } else if ((instruction & 0xf600) == 0xb400) {
      // Push and pop registers
      const r = !!(instruction & 0x0100);
      const rs = instruction & 0x00ff;
      if (instruction & 0x0800) {
        // POP
        op = this.thumbCompiler.constructPOP(rs, r);
        op.writesPC = r;
        op.fixedJump = false;
      } else {
        // PUSH
        op = this.thumbCompiler.constructPUSH(rs, r);
        op.writesPC = false;
      }
    } else if (instruction & 0x8000) {
      switch (instruction & 0x7000) {
        case 0x0000: {
          // Load and store halfword
          const rd = instruction & 0x0007;
          const rn = (instruction & 0x0038) >> 3;
          const immediate = (instruction & 0x07c0) >> 5;
          if (instruction & 0x0800) {
            // LDRH(1)
            op = this.thumbCompiler.constructLDRH1(rd, rn, immediate);
          } else {
            // STRH(1)
            op = this.thumbCompiler.constructSTRH1(rd, rn, immediate);
          }
          op.writesPC = false;
          break;
        }
        case 0x1000: {
          // SP-relative load and store
          const rd = (instruction & 0x0700) >> 8;
          const immediate = (instruction & 0x00ff) << 2;
          const load = instruction & 0x0800;
          if (load) {
            // LDR(4)
            op = this.thumbCompiler.constructLDR4(rd, immediate);
          } else {
            // STR(3)
            op = this.thumbCompiler.constructSTR3(rd, immediate);
          }
          op.writesPC = false;
          break;
        }
        case 0x2000: {
          // Load address
          const rd = (instruction & 0x0700) >> 8;
          const immediate = (instruction & 0x00ff) << 2;
          if (instruction & 0x0800) {
            // ADD(6)
            op = this.thumbCompiler.constructADD6(rd, immediate);
          } else {
            // ADD(5)
            op = this.thumbCompiler.constructADD5(rd, immediate);
          }
          op.writesPC = false;
          break;
        }
        case 0x3000: {
          // Miscellaneous
          if (!(instruction & 0x0f00)) {
            // Adjust stack pointer
            // ADD(7)/SUB(4)
            const b = instruction & 0x0080;
            let immediate = (instruction & 0x7f) << 2;
            if (b) immediate = -immediate;
            op = this.thumbCompiler.constructADD7(immediate);
            op.writesPC = false;
          }
          break;
        }
        case 0x4000: {
          // Multiple load and store
          const rn = (instruction & 0x0700) >> 8;
          const rs = instruction & 0x00ff;
          if (instruction & 0x0800) {
            // LDMIA
            op = this.thumbCompiler.constructLDMIA(rn, rs);
          } else {
            // STMIA
            op = this.thumbCompiler.constructSTMIA(rn, rs);
          }
          op.writesPC = false;
          break;
        }
        case 0x5000: {
          // Conditional branch
          const cond = (instruction & 0x0f00) >> 8;
          let immediate = instruction & 0x00ff;
          if (cond == 0xf) {
            // SWI
            op = this.thumbCompiler.constructSWI(immediate);
            op.writesPC = false;
          } else {
            // B(1)
            if (instruction & 0x0080) immediate |= 0xffffff00;
            immediate <<= 1;
            const condOp = this.conds[cond];
            op = this.thumbCompiler.constructB1(immediate, condOp);
            op.writesPC = true;
            op.fixedJump = true;
          }
          break;
        }
        case 0x6000: {
        }
        case 0x7000: {
          // BL(X)
          let immediate = instruction & 0x07ff;
          const h = instruction & 0x1800;
          switch (h) {
            case 0x0000: {
              // B(2)
              if (immediate & 0x0400) immediate |= 0xfffff800;
              immediate <<= 1;
              op = this.thumbCompiler.constructB2(immediate);
              op.writesPC = true;
              op.fixedJump = true;
              break;
            }
            case 0x0800: {
              break;
            }
            case 0x1000: {
              // BL(1)
              if (immediate & 0x0400) immediate |= 0xfffffc00;
              immediate <<= 12;
              op = this.thumbCompiler.constructBL1(immediate);
              op.writesPC = false;
              break;
            }
            case 0x1800: {
              // BL(2)
              op = this.thumbCompiler.constructBL2(immediate);
              op.writesPC = true;
              op.fixedJump = false;
              break;
            }
          }
          break;
        }
        default: {
          this.core.WARN('Undefined instruction: 0x' + instruction.toString(16));
        }
      }
    } else {
      throw 'Bad opcode: 0x' + instruction.toString(16);
    }

    op.execMode = execMode.THUMB;
    op.fixedJump = op.fixedJump || false;

    return op;
  }
}
