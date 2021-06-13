import { GameBoyAdvanceMMU, size } from '../mmu';

class MemoryAligned16 {
  buffer: Uint16Array;

  constructor(size: number) {
    this.buffer = new Uint16Array(size >> 1);
  }

  load8(offset: number): number {
    return (this.loadU8(offset) << 24) >> 24;
  }

  load16(offset: number): number {
    return (this.loadU16(offset) << 16) >> 16;
  }

  loadU8(offset: number): number {
    const index = offset >> 1;
    if (offset & 1) {
      return (this.buffer[index] & 0xff00) >>> 8;
    } else {
      return this.buffer[index] & 0x00ff;
    }
  }

  loadU16(offset: number): number {
    return this.buffer[offset >> 1];
  }

  load32(offset: number) {
    return this.buffer[(offset >> 1) & ~1] | (this.buffer[(offset >> 1) | 1] << 16);
  }

  store8(offset: number, value: number) {
    this.store16(offset, (value << 8) | value);
  }

  store16(offset: number, value: number) {
    this.buffer[offset >> 1] = value;
  }

  store32(offset: number, value: number) {
    const index = offset >> 1;
    this.store16(offset, (this.buffer[index] = value & 0xffff));
    this.store16(offset + 2, (this.buffer[index + 1] = value >>> 16));
  }

  insert(start: number, data: ArrayLike<number>) {
    this.buffer.set(data, start);
  }

  invalidatePage(address: number) {
    return;
  }
}

class GameBoyAdvanceVRAM extends MemoryAligned16 {
  vram: Uint16Array;

  constructor(size: number) {
    super(size);
    this.vram = this.buffer;
  }
}

class GameBoyAdvanceOAM extends MemoryAligned16 {
  oam: Uint16Array;
  objs: GameBoyAdvanceOBJ[];
  scalerot: {
    a: number;
    b: number;
    c: number;
    d: number;
  }[];

  video: any;

  constructor(size: number) {
    super(size);
    this.oam = this.buffer;

    this.objs = new Array(128);
    for (let i = 0; i < 128; ++i) {
      this.objs[i] = new GameBoyAdvanceOBJ(this, i);
    }

    this.scalerot = new Array(32);
    for (let i = 0; i < 32; ++i) {
      this.scalerot[i] = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
      };
    }
  }

  overwrite(memory: Uint16Array) {
    for (let i = 0; i < this.buffer.byteLength >> 1; ++i) {
      this.store16(i << 1, memory[i]);
    }
  }

  store16(offset: number, value: number) {
    const index = (offset & 0x3f8) >> 3;
    const obj = this.objs[index];
    const scalerot = this.scalerot[index >> 2];

    switch (offset & 0x00000006) {
      case 0:
        // Attribute 0
        obj.y = value & 0x00ff;
        const wasScalerot = obj.scalerot;
        obj.scalerot = value & 0x0100;
        if (obj.scalerot) {
          obj.scalerotOam = this.scalerot[obj.scalerotParam];
          obj.doublesize = !!(value & 0x0200);
          obj.disable = 0;
          obj.hflip = 0;
          obj.vflip = 0;
        } else {
          obj.doublesize = false;
          obj.disable = value & 0x0200;
          if (wasScalerot) {
            obj.hflip = obj.scalerotParam & 0x0008;
            obj.vflip = obj.scalerotParam & 0x0010;
          }
        }
        obj.mode = (value & 0x0c00) >> 6; // This lines up with the stencil format
        obj.mosaic = !!(value & 0x1000);
        obj.multipalette = !!(value & 0x2000);
        obj.shape = (value & 0xc000) >> 14;

        obj.recalcSize();
        break;
      case 2:
        // Attribute 1
        obj.x = value & 0x01ff;
        if (obj.scalerot) {
          obj.scalerotParam = (value & 0x3e00) >> 9;
          obj.scalerotOam = this.scalerot[obj.scalerotParam];
          obj.hflip = 0;
          obj.vflip = 0;
          obj.drawScanline = obj.drawScanlineAffine;
        } else {
          obj.hflip = value & 0x1000;
          obj.vflip = value & 0x2000;
          obj.drawScanline = obj.drawScanlineNormal;
        }
        obj.size = (value & 0xc000) >> 14;

        obj.recalcSize();
        break;
      case 4:
        // Attribute 2
        obj.tileBase = value & 0x03ff;
        obj.priority = (value & 0x0c00) >> 10;
        obj.palette = (value & 0xf000) >> 8; // This is shifted up 4 to make pushPixel faster
        break;
      case 6:
        // Scaling/rotation parameter
        switch (index & 0x3) {
          case 0:
            scalerot.a = (value << 16) / 0x1000000;
            break;
          case 1:
            scalerot.b = (value << 16) / 0x1000000;
            break;
          case 2:
            scalerot.c = (value << 16) / 0x1000000;
            break;
          case 3:
            scalerot.d = (value << 16) / 0x1000000;
            break;
        }
        break;
    }

    MemoryAligned16.prototype.store16.call(this, offset, value);
  }
}

class GameBoyAdvancePalette {
  colors: [number[], number[]];
  adjustedColors: [number[], number[]];
  passthroughColors: number[][];
  blendY: number;

  constructor() {
    this.colors = [new Array(0x100), new Array(0x100)];
    this.adjustedColors = [new Array(0x100), new Array(0x100)];
    this.passthroughColors = [
      this.colors[0], // BG0
      this.colors[0], // BG1
      this.colors[0], // BG2
      this.colors[0], // BG3
      this.colors[1], // OBJ
      this.colors[0], // Backdrop
    ];
    this.blendY = 1;
  }

  adjustColor(color: number): number {
    let r = color & 0x001f;
    let g = (color & 0x03e0) >> 5;
    let b = (color & 0x7c00) >> 10;

    r = r + (31 - r) * this.blendY;
    g = g + (31 - g) * this.blendY;
    b = b + (31 - b) * this.blendY;

    return r | (g << 5) | (b << 10);
  }

  overwrite(memory: Uint16Array) {
    for (let i = 0; i < 512; ++i) {
      this.store16(i << 1, memory[i]);
    }
  }

  loadU8(offset: number): number {
    return (this.loadU16(offset) >> (8 * (offset & 1))) & 0xff;
  }

  loadU16(offset: number): number {
    return this.colors[(offset & 0x200) >> 9][(offset & 0x1ff) >> 1];
  }

  load16(offset: number): number {
    return (this.loadU16(offset) << 16) >> 16;
  }

  load32(offset: number): number {
    return this.loadU16(offset) | (this.loadU16(offset + 2) << 16);
  }

  store16(offset: number, value: number) {
    const type = (offset & 0x200) >> 9;
    const index = (offset & 0x1ff) >> 1;
    this.colors[type][index] = value;
    this.adjustedColors[type][index] = this.adjustColor(value);
  }

  store32(offset: number, value: number) {
    this.store16(offset, value & 0xffff);
    this.store16(offset + 2, value >> 16);
  }

  invalidatePage(address: number) {
    return;
  }

  convert16To32(value: number, input: number[]) {
    const r = (value & 0x001f) << 3;
    const g = (value & 0x03e0) >> 2;
    const b = (value & 0x7c00) >> 7;

    input[0] = r;
    input[1] = g;
    input[2] = b;
  }

