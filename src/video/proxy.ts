import { GameBoyAdvanceMMU, MemoryView, region, size } from '../mmu';
import { Serializer } from '../util';

const worker = './worker';

export class MemoryProxy {
  owner: any;
  blocks: MemoryView[];
  blockSize: number;
  mask: number;
  size: number;

  constructor(owner: any, size: number, blockSize: number) {
    this.owner = owner;
    this.blocks = [];
    this.blockSize = blockSize;
    this.mask = (1 << blockSize) - 1;
    this.size = size;
    if (blockSize) {
      for (let i = 0; i < size >> blockSize; ++i) {
        this.blocks.push(new MemoryView(new ArrayBuffer(1 << blockSize)));
      }
    } else {
      this.blockSize = 31;
      this.mask = -1;
      this.blocks[0] = new MemoryView(new ArrayBuffer(size));
    }
  }

  combine() {
    if (this.blocks.length > 1) {
      const combined = new Uint8Array(this.size);
      for (let i = 0; i < this.blocks.length; ++i) {
        combined.set(new Uint8Array(this.blocks[i].buffer), i << this.blockSize);
      }

      return combined.buffer;
    } else {
      return this.blocks[0].buffer;
    }
  }

  replace(buffer: ArrayBufferLike) {
    for (let i = 0; i < this.blocks.length; ++i) {
      this.blocks[i] = new MemoryView(
        buffer.slice(i << this.blockSize, (i << this.blockSize) + this.blocks[i].buffer.byteLength),
      );
    }
  }

  load8(offset: number) {
    return this.blocks[offset >> this.blockSize].load8(offset & this.mask);
  }

  load16(offset: number) {
    return this.blocks[offset >> this.blockSize].load16(offset & this.mask);
  }

  loadU8(offset: number) {
    return this.blocks[offset >> this.blockSize].loadU8(offset & this.mask);
  }

  loadU16(offset: number) {
    return this.blocks[offset >> this.blockSize].loadU16(offset & this.mask);
  }

  load32(offset: number) {
    return this.blocks[offset >> this.blockSize].load32(offset & this.mask);
  }

  store8(offset: number, value: number) {
    if (offset >= this.size) return;
    this.owner.memoryDirtied(this, offset >> this.blockSize);
    this.blocks[offset >> this.blockSize].store8(offset & this.mask, value);
    this.blocks[offset >> this.blockSize].store8((offset & this.mask) ^ 1, value);
  }

  store16(offset: number, value: number) {
    if (offset >= this.size) return;
    this.owner.memoryDirtied(this, offset >> this.blockSize);

    return this.blocks[offset >> this.blockSize].store16(offset & this.mask, value);
  }

  store32(offset: number, value: number) {
    if (offset >= this.size) return;
    this.owner.memoryDirtied(this, offset >> this.blockSize);

    return this.blocks[offset >> this.blockSize].store32(offset & this.mask, value);
  }

  invalidatePage(address: number) {}
}

type FrostProxy = {
  palette: ArrayBuffer;
  vram: ArrayBuffer;
  oam: ArrayBuffer;
};

export class GameBoyAdvanceRenderProxy {
  worker: Worker;
  currentFrame: number;
  delay: number;
  skipFrame: boolean;
  dirty: any;
  backing?: ImageData;
  caller: any;

  vram?: MemoryProxy;
  palette?: MemoryProxy;
  oam?: MemoryProxy;

  scanlineQueue: { y: number; dirty: any }[];

  constructor() {
    this.worker = new Worker(worker, { type: 'module' });
    this.currentFrame = 0;
    this.delay = 0;
    this.skipFrame = false;

    this.dirty = null;
    const self = this; // eslint-disable-line
    const handlers: { [name: string]: (data: any) => void } = {
      finish: (data: any) => {
        self.backing = data.backing;
        self.caller.finishDraw(self.backing);
        --self.delay;
      },
    };

    this.worker.onmessage = (message: any) => {
      handlers[message.data['type']](message.data);
    };

    this.scanlineQueue = [];
  }

  memoryDirtied(mem: MemoryProxy, block: number) {
    this.dirty = this.dirty || {};
    this.dirty.memory = this.dirty.memory || {};

    if (mem === this.palette) {
      this.dirty.memory.palette = mem.blocks[0].buffer;
    }

    if (mem === this.oam) {
      this.dirty.memory.oam = mem.blocks[0].buffer;
    }

    if (mem === this.vram) {
      this.dirty.memory.vram = this.dirty.memory.vram || [];
      this.dirty.memory.vram[block] = mem.blocks[block].buffer;
    }
  }

  clear(mmu: GameBoyAdvanceMMU) {
    this.palette = new MemoryProxy(this, size.PALETTE_RAM, 0);
    this.vram = new MemoryProxy(this, size.VRAM, 13);
    this.oam = new MemoryProxy(this, size.OAM, 0);

    this.dirty = null;
    this.scanlineQueue = [];

    this.worker.postMessage({ type: 'clear', SIZE_VRAM: size.VRAM, SIZE_OAM: size.OAM });
  }

