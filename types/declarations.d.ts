interface Window {
  webkitAudioContext: typeof AudioContext;
  finishDraw: any;
  queueFrame: (f: TimerHandler) => void;
}

declare module '*.gba';