  mix(aWeight: number, aColor: number, bWeight: number, bColor: number): number {
    const ar = aColor & 0x001f;
    const ag = (aColor & 0x03e0) >> 5;
    const ab = (aColor & 0x7c00) >> 10;

    const br = bColor & 0x001f;
    const bg = (bColor & 0x03e0) >> 5;
    const bb = (bColor & 0x7c00) >> 10;

    const r = Math.min(aWeight * ar + bWeight * br, 0x1f);
    const g = Math.min(aWeight * ag + bWeight * bg, 0x1f);
    const b = Math.min(aWeight * ab + bWeight * bb, 0x1f);

    return r | (g << 5) | (b << 10);
  }

  makeDarkPalettes(layers: number) {
    if (this.adjustColor != this.adjustColorDark) {
      this.adjustColor = this.adjustColorDark;
      this.resetPalettes();
    }
    this.resetPaletteLayers(layers);
  }

  makeBrightPalettes(layers: number) {
    if (this.adjustColor != this.adjustColorBright) {
      this.adjustColor = this.adjustColorBright;
      this.resetPalettes();
    }
    this.resetPaletteLayers(layers);
  }

  makeNormalPalettes() {
    this.passthroughColors[0] = this.colors[0];
    this.passthroughColors[1] = this.colors[0];
    this.passthroughColors[2] = this.colors[0];
    this.passthroughColors[3] = this.colors[0];
    this.passthroughColors[4] = this.colors[1];
    this.passthroughColors[5] = this.colors[0];
  }

  makeSpecialPalette(layer: number) {
    this.passthroughColors[layer] = this.adjustedColors[layer == 4 ? 1 : 0];
  }

  makeNormalPalette(layer: number) {
    this.passthroughColors[layer] = this.colors[layer == 4 ? 1 : 0];
  }

  resetPaletteLayers(layers: number) {
    if (layers & 0x01) {
      this.passthroughColors[0] = this.adjustedColors[0];
    } else {
      this.passthroughColors[0] = this.colors[0];
    }
    if (layers & 0x02) {
      this.passthroughColors[1] = this.adjustedColors[0];
    } else {
      this.passthroughColors[1] = this.colors[0];
    }
    if (layers & 0x04) {
      this.passthroughColors[2] = this.adjustedColors[0];
    } else {
      this.passthroughColors[2] = this.colors[0];
    }
    if (layers & 0x08) {
      this.passthroughColors[3] = this.adjustedColors[0];
    } else {
      this.passthroughColors[3] = this.colors[0];
    }
    if (layers & 0x10) {
      this.passthroughColors[4] = this.adjustedColors[1];
    } else {
      this.passthroughColors[4] = this.colors[1];
    }
    if (layers & 0x20) {
      this.passthroughColors[5] = this.adjustedColors[0];
    } else {
      this.passthroughColors[5] = this.colors[0];
    }
  }

  resetPalettes() {
    let outPalette = this.adjustedColors[0];
    let inPalette = this.colors[0];
    for (let i = 0; i < 256; ++i) {
      outPalette[i] = this.adjustColor(inPalette[i]);
    }

    outPalette = this.adjustedColors[1];
    inPalette = this.colors[1];
    for (let i = 0; i < 256; ++i) {
      outPalette[i] = this.adjustColor(inPalette[i]);
    }
  }

  accessColor(layer: number, index: number): number {
    return this.passthroughColors[layer][index];
  }

  adjustColorDark(color: number): number {
    let r = color & 0x001f;
    let g = (color & 0x03e0) >> 5;
    let b = (color & 0x7c00) >> 10;

    r = r - r * this.blendY;
    g = g - g * this.blendY;
    b = b - b * this.blendY;

    return r | (g << 5) | (b << 10);
  }

  adjustColorBright(color: number): number {
    let r = color & 0x001f;
    let g = (color & 0x03e0) >> 5;
    let b = (color & 0x7c00) >> 10;

    r = r + (31 - r) * this.blendY;
    g = g + (31 - g) * this.blendY;
    b = b + (31 - b) * this.blendY;

    return r | (g << 5) | (b << 10);
  }

  setBlendY(y: number) {
    if (this.blendY != y) {
      this.blendY = y;
      this.resetPalettes();
    }
  }
}

type Backing = {
  color: Uint16Array;
  stencil: Uint8Array;
};

class GameBoyAdvanceOBJ {
  TILE_OFFSET: number;
  oam: GameBoyAdvanceOAM;

  index: number;
  x: number;
  y: number;
  scalerot: number;
  doublesize: boolean;
  disable: number;
  mode: number;
  mosaic: boolean;
  multipalette: boolean;
  shape: number;
  scalerotParam: number;
  hflip: number;
  vflip: number;
  tileBase: number;
  priority: number;
  palette: number;
  drawScanline: any;
  pushPixel: typeof GameBoyAdvanceSoftwareRenderer.pushPixel;
  cachedWidth: number;
  cachedHeight: number;
  scalerotOam: {
    a: number;
    b: number;
    c: number;
    d: number;
  };

  size: number;

  constructor(oam: GameBoyAdvanceOAM, index: number) {
    this.TILE_OFFSET = 0x10000;
    this.oam = oam;

    this.index = index;
    this.x = 0;
    this.y = 0;
    this.scalerot = 0;
    this.doublesize = false;
    this.disable = 1;
    this.mode = 0;
    this.mosaic = false;
    this.multipalette = false;
    this.shape = 0;
    this.scalerotParam = 0;
    this.hflip = 0;
    this.vflip = 0;
    this.tileBase = 0;
    this.priority = 0;
    this.palette = 0;
    this.drawScanline = this.drawScanlineNormal;
    this.pushPixel = GameBoyAdvanceSoftwareRenderer.pushPixel;
    this.cachedWidth = 8;
    this.cachedHeight = 8;

    this.scalerotOam = {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
    };
    this.size = 0;
  }

  drawScanlineNormal(backing: Backing, y: number, yOff: number, start: number, end: number) {
    const video = this.oam.video;
    let x = 0;
    let underflow;
    let offset;
    let mask = this.mode | video.target2[LAYER_OBJ] | (this.priority << 1);
    if (this.mode == 0x10) {
      mask |= TARGET1_MASK;
    }
    if (video.blendMode == 1 && video.alphaEnabled) {
      mask |= video.target1[LAYER_OBJ];
    }

    let totalWidth = this.cachedWidth;
    if (this.x < HORIZONTAL_PIXELS) {
      if (this.x < start) {
        underflow = start - this.x;
        offset = start;
      } else {
        underflow = 0;
        offset = this.x;
      }
      if (end < this.cachedWidth + this.x) {
        totalWidth = end - this.x;
      }
    } else {
      underflow = start + 512 - this.x;
      offset = start;
      if (end < this.cachedWidth - underflow) {
        totalWidth = end;
      }
    }

    let localX, localY;
    if (!this.vflip) {
      localY = y - yOff;
    } else {
      localY = this.cachedHeight - y + yOff - 1;
    }
    const localYLo = localY & 0x7;
    let mosaicX;
    let tileOffset;

    const paletteShift = this.multipalette ? 1 : 0;

    if (video.objCharacterMapping) {
      tileOffset = ((localY & 0x01f8) * this.cachedWidth) >> 6;
    } else {
      tileOffset = (localY & 0x01f8) << (2 - paletteShift);
    }

    if (this.mosaic) {
      mosaicX = video.objMosaicX - 1 - ((video.objMosaicX + offset - 1) % video.objMosaicX);
      offset += mosaicX;
      underflow += mosaicX;
    }

    localX = !this.hflip ? underflow : this.cachedWidth - underflow - 1;

    let tileRow = video.accessTile(
      this.TILE_OFFSET + (x & 0x4) * paletteShift,
      this.tileBase + (tileOffset << paletteShift) + ((localX & 0x01f8) >> (3 - paletteShift)),
      localYLo << paletteShift,
    );

    for (x = underflow; x < totalWidth; ++x) {
      mosaicX = this.mosaic ? offset % video.objMosaicX : 0;

      localX = !this.hflip ? x - mosaicX : this.cachedWidth - (x - mosaicX) - 1;

      if (!paletteShift) {
        if (!(x & 0x7) || (this.mosaic && !mosaicX)) {
          tileRow = video.accessTile(
            this.TILE_OFFSET,
            this.tileBase + tileOffset + (localX >> 3),
            localYLo,
          );
        }
      } else {
        if (!(x & 0x3) || (this.mosaic && !mosaicX)) {
          tileRow = video.accessTile(
            this.TILE_OFFSET + (localX & 0x4),
            this.tileBase + (tileOffset << 1) + ((localX & 0x01f8) >> 2),
            localYLo << 1,
          );
        }
      }
      this.pushPixel(LAYER_OBJ, this, video, tileRow, localX & 0x7, offset, backing, mask, false);
      offset++;
    }
  }