  freeze(encodeBase64: string): FrostProxy {
    return {
      palette: Serializer.prefix(this.palette?.combine()),
      vram: Serializer.prefix(this.vram?.combine()),
      oam: Serializer.prefix(this.oam?.combine()),
    };
  }

  defrost(frost: FrostProxy, decodeBase64: any) {
    if (this.palette) {
      this.palette.replace(frost.palette);
      this.memoryDirtied(this.palette, 0);
    }

    if (this.vram) {
      this.vram.replace(frost.vram);
      for (let i = 0; i < this.vram.blocks.length; ++i) {
        this.memoryDirtied(this.vram, i);
      }
    }

    if (this.oam) {
      this.oam.replace(frost.oam);
      this.memoryDirtied(this.oam, 0);
    }
  }

  writeDisplayControl(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.DISPCNT = value;
  }

  writeBackgroundControl(bg: string, value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BGCNT = this.dirty.BGCNT || [];
    this.dirty.BGCNT[bg] = value;
  }

  writeBackgroundHOffset(bg: string, value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BGHOFS = this.dirty.BGHOFS || [];
    this.dirty.BGHOFS[bg] = value;
  }

  writeBackgroundVOffset(bg: string, value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BGVOFS = this.dirty.BGVOFS || [];
    this.dirty.BGVOFS[bg] = value;
  }

  writeBackgroundRefX(bg: string, value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BGX = this.dirty.BGX || [];
    this.dirty.BGX[bg] = value;
  }

  writeBackgroundRefY(bg: string, value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BGY = this.dirty.BGY || [];
    this.dirty.BGY[bg] = value;
  }

  writeBackgroundParamA(bg: string, value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BGPA = this.dirty.BGPA || [];
    this.dirty.BGPA[bg] = value;
  }

  writeBackgroundParamB(bg: string, value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BGPB = this.dirty.BGPB || [];
    this.dirty.BGPB[bg] = value;
  }

  writeBackgroundParamC(bg: string, value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BGPC = this.dirty.BGPC || [];
    this.dirty.BGPC[bg] = value;
  }

  writeBackgroundParamD(bg: string, value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BGPD = this.dirty.BGPD || [];
    this.dirty.BGPD[bg] = value;
  }

  writeWin0H(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.WIN0H = value;
  }

  writeWin1H(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.WIN1H = value;
  }

  writeWin0V(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.WIN0V = value;
  }

  writeWin1V(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.WIN1V = value;
  }

  writeWinIn(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.WININ = value;
  }

  writeWinOut(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.WINOUT = value;
  }

  writeBlendControl(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BLDCNT = value;
  }

  writeBlendAlpha(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BLDALPHA = value;
  }

  writeBlendY(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.BLDY = value;
  }

  writeMosaic(value: number) {
    this.dirty = this.dirty || {};
    this.dirty.MOSAIC = value;
  }

  clearSubsets(mmu: GameBoyAdvanceMMU, regions: number) {
    this.dirty = this.dirty || {};
    if (regions & 0x04) {
      this.palette = new MemoryProxy(this, size.PALETTE_RAM, 0);
      mmu.mmap(region.PALETTE_RAM, this.palette);
      this.memoryDirtied(this.palette, 0);
    }

    if (regions & 0x08) {
      this.vram = new MemoryProxy(this, size.VRAM, 13);
      mmu.mmap(region.VRAM, this.vram);
      for (let i = 0; i < this.vram.blocks.length; ++i) {
        this.memoryDirtied(this.vram, i);
      }
    }

    if (regions & 0x10) {
      this.oam = new MemoryProxy(this, size.OAM, 0);
      mmu.mmap(region.OAM, this.oam);
      this.memoryDirtied(this.oam, 0);
    }
  }

  setBacking(backing: ImageData) {
    this.backing = backing;
    this.worker.postMessage({ type: 'start', backing: this.backing });
  }

  drawScanline(y: number) {
    if (!this.skipFrame) {
      if (this.dirty) {
        if (this.dirty.memory) {
          if (this.dirty.memory.palette) {
            this.dirty.memory.palette = this.dirty.memory.palette.slice(0);
          }
          if (this.dirty.memory.oam) {
            this.dirty.memory.oam = this.dirty.memory.oam.slice(0);
          }
          if (this.dirty.memory.vram) {
            for (let i = 0; i < 12; ++i) {
              if (this.dirty.memory.vram[i]) {
                this.dirty.memory.vram[i] = this.dirty.memory.vram[i].slice(0);
              }
            }
          }
        }
        this.scanlineQueue.push({ y: y, dirty: this.dirty });
        this.dirty = null;
      }
    }
  }

  startDraw() {
    ++this.currentFrame;
    if (this.delay <= 0) {
      this.skipFrame = false;
    }
    if (!this.skipFrame) {
      ++this.delay;
    }
  }

  finishDraw(caller: any) {
    this.caller = caller;
    if (!this.skipFrame) {
      this.worker.postMessage({
        type: 'finish',
        scanlines: this.scanlineQueue,
        frame: this.currentFrame,
      });
      this.scanlineQueue = [];
      if (this.delay > 2) {
        this.skipFrame = true;
      }
    }
  }
}
