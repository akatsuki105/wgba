import { GameBoyAdvanceSoftwareRenderer } from './software';

const video = new GameBoyAdvanceSoftwareRenderer();
let proxyBacking: any = null;
let currentFrame = 0;

// use self instead of window on web worker
self.finishDraw = (pixelData: ImageData) => {
  // eslint-disable-next-line
  // @ts-ignore
  self.postMessage({ type: 'finish', backing: pixelData, frame: currentFrame }, null, [pixelData]);
};

// prettier-ignore
type DirtyType = 'DISPCNT' | 'BGCNT' | 'BGHOFS' | 'BGVOFS' | 'BGX' | 'BGY' | 'BGPA' | 'BGPB' | 'BGPC' | 'BGPD' | 'WIN0H' | 'WIN1H' | 'WIN0V' | 'WIN1V' | 'WININ' | 'WINOUT' | 'BLDCNT' | 'BLDALPHA' | 'BLDY' | 'MOSAIC' | 'memory'; //

type Dirty = {
  BGCNT: number[];
  BGHOFS: number[];
  BGVOFS: number[];
  BGX?: number[];
  BGY?: number[];
  BGPA?: number[];
  BGPB?: number[];
  BGPC?: number[];
  BGPD?: number[];
  BLDALPHA: number;
  BLDCNT: number;
  BLDY: number;
  DISPCNT: number;
  MOSAIC: number;
  WIN0H: number;
  WIN0V: number;
  WIN1H: number;
  WIN1V: number;
  WININ: number;
  WINOUT: number;
  memory: Memory;
};

type Memory = {
  oam: ArrayBuffer;
  palette: ArrayBuffer;
  vram: any[];
};

const receiveDirty = (dirty: Dirty) => {
  for (const type in dirty) {
    switch (type as DirtyType) {
      case 'DISPCNT':
        video.writeDisplayControl(dirty.DISPCNT);
        break;
      case 'BGCNT':
        dirty.BGCNT?.forEach((val, i) => video.writeBackgroundControl(Number(i), val));
        break;
      case 'BGHOFS':
        dirty.BGHOFS?.forEach((val, i) => video.writeBackgroundHOffset(Number(i), val));
        break;
      case 'BGVOFS':
        dirty.BGVOFS?.forEach((val, i) => video.writeBackgroundVOffset(Number(i), val));
        break;
      case 'BGX':
        dirty.BGX?.forEach((val, i) => video.writeBackgroundRefX(Number(i), val));
        break;
      case 'BGY':
        dirty.BGY?.forEach((val, i) => video.writeBackgroundRefY(Number(i), val));
        break;
      case 'BGPA':
        dirty.BGPA?.forEach((val, i) => video.writeBackgroundParamA(Number(i), val));
        break;
      case 'BGPB':
        dirty.BGPB?.forEach((val, i) => video.writeBackgroundParamB(Number(i), val));
        break;
      case 'BGPC':
        dirty.BGPC?.forEach((val, i) => video.writeBackgroundParamC(Number(i), val));
        break;
      case 'BGPD':
        dirty.BGPD?.forEach((val, i) => video.writeBackgroundParamD(Number(i), val));
        break;
      case 'WIN0H':
        video.writeWin0H(dirty.WIN0H);
        break;
      case 'WIN1H':
        video.writeWin1H(dirty.WIN1H);
        break;
      case 'WIN0V':
        video.writeWin0V(dirty.WIN0V);
        break;
      case 'WIN1V':
        video.writeWin1V(dirty.WIN1V);
        break;
      case 'WININ':
        video.writeWinIn(dirty.WININ);
        break;
      case 'WINOUT':
        video.writeWinOut(dirty.WINOUT);
        break;
      case 'BLDCNT':
        video.writeBlendControl(dirty.BLDCNT);
        break;
      case 'BLDALPHA':
        video.writeBlendAlpha(dirty.BLDALPHA);
        break;
      case 'BLDY':
        video.writeBlendY(dirty.BLDY);
        break;
      case 'MOSAIC':
        video.writeMosaic(dirty.MOSAIC);
        break;
      case 'memory':
        receiveMemory(dirty.memory);
        break;
    }
  }
};

const receiveMemory = (memory: Memory) => {
  if (memory.palette) video.palette?.overwrite(new Uint16Array(memory.palette));
  if (memory.oam) video.oam?.overwrite(new Uint16Array(memory.oam));

  if (memory.vram) {
    for (let i = 0; i < 12; ++i) {
      if (memory.vram[i]) video.vram?.insert(i << 12, new Uint16Array(memory.vram[i]));
    }
  }
};

const clear = () => {
  video.clear();
};

const start = (backing: ImageData) => {
  proxyBacking = backing;
  video.setBacking(backing);
};

const scanline = (data: ScanlineMsg) => {
  receiveDirty(data.dirty);
  video.drawScanline(data.y, proxyBacking);
};

const finish = (frame: number, scanlines: any[]) => {
  currentFrame = frame;
  let scanline = 0;
  for (let i = 0; i < scanlines.length; ++i) {
    for (let y = scanline; y < scanlines[i].y; ++y) {
      video.drawScanline(y, proxyBacking);
    }
    scanline = scanlines[i].y + 1;
    receiveDirty(scanlines[i].dirty);
    video.drawScanline(scanlines[i].y, proxyBacking);
  }

  for (let y = scanline; y < 160; ++y) {
    video.drawScanline(y, proxyBacking);
  }

  video.finishDraw(self);
};

type ClearMsg = {
  type: 'clear';
};

type StartMsg = {
  type: 'start';
  backing: ImageData;
};

type ScanlineMsg = {
  type: 'scanline';
  y: number;
  dirty: any;
};

type FinishMsg = {
  type: 'finish';
  frame: number;
  scanlines: {
    y: number;
    dirty: any;
  }[];
};

self.onmessage = (message: { data: ClearMsg | StartMsg | ScanlineMsg | FinishMsg }) => {
  const messageType = message.data.type;

  switch (messageType) {
    case 'clear': {
      clear();
      break;
    }
    case 'start': {
      const data = message.data as StartMsg;
      start(data.backing);
      break;
    }
    case 'scanline': {
      const data = message.data as ScanlineMsg;
      scanline(data);
      break;
    }
    case 'finish': {
      const data = message.data as FinishMsg;
      finish(data.frame, data.scanlines);
      break;
    }
  }
};