  drawScanlineAffine(backing: Backing, y: number, yOff: number, start: number, end: number) {
    const video = this.oam.video;
    let x;
    let underflow;
    let offset;

    let mask = this.mode | video.target2[LAYER_OBJ] | (this.priority << 1);
    if (this.mode == 0x10) mask |= TARGET1_MASK;
    if (video.blendMode == 1 && video.alphaEnabled) mask |= video.target1[LAYER_OBJ];

    let localX, localY;
    const yDiff = y - yOff;
    let tileOffset;

    const paletteShift = this.multipalette ? 1 : 0;
    let totalWidth = this.cachedWidth << Number(this.doublesize);
    const totalHeight = this.cachedHeight << Number(this.doublesize);
    let drawWidth = totalWidth;
    if (drawWidth > HORIZONTAL_PIXELS) {
      totalWidth = HORIZONTAL_PIXELS;
    }

    if (this.x < HORIZONTAL_PIXELS) {
      if (this.x < start) {
        underflow = start - this.x;
        offset = start;
      } else {
        underflow = 0;
        offset = this.x;
      }
      if (end < drawWidth + this.x) drawWidth = end - this.x;
    } else {
      underflow = start + 512 - this.x;
      offset = start;
      if (end < drawWidth - underflow) drawWidth = end;
    }

    for (x = underflow; x < drawWidth; ++x) {
      localX =
        this.scalerotOam.a * (x - (totalWidth >> 1)) +
        this.scalerotOam.b * (yDiff - (totalHeight >> 1)) +
        (this.cachedWidth >> 1);

      localY =
        this.scalerotOam.c * (x - (totalWidth >> 1)) +
        this.scalerotOam.d * (yDiff - (totalHeight >> 1)) +
        (this.cachedHeight >> 1);

      if (this.mosaic) {
        localX -=
          (x % video.objMosaicX) * this.scalerotOam.a + (y % video.objMosaicY) * this.scalerotOam.b;
        localY -=
          (x % video.objMosaicX) * this.scalerotOam.c + (y % video.objMosaicY) * this.scalerotOam.d;
      }

      if (localX < 0 || localX >= this.cachedWidth || localY < 0 || localY >= this.cachedHeight) {
        offset++;
        continue;
      }

      if (video.objCharacterMapping) {
        tileOffset = ((localY & 0x01f8) * this.cachedWidth) >> 6;
      } else {
        tileOffset = (localY & 0x01f8) << (2 - paletteShift);
      }

      const tileRow = video.accessTile(
        this.TILE_OFFSET + (localX & 0x4) * paletteShift,
        this.tileBase + (tileOffset << paletteShift) + ((localX & 0x01f8) >> (3 - paletteShift)),
        (localY & 0x7) << paletteShift,
      );

      this.pushPixel(LAYER_OBJ, this, video, tileRow, localX & 0x7, offset, backing, mask, false);
      offset++;
    }
  }

  recalcSize() {
    switch (this.shape) {
      case 0: {
        // Square
        this.cachedHeight = this.cachedWidth = 8 << this.size;
        break;
      }
      case 1:
        // Horizontal
        switch (this.size) {
          case 0:
            this.cachedHeight = 8;
            this.cachedWidth = 16;
            break;
          case 1:
            this.cachedHeight = 8;
            this.cachedWidth = 32;
            break;
          case 2:
            this.cachedHeight = 16;
            this.cachedWidth = 32;
            break;
          case 3:
            this.cachedHeight = 32;
            this.cachedWidth = 64;
            break;
        }
        break;
      case 2:
        // Vertical
        switch (this.size) {
          case 0: {
            this.cachedHeight = 16;
            this.cachedWidth = 8;
            break;
          }
          case 1: {
            this.cachedHeight = 32;
            this.cachedWidth = 8;
            break;
          }
          case 2: {
            this.cachedHeight = 32;
            this.cachedWidth = 16;
            break;
          }
          case 3: {
            this.cachedHeight = 64;
            this.cachedWidth = 32;
            break;
          }
        }
        break;
      default:
      // Bad!
    }
  }
}

class GameBoyAdvanceOBJLayer {
  video: GameBoyAdvanceSoftwareRenderer;
  bg: boolean;
  index: number;
  priority: number;
  enabled: boolean;
  objwin: number;

  constructor(video: GameBoyAdvanceSoftwareRenderer, index: number) {
    this.video = video;
    this.bg = false;
    this.index = LAYER_OBJ;
    this.priority = index;
    this.enabled = false;
    this.objwin = 0;
  }

  drawScanline(backing: Backing, layer: any, start: number, end: number) {
    const y = this.video.vcount;
    let wrappedY;
    let mosaicY;
    let obj;
    if (start >= end) return;

    const objs = this.video.oam?.objs || [];
    for (let i = 0; i < objs.length; ++i) {
      obj = objs[i];
      if (obj.disable) continue;
      if ((obj.mode & this.video.OBJWIN_MASK) != this.objwin) continue;
      if (!(obj.mode & this.video.OBJWIN_MASK) && this.priority != obj.priority) continue;
      if (obj.y < VERTICAL_PIXELS) {
        wrappedY = obj.y;
      } else {
        wrappedY = obj.y - 256;
      }

      const totalHeight = !obj.scalerot
        ? obj.cachedHeight
        : obj.cachedHeight << Number(obj.doublesize);

      mosaicY = !obj.mosaic ? y : y - (y % this.video.objMosaicY);
      if (wrappedY <= y && wrappedY + totalHeight > y) {
        obj.drawScanline(backing, mosaicY, wrappedY, start, end);
      }
    }
  }

  objComparator(a: { index: number }, b: { index: number }) {
    return a.index - b.index;
  }
}

class Backdrop {
  video: GameBoyAdvanceSoftwareRenderer;
  bg: boolean;
  priority: number;
  index: number;
  enabled: boolean;

  constructor(video: GameBoyAdvanceSoftwareRenderer) {
    this.video = video;
    this.bg = true;
    this.priority = -1;
    this.index = LAYER_BACKDROP;
    this.enabled = true;
  }

  drawScanline(backing: Backing, layer: any, start: number, end: number) {
    // TODO: interactions with blend modes and OBJWIN
    for (let x = start; x < end; ++x) {
      if (!(backing.stencil[x] & this.video.WRITTEN_MASK)) {
        backing.color[x] = this.video.palette?.accessColor(this.index, 0) || 0;
        backing.stencil[x] = this.video.WRITTEN_MASK;
      } else if (backing.stencil[x] & TARGET1_MASK) {
        backing.color[x] =
          this.video.palette?.mix(
            this.video.blendB,
            this.video.palette?.accessColor(this.index, 0),
            this.video.blendA,
            backing.color[x],
          ) || 0;
        backing.stencil[x] = this.video.WRITTEN_MASK;
      }
    }
  }
}

type SharedMap = {
  tile: number;
  hflip: boolean;
  vflip: boolean;
  palette: number;
};

const LAYER_OBJ = 4;
const LAYER_BACKDROP = 5;
const LAYER_MASK = 6;

const BACKGROUND_MASK = 0x01;
const TARGET1_MASK = 0x10;
const TARGET2_MASK = 0x08;

const HORIZONTAL_PIXELS = 240;
const VERTICAL_PIXELS = 160;

export class GameBoyAdvanceSoftwareRenderer {
  OBJWIN_MASK: number;
  WRITTEN_MASK: number;

  PRIORITY_MASK: number;
  drawBackdrop: Backdrop;

  palette?: GameBoyAdvancePalette;
  vram?: GameBoyAdvanceVRAM;
  oam?: GameBoyAdvanceOAM;
  objLayers: GameBoyAdvanceOBJLayer[];
  objwinLayer?: GameBoyAdvanceOBJLayer;

  backgroundMode: number;
  displayFrameSelect: number;
  hblankIntervalFree: number;
  objCharacterMapping: number;
  forcedBlank: number;
  win0: number;
  win1: number;
  objwin: number;
  vcount: number;
  win0Left: number;
  win0Right: number;
  win1Left: number;
  win1Right: number;
  win0Top: number;
  win0Bottom: number;
  win1Top: number;
  win1Bottom: number;
  windows: {
    enabled: boolean[];
    special: number;
  }[];

  target1: number[];
  target2: number[];
  blendMode: number;
  blendA: number;
  blendB: number;
  blendY: number;
  bgMosaicX: number;
  bgMosaicY: number;
  objMosaicX: number;
  objMosaicY: number;
  lastHblank: number;
  nextHblank: number;
  nextEvent: number;
  nextHblankIRQ: number;
  nextVblankIRQ: number;
  nextVcounterIRQ: number;
  bg: any[];
  HDRAW_LENGTH: number;
  bgModes: any[];
  drawLayers: any[];
  objwinActive: boolean;
  alphaEnabled: boolean;
  scanline: {
    color: Uint16Array;
    stencil: Uint8Array;
  };

  sharedColor: number[];
  sharedMap: SharedMap;

  video?: GameBoyAdvanceSoftwareRenderer;
  mosaic: any;

  pixelData?: ImageData;
  static multipalette: any;

  constructor() {
    this.OBJWIN_MASK = 0x20;
    this.WRITTEN_MASK = 0x80;

    this.PRIORITY_MASK = LAYER_MASK | BACKGROUND_MASK;

    this.drawBackdrop = new Backdrop(this);

    this.backgroundMode = 0;
    this.displayFrameSelect = 0;
    this.hblankIntervalFree = 0;
    this.objCharacterMapping = 0;
    this.forcedBlank = 0;
    this.win0 = 0;
    this.win1 = 0;
    this.objwin = 0;
    this.vcount = 0;
    this.win0Left = 0;
    this.win0Right = 0;
    this.win1Left = 0;
    this.win1Right = 0;
    this.win0Top = 0;
    this.win0Bottom = 0;
    this.win1Top = 0;
    this.win1Bottom = 0;
    this.windows = [];
    this.target1 = [];
    this.target2 = [];
    this.blendMode = 0;
    this.blendA = 0;
    this.blendB = 0;
    this.blendY = 0;
    this.bgMosaicX = 0;
    this.bgMosaicY = 0;
    this.objMosaicX = 0;
    this.objMosaicY = 0;
    this.lastHblank = 0;
    this.nextHblank = 0;
    this.nextEvent = 0;
    this.nextHblankIRQ = 0;
    this.nextVblankIRQ = 0;
    this.nextVcounterIRQ = 0;
    this.bg = [];
    this.HDRAW_LENGTH = 0;
    this.bgModes = [];
    this.drawLayers = [];
    this.objwinActive = false;
    this.alphaEnabled = false;
    this.scanline = {
      color: new Uint16Array(),
      stencil: new Uint8Array(),
    };
    this.sharedColor = [];
    this.sharedMap = {
      tile: 0,
      hflip: false,
      vflip: false,
      palette: 0,
    };

    // dummy
    this.objLayers = [];
  }

  clear() {
    this.palette = new GameBoyAdvancePalette();
    this.vram = new GameBoyAdvanceVRAM(size.VRAM);
    this.oam = new GameBoyAdvanceOAM(size.OAM);
    this.oam.video = this;
    this.objLayers = [
      new GameBoyAdvanceOBJLayer(this, 0),
      new GameBoyAdvanceOBJLayer(this, 1),
      new GameBoyAdvanceOBJLayer(this, 2),
      new GameBoyAdvanceOBJLayer(this, 3),
    ];
    this.objwinLayer = new GameBoyAdvanceOBJLayer(this, 4);
    this.objwinLayer.objwin = this.OBJWIN_MASK;

    // DISPCNT
    this.backgroundMode = 0;
    this.displayFrameSelect = 0;
    this.hblankIntervalFree = 0;
    this.objCharacterMapping = 0;
    this.forcedBlank = 1;
    this.win0 = 0;
    this.win1 = 0;
    this.objwin = 0;

    // VCOUNT
    this.vcount = -1;

    // WIN0H
    this.win0Left = 0;
    this.win0Right = 240;

    // WIN1H
    this.win1Left = 0;
    this.win1Right = 240;

    // WIN0V
    this.win0Top = 0;
    this.win0Bottom = 160;

    // WIN1V
    this.win1Top = 0;
    this.win1Bottom = 160;

    // WININ/WINOUT
    this.windows = [];
    for (let i = 0; i < 4; ++i) {
      this.windows.push({
        enabled: [false, false, false, false, false, true],
        special: 0,
      });
    }

    // BLDCNT
    this.target1 = new Array(5);
    this.target2 = new Array(5);
    this.blendMode = 0;

    // BLDALPHA
    this.blendA = 0;
    this.blendB = 0;

    // BLDY
    this.blendY = 0;

    // MOSAIC
    this.bgMosaicX = 1;
    this.bgMosaicY = 1;
    this.objMosaicX = 1;
    this.objMosaicY = 1;

    this.lastHblank = 0;
    this.nextHblank = this.HDRAW_LENGTH;
    this.nextEvent = this.nextHblank;

    this.nextHblankIRQ = 0;
    this.nextVblankIRQ = 0;
    this.nextVcounterIRQ = 0;

    this.bg = [];
    for (let i = 0; i < 4; ++i) {
      this.bg.push({
        bg: true,
        index: i,
        enabled: false,
        video: this,
        vram: this.vram,
        priority: 0,
        charBase: 0,
        mosaic: false,
        multipalette: false,
        screenBase: 0,
        overflow: 0,
        size: 0,
        x: 0,
        y: 0,
        refx: 0,
        refy: 0,
        dx: 1,
        dmx: 0,
        dy: 0,
        dmy: 1,
        sx: 0,
        sy: 0,
        pushPixel: GameBoyAdvanceSoftwareRenderer.pushPixel,
        drawScanline: this.drawScanlineBGMode0,
      });
    }

    this.bgModes = [
      this.drawScanlineBGMode0,
      this.drawScanlineBGMode2, // Modes 1 and 2 are identical for layers 2 and 3
      this.drawScanlineBGMode2,
      this.drawScanlineBGMode3,
      this.drawScanlineBGMode4,
      this.drawScanlineBGMode5,
    ];

    this.drawLayers = [
      this.bg[0],
      this.bg[1],
      this.bg[2],
      this.bg[3],
      this.objLayers[0],
      this.objLayers[1],
      this.objLayers[2],
      this.objLayers[3],
      this.objwinLayer,
      this.drawBackdrop,
    ];

    this.objwinActive = false;
    this.alphaEnabled = false;

    this.scanline = {
      color: new Uint16Array(HORIZONTAL_PIXELS),
      // Stencil format:
      // Bits 0-1: Layer
      // Bit 2: Is background
      // Bit 3: Is Target 2
      // Bit 4: Is Target 1
      // Bit 5: Is OBJ Window
      // Bit 6: Reserved
      // Bit 7: Has been written
      stencil: new Uint8Array(HORIZONTAL_PIXELS),
    };
    this.sharedColor = [0, 0, 0];
    this.sharedMap = {
      tile: 0,
      hflip: false,
      vflip: false,
      palette: 0,
    };
  }

  clearSubsets(mmu: GameBoyAdvanceMMU, regions: number) {
    if (regions & 0x04) {
      this.palette?.overwrite(new Uint16Array(size.PALETTE_RAM >> 1));
    }

    if (regions & 0x08) {
      this.vram?.insert(0, new Uint16Array(size.VRAM >> 1));
    }

    if (regions & 0x10) {
      this.oam?.overwrite(new Uint16Array(size.OAM >> 1));
      if (this.oam) this.oam.video = this;
    }
  }

  freeze() {
    return;
  }

  defrost(frost: any) {
    return;
  }

  setBacking(backing: ImageData) {
    this.pixelData = backing;

    // Clear backing first
    for (let offset = 0; offset < HORIZONTAL_PIXELS * VERTICAL_PIXELS * 4; ) {
      this.pixelData.data[offset++] = 0xff;
      this.pixelData.data[offset++] = 0xff;
      this.pixelData.data[offset++] = 0xff;
      this.pixelData.data[offset++] = 0xff;
    }
  }

  writeDisplayControl(value: number) {
    this.backgroundMode = value & 0x0007;
    this.displayFrameSelect = value & 0x0010;
    this.hblankIntervalFree = value & 0x0020;
    this.objCharacterMapping = value & 0x0040;
    this.forcedBlank = value & 0x0080;
    this.bg[0].enabled = value & 0x0100;
    this.bg[1].enabled = value & 0x0200;
    this.bg[2].enabled = value & 0x0400;
    this.bg[3].enabled = value & 0x0800;
    this.objLayers[0].enabled = !!(value & 0x1000);
    this.objLayers[1].enabled = !!(value & 0x1000);
    this.objLayers[2].enabled = !!(value & 0x1000);
    this.objLayers[3].enabled = !!(value & 0x1000);
    this.win0 = value & 0x2000;
    this.win1 = value & 0x4000;
    this.objwin = value & 0x8000;
    if (this.objwinLayer) this.objwinLayer.enabled = !!(value & 0x1000 && value & 0x8000);

    // Total hack so we can store both things that would set it to 256-color mode in the same variable
    this.bg[2].multipalette &= ~0x0001;
    this.bg[3].multipalette &= ~0x0001;
    if (this.backgroundMode > 0) {
      this.bg[2].multipalette |= 0x0001;
    }
    if (this.backgroundMode == 2) {
      this.bg[3].multipalette |= 0x0001;
    }

    this.resetLayers();
  }

  writeBackgroundControl(bg: number, value: number) {
    const bgData = this.bg[bg];
    bgData.priority = value & 0x0003;
    bgData.charBase = (value & 0x000c) << 12;
    bgData.mosaic = value & 0x0040;
    bgData.multipalette &= ~0x0080;
    if (bg < 2 || this.backgroundMode == 0) {
      bgData.multipalette |= value & 0x0080;
    }
    bgData.screenBase = (value & 0x1f00) << 3;
    bgData.overflow = value & 0x2000;
    bgData.size = (value & 0xc000) >> 14;

    this.drawLayers.sort(this.layerComparator);
  }

  writeBackgroundHOffset(bg: number, value: number) {
    this.bg[bg].x = value & 0x1ff;
  }

  writeBackgroundVOffset(bg: number, value: number) {
    this.bg[bg].y = value & 0x1ff;
  }

  writeBackgroundRefX(bg: number, value: number) {
    this.bg[bg].refx = (value << 4) / 0x1000;
    this.bg[bg].sx = this.bg[bg].refx;
  }

  writeBackgroundRefY(bg: number, value: number) {
    this.bg[bg].refy = (value << 4) / 0x1000;
    this.bg[bg].sy = this.bg[bg].refy;
  }

  writeBackgroundParamA(bg: number, value: number) {
    this.bg[bg].dx = (value << 16) / 0x1000000;
  }

  writeBackgroundParamB(bg: number, value: number) {
    this.bg[bg].dmx = (value << 16) / 0x1000000;
  }

  writeBackgroundParamC(bg: number, value: number) {
    this.bg[bg].dy = (value << 16) / 0x1000000;
  }

  writeBackgroundParamD(bg: number, value: number) {
    this.bg[bg].dmy = (value << 16) / 0x1000000;
  }

  writeWin0H(value: number) {
    this.win0Left = (value & 0xff00) >> 8;
    this.win0Right = Math.min(HORIZONTAL_PIXELS, value & 0x00ff);
    if (this.win0Left > this.win0Right) {
      this.win0Right = HORIZONTAL_PIXELS;
    }
  }

  writeWin1H(value: number) {
    this.win1Left = (value & 0xff00) >> 8;
    this.win1Right = Math.min(HORIZONTAL_PIXELS, value & 0x00ff);
    if (this.win1Left > this.win1Right) {
      this.win1Right = HORIZONTAL_PIXELS;
    }
  }

  writeWin0V(value: number) {
    this.win0Top = (value & 0xff00) >> 8;
    this.win0Bottom = Math.min(VERTICAL_PIXELS, value & 0x00ff);
    if (this.win0Top > this.win0Bottom) {
      this.win0Bottom = VERTICAL_PIXELS;
    }
  }

  writeWin1V(value: number) {
    this.win1Top = (value & 0xff00) >> 8;
    this.win1Bottom = Math.min(VERTICAL_PIXELS, value & 0x00ff);
    if (this.win1Top > this.win1Bottom) {
      this.win1Bottom = VERTICAL_PIXELS;
    }
  }

  writeWindow(index: number, value: number) {
    const window = this.windows[index];
    window.enabled[0] = !!(value & 0x01);
    window.enabled[1] = !!(value & 0x02);
    window.enabled[2] = !!(value & 0x04);
    window.enabled[3] = !!(value & 0x08);
    window.enabled[4] = !!(value & 0x10);
    window.special = value & 0x20;
  }

  writeWinIn(value: number) {
    this.writeWindow(0, value);
    this.writeWindow(1, value >> 8);
  }

  writeWinOut(value: number) {
    this.writeWindow(2, value);
    this.writeWindow(3, value >> 8);
  }

  writeBlendControl(value: number) {
    this.target1[0] = Number(!!(value & 0x0001)) * TARGET1_MASK;
    this.target1[1] = Number(!!(value & 0x0002)) * TARGET1_MASK;
    this.target1[2] = Number(!!(value & 0x0004)) * TARGET1_MASK;
    this.target1[3] = Number(!!(value & 0x0008)) * TARGET1_MASK;
    this.target1[4] = Number(!!(value & 0x0010)) * TARGET1_MASK;
    this.target1[5] = Number(!!(value & 0x0020)) * TARGET1_MASK;
    this.target2[0] = Number(!!(value & 0x0100)) * TARGET2_MASK;
    this.target2[1] = Number(!!(value & 0x0200)) * TARGET2_MASK;
    this.target2[2] = Number(!!(value & 0x0400)) * TARGET2_MASK;
    this.target2[3] = Number(!!(value & 0x0800)) * TARGET2_MASK;
    this.target2[4] = Number(!!(value & 0x1000)) * TARGET2_MASK;
    this.target2[5] = Number(!!(value & 0x2000)) * TARGET2_MASK;
    this.blendMode = (value & 0x00c0) >> 6;

    switch (this.blendMode) {
      case 1:
      // Alpha
      // Fall through
      case 0:
        // Normal
        this.palette?.makeNormalPalettes();
        break;
      case 2:
        // Brighter
        this.palette?.makeBrightPalettes(value & 0x3f);
        break;
      case 3:
        // Darker
        this.palette?.makeDarkPalettes(value & 0x3f);
        break;
    }
  }

  setBlendEnabled(layer: number, enabled: boolean, override: number) {
    this.alphaEnabled = enabled && override == 1;
    if (enabled) {
      switch (override) {
        case 1:
        // Alpha
        // Fall through
        case 0:
          // Normal
          this.palette?.makeNormalPalette(layer);
          break;
        case 2:
        // Brighter
        case 3:
          // Darker
          this.palette?.makeSpecialPalette(layer);
          break;
      }
    } else {
      this.palette?.makeNormalPalette(layer);
    }
  }

  writeBlendAlpha(value: number) {
    this.blendA = (value & 0x001f) / 16;
    if (this.blendA > 1) this.blendA = 1;

    this.blendB = ((value & 0x1f00) >> 8) / 16;
    if (this.blendB > 1) this.blendB = 1;
  }

  writeBlendY(value: number) {
    this.blendY = value;
    this.palette?.setBlendY(value >= 16 ? 1 : value / 16);
  }

  writeMosaic(value: number) {
    this.bgMosaicX = (value & 0xf) + 1;
    this.bgMosaicY = ((value >> 4) & 0xf) + 1;
    this.objMosaicX = ((value >> 8) & 0xf) + 1;
    this.objMosaicY = ((value >> 12) & 0xf) + 1;
  }

  resetLayers() {
    if (this.backgroundMode > 1) {
      this.bg[0].enabled = false;
      this.bg[1].enabled = false;
    }

    if (this.bg[2].enabled) this.bg[2].drawScanline = this.bgModes[this.backgroundMode];
    if (this.backgroundMode == 0 || this.backgroundMode == 2) {
      if (this.bg[3].enabled) this.bg[3].drawScanline = this.bgModes[this.backgroundMode];
    } else {
      this.bg[3].enabled = false;
    }

    this.drawLayers.sort(this.layerComparator);
  }

  layerComparator(a: any, b: any): number {
    const diff = b.priority - a.priority;
    if (!diff) {
      if (a.bg && !b.bg) {
        return -1;
      } else if (!a.bg && b.bg) {
        return 1;
      }

      return b.index - a.index;
    }

    return diff;
  }

  accessMapMode0(base: number, size: number, x: number, yBase: number, out: SharedMap) {
    let offset = base + ((x >> 2) & 0x3e) + yBase;

    if (size & 1) {
      offset += (x & 0x100) << 3;
    }

    const mem = this.vram?.loadU16(offset) || 0;
    out.tile = mem & 0x03ff;
    out.hflip = !!(mem & 0x0400);
    out.vflip = !!(mem & 0x0800);
    out.palette = (mem & 0xf000) >> 8; // This is shifted up 4 to make pushPixel faster
  }

  accessMapMode1(base: number, size: number, x: number, yBase: number, out: SharedMap) {
    const offset = base + (x >> 3) + yBase;
    out.tile = this.vram?.loadU8(offset) || 0;
  }

  accessTile(base: number, tile: number, y: number) {
    let offset = base + (tile << 5);
    offset |= y << 2;

    return this.vram?.load32(offset) || 0;
  }

  static pushPixel(
    layer: number,
    map: GameBoyAdvanceOBJ,
    video: GameBoyAdvanceSoftwareRenderer,
    row: number,
    x: number,
    offset: number,
    backing: Backing,
    mask: number,
    raw: boolean,
  ) {
    let index = 0;
    if (!raw) {
      if (this.multipalette) {
        index = (row >> (x << 3)) & 0xff;
      } else {
        index = (row >> (x << 2)) & 0xf;
      }

      // Index 0 is transparent
      if (!index) {
        return;
      } else if (!this.multipalette) {
        index |= map.palette;
      }
    }

    let stencil = video.WRITTEN_MASK;
    const oldStencil = backing.stencil[offset];
    const blend = video.blendMode;
    if (video.objwinActive) {
      if (oldStencil & video.OBJWIN_MASK) {
        if (video.windows[3].enabled[layer]) {
          video.setBlendEnabled(layer, !!video.windows[3].special && !!video.target1[layer], blend);
          if (video.windows[3].special && video.alphaEnabled) mask |= video.target1[layer];
          stencil |= video.OBJWIN_MASK;
        } else {
          return;
        }
      } else if (video.windows[2].enabled[layer]) {
        video.setBlendEnabled(layer, !!video.windows[2].special && !!video.target1[layer], blend);
        if (video.windows[2].special && video.alphaEnabled) mask |= video.target1[layer];
      } else {
        return;
      }
    }

    if (mask & TARGET1_MASK && oldStencil & TARGET2_MASK) {
      video.setBlendEnabled(layer, true, 1);
    }

    let pixel = raw ? row : video.palette?.accessColor(layer, index) || 0;

    if (mask & TARGET1_MASK) {
      video.setBlendEnabled(layer, !!blend, blend);
    }

    let highPriority = (mask & video.PRIORITY_MASK) < (oldStencil & video.PRIORITY_MASK);
    // Backgrounds can draw over each other, too.
    if ((mask & video.PRIORITY_MASK) == (oldStencil & video.PRIORITY_MASK)) {
      highPriority = !!(mask & BACKGROUND_MASK);
    }

    if (!(oldStencil & video.WRITTEN_MASK)) {
      // Nothing here yet, just continue
      stencil |= mask;
    } else if (highPriority) {
      // We are higher priority
      if (mask & TARGET1_MASK && oldStencil & TARGET2_MASK) {
        pixel = video.palette?.mix(video.blendA, pixel, video.blendB, backing.color[offset]) || 0;
      }
      // We just drew over something, so it doesn't make sense for us to be a TARGET1 anymore...
      stencil |= mask & ~TARGET1_MASK;
    } else if ((mask & video.PRIORITY_MASK) > (oldStencil & video.PRIORITY_MASK)) {
      // We're below another layer, but might be the blend target for it
      stencil = oldStencil & ~(TARGET1_MASK | TARGET2_MASK);
      if (mask & TARGET2_MASK && oldStencil & TARGET1_MASK) {
        pixel = video.palette?.mix(video.blendB, pixel, video.blendA, backing.color[offset]) || 0;
      } else {
        return;
      }
    } else {
      return;
    }

    if (mask & video.OBJWIN_MASK) {
      // We ARE the object window, don't draw pixels!
      backing.stencil[offset] |= video.OBJWIN_MASK;

      return;
    }
    backing.color[offset] = pixel;
    backing.stencil[offset] = stencil;
  }

  drawScanlineBlank(backing: Backing) {
    for (let x = 0; x < HORIZONTAL_PIXELS; ++x) {
      backing.color[x] = 0xffff;
      backing.stencil[x] = 0;
    }
  }

  prepareScanline(backing: Backing) {
    for (let x = 0; x < HORIZONTAL_PIXELS; ++x) {
      backing.stencil[x] = this.target2[LAYER_BACKDROP];
    }
  }

  drawScanlineBGMode0(backing: Backing, bg: any, start: number, end: number) {
    const video = this.video;
    if (!video) return;

    let x;
    const y = video.vcount;
    let offset = start;
    const xOff = bg.x;
    const yOff = bg.y;
    let localX, localXLo;
    let localY = y + yOff;
    if (this.mosaic) localY -= y % video.bgMosaicY;
    const localYLo = localY & 0x7;
    let mosaicX;
    const screenBase = bg.screenBase;
    const charBase = bg.charBase;
    const size = bg.size;
    const index = bg.index;
    const map = video?.sharedMap;
    const paletteShift = bg.multipalette ? 1 : 0;

    let mask = video.target2[index] | (bg.priority << 1) | BACKGROUND_MASK;
    if (video.blendMode == 1 && video.alphaEnabled) {
      mask |= video.target1[index];
    }

    let yBase = (localY << 3) & 0x7c0;
    if (size == 2) {
      yBase += (localY << 3) & 0x800;
    } else if (size == 3) {
      yBase += (localY << 4) & 0x1000;
    }

    const xMask = size & 1 ? 0x1ff : 0xff;
    video.accessMapMode0(screenBase, size, (start + xOff) & xMask, yBase, map);
    let tileRow = video.accessTile(
      charBase,
      map.tile << paletteShift,
      (!map.vflip ? localYLo : 7 - localYLo) << paletteShift,
    );

    for (x = start; x < end; ++x) {
      localX = (x + xOff) & xMask;
      mosaicX = this.mosaic ? offset % video.bgMosaicX : 0;
      localX -= mosaicX;
      localXLo = localX & 0x7;
      if (!paletteShift) {
        if (!localXLo || (this.mosaic && !mosaicX)) {
          video.accessMapMode0(screenBase, size, localX, yBase, map);
          tileRow = video.accessTile(charBase, map.tile, !map.vflip ? localYLo : 7 - localYLo);
          if (!tileRow && !localXLo) {
            x += 7;
            offset += 8;
            continue;
          }
        }
      } else {
        if (!localXLo || (this.mosaic && !mosaicX)) {
          video.accessMapMode0(screenBase, size, localX, yBase, map);
        }
        if (!(localXLo & 0x3) || (this.mosaic && !mosaicX)) {
          tileRow = video.accessTile(
            charBase + (!!(localX & 0x4) == !map.hflip ? 4 : 0),
            map.tile << 1,
            (!map.vflip ? localYLo : 7 - localYLo) << 1,
          );
          if (!tileRow && !(localXLo & 0x3)) {
            x += 3;
            offset += 4;
            continue;
          }
        }
      }
      if (map.hflip) localXLo = 7 - localXLo;
      bg.pushPixel(index, map, video, tileRow, localXLo, offset, backing, mask, false);
      offset++;
    }
  }

  drawScanlineBGMode2(backing: Backing, bg: any, start: number, end: number) {
    const video = this.video;
    if (!video) return;

    let x;
    const y = video.vcount;
    let offset = start;
    let localX, localY;
    const screenBase = bg.screenBase;
    const charBase = bg.charBase;
    const size = bg.size;
    const sizeAdjusted = 128 << size;
    const index = bg.index;
    const map = video.sharedMap;
    let color;

    let mask = video.target2[index] | (bg.priority << 1) | BACKGROUND_MASK;
    if (video.blendMode == 1 && video.alphaEnabled) {
      mask |= video.target1[index];
    }

    let yBase;

    for (x = start; x < end; ++x) {
      localX = bg.dx * x + bg.sx;
      localY = bg.dy * x + bg.sy;
      if (this.mosaic) {
        localX -= (x % video.bgMosaicX) * bg.dx + (y % video.bgMosaicY) * bg.dmx;
        localY -= (x % video.bgMosaicX) * bg.dy + (y % video.bgMosaicY) * bg.dmy;
      }
      if (bg.overflow) {
        localX &= sizeAdjusted - 1;
        if (localX < 0) {
          localX += sizeAdjusted;
        }
        localY &= sizeAdjusted - 1;
        if (localY < 0) {
          localY += sizeAdjusted;
        }
      } else if (localX < 0 || localY < 0 || localX >= sizeAdjusted || localY >= sizeAdjusted) {
        offset++;
        continue;
      }
      yBase = ((localY << 1) & 0x7f0) << size;
      video.accessMapMode1(screenBase, size, localX, yBase, map);
      color =
        this.vram?.loadU8(charBase + (map.tile << 6) + ((localY & 0x7) << 3) + (localX & 0x7)) || 0;
      bg.pushPixel(index, map, video, color, 0, offset, backing, mask, false);
      offset++;
    }
  }

  drawScanlineBGMode3(backing: Backing, bg: any, start: number, end: number) {
    const video = this.video;
    if (!video) return;

    let x;
    const y = video.vcount;
    let offset = start;
    let localX, localY;
    const index = bg.index;
    const map = video.sharedMap;
    let color;

    let mask = video.target2[index] | (bg.priority << 1) | BACKGROUND_MASK;
    if (video.blendMode == 1 && video.alphaEnabled) {
      mask |= video.target1[index];
    }

    for (x = start; x < end; ++x) {
      localX = bg.dx * x + bg.sx;
      localY = bg.dy * x + bg.sy;
      if (this.mosaic) {
        localX -= (x % video.bgMosaicX) * bg.dx + (y % video.bgMosaicY) * bg.dmx;
        localY -= (x % video.bgMosaicX) * bg.dy + (y % video.bgMosaicY) * bg.dmy;
      }
      if (localX < 0 || localY < 0 || localX >= HORIZONTAL_PIXELS || localY >= VERTICAL_PIXELS) {
        offset++;
        continue;
      }
      color = this.vram?.loadU16((localY * HORIZONTAL_PIXELS + localX) << 1);
      bg.pushPixel(index, map, video, color, 0, offset, backing, mask, true);
      offset++;
    }
  }

  drawScanlineBGMode4(backing: Backing, bg: any, start: number, end: number) {
    const video = this.video;
    if (!video) return;

    let x;
    const y = video.vcount;
    let offset = start;
    let localX, localY;
    const charBase = video.displayFrameSelect ? 0xa000 : 0;
    const index = bg.index;
    const map = video.sharedMap;
    let color;

    let mask = video.target2[index] | (bg.priority << 1) | BACKGROUND_MASK;
    if (video.blendMode == 1 && video.alphaEnabled) {
      mask |= video.target1[index];
    }

    for (x = start; x < end; ++x) {
      localX = bg.dx * x + bg.sx;
      localY = 0 | (bg.dy * x + bg.sy);
      if (this.mosaic) {
        localX -= (x % video.bgMosaicX) * bg.dx + (y % video.bgMosaicY) * bg.dmx;
        localY -= (x % video.bgMosaicX) * bg.dy + (y % video.bgMosaicY) * bg.dmy;
      }
      if (localX < 0 || localY < 0 || localX >= HORIZONTAL_PIXELS || localY >= VERTICAL_PIXELS) {
        offset++;
        continue;
      }
      color = this.vram?.loadU8(charBase + localY * HORIZONTAL_PIXELS + localX);
      bg.pushPixel(index, map, video, color, 0, offset, backing, mask, false);
      offset++;
    }
  }

  drawScanlineBGMode5(backing: Backing, bg: any, start: number, end: number) {
    const video = this.video;
    if (!video) return;

    let x;
    const y = video.vcount;
    let offset = start;
    let localX, localY;
    const charBase = video.displayFrameSelect ? 0xa000 : 0;
    const index = bg.index;
    const map = video.sharedMap;
    let color;
    let mask = video.target2[index] | (bg.priority << 1) | BACKGROUND_MASK;
    if (video.blendMode == 1 && video.alphaEnabled) {
      mask |= video.target1[index];
    }

    for (x = start; x < end; ++x) {
      localX = bg.dx * x + bg.sx;
      localY = bg.dy * x + bg.sy;
      if (this.mosaic) {
        localX -= (x % video.bgMosaicX) * bg.dx + (y % video.bgMosaicY) * bg.dmx;
        localY -= (x % video.bgMosaicX) * bg.dy + (y % video.bgMosaicY) * bg.dmy;
      }
      if (localX < 0 || localY < 0 || localX >= 160 || localY >= 128) {
        offset++;
        continue;
      }
      color = this.vram?.loadU16((charBase + (localY * 160 + localX)) << 1);
      bg.pushPixel(index, map, video, color, 0, offset, backing, mask, true);
      offset++;
    }
  }

  drawScanline(y: number, _: any) {
    const backing = this.scanline;
    if (this.forcedBlank) {
      this.drawScanlineBlank(backing);

      return;
    }

    this.prepareScanline(backing);
    let layer;
    let firstStart, firstEnd;
    let lastStart, lastEnd;
    this.vcount = y;
    // Draw lower priority first and then draw over them
    for (let i = 0; i < this.drawLayers.length; ++i) {
      layer = this.drawLayers[i];
      if (!layer.enabled) {
        continue;
      }
      this.objwinActive = false;
      if (!(this.win0 || this.win1 || this.objwin)) {
        this.setBlendEnabled(layer.index, !!this.target1[layer.index], this.blendMode);
        layer.drawScanline(backing, layer, 0, HORIZONTAL_PIXELS);
      } else {
        firstStart = 0;
        firstEnd = HORIZONTAL_PIXELS;
        lastStart = 0;
        lastEnd = HORIZONTAL_PIXELS;
        if (this.win0 && y >= this.win0Top && y < this.win0Bottom) {
          if (this.windows[0].enabled[layer.index]) {
            this.setBlendEnabled(
              layer.index,
              !!this.windows[0].special && !!this.target1[layer.index],
              this.blendMode,
            );
            layer.drawScanline(backing, layer, this.win0Left, this.win0Right);
          }
          firstStart = Math.max(firstStart, this.win0Left);
          firstEnd = Math.min(firstEnd, this.win0Left);
          lastStart = Math.max(lastStart, this.win0Right);
          lastEnd = Math.min(lastEnd, this.win0Right);
        }
        if (this.win1 && y >= this.win1Top && y < this.win1Bottom) {
          if (this.windows[1].enabled[layer.index]) {
            this.setBlendEnabled(
              layer.index,
              !!this.windows[1].special && !!this.target1[layer.index],
              this.blendMode,
            );
            if (
              !this.windows[0].enabled[layer.index] &&
              (this.win1Left < firstStart || this.win1Right < lastStart)
            ) {
              // We've been cut in two by window 0!
              layer.drawScanline(backing, layer, this.win1Left, firstStart);
              layer.drawScanline(backing, layer, lastEnd, this.win1Right);
            } else {
              layer.drawScanline(backing, layer, this.win1Left, this.win1Right);
            }
          }
          firstStart = Math.max(firstStart, this.win1Left);
          firstEnd = Math.min(firstEnd, this.win1Left);
          lastStart = Math.max(lastStart, this.win1Right);
          lastEnd = Math.min(lastEnd, this.win1Right);
        }
        // Do last two
        if (
          this.windows[2].enabled[layer.index] ||
          (this.objwin && this.windows[3].enabled[layer.index])
        ) {
          // WINOUT/OBJWIN
          this.objwinActive = !!this.objwin;
          this.setBlendEnabled(
            layer.index,
            !!this.windows[2].special && !!this.target1[layer.index],
            this.blendMode,
          ); // Window 3 handled in pushPixel
          if (firstEnd > lastStart) {
            layer.drawScanline(backing, layer, 0, HORIZONTAL_PIXELS);
          } else {
            if (firstEnd) {
              layer.drawScanline(backing, layer, 0, firstEnd);
            }
            if (lastStart < HORIZONTAL_PIXELS) {
              layer.drawScanline(backing, layer, lastStart, HORIZONTAL_PIXELS);
            }
            if (lastEnd < firstStart) {
              layer.drawScanline(backing, layer, lastEnd, firstStart);
            }
          }
        }

        this.setBlendEnabled(
          LAYER_BACKDROP,
          !!(this.target1[LAYER_BACKDROP] && !!this.windows[2].special),
          this.blendMode,
        );
      }
      if (layer.bg) {
        layer.sx += layer.dmx;
        layer.sy += layer.dmy;
      }
    }

    this.finishScanline(backing);
  }

  finishScanline(backing: Backing) {
    let color = 0;
    const bd = this.palette?.accessColor(LAYER_BACKDROP, 0) || 0;
    let xx = this.vcount * HORIZONTAL_PIXELS * 4;
    const isTarget2 = this.target2[LAYER_BACKDROP];
    for (let x = 0; x < HORIZONTAL_PIXELS; ++x) {
      if (backing.stencil[x] & this.WRITTEN_MASK) {
        color = backing.color[x];
        if (isTarget2 && backing.stencil[x] & TARGET1_MASK) {
          color = this.palette?.mix(this.blendA, color, this.blendB, bd) || 0;
        }
        this.palette?.convert16To32(color, this.sharedColor);
      } else {
        this.palette?.convert16To32(bd, this.sharedColor);
      }
      if (this.pixelData) {
        this.pixelData.data[xx++] = this.sharedColor[0];
        this.pixelData.data[xx++] = this.sharedColor[1];
        this.pixelData.data[xx++] = this.sharedColor[2];
      }
      xx++;
    }
  }

  startDraw() {
    return;
  } // Nothing to do

  finishDraw(caller: any) {
    this.bg[2].sx = this.bg[2].refx;
    this.bg[2].sy = this.bg[2].refy;
    this.bg[3].sx = this.bg[3].refx;
    this.bg[3].sy = this.bg[3].refy;
    caller.finishDraw(this.pixelData);
  }
}
