import { useEffect, useRef, useState } from 'react';
import { Controller } from 'components/Controller';
import { Frame } from 'components/Frame';
import { Screen } from 'components/Screen';
import { useResponsive } from 'hooks/useResponsive';
import { GameBoyAdvance, logLvs } from 'src/gba';
import { base64ToArrayBuffer } from 'src/utils';

let gba: GameBoyAdvance | null | undefined;
let runCommands: (() => any)[] = [];

const bios =
  'BgAA6v7//+oFAADq/v//6v7//+oAAKDhDAAA6v7//+oC86DjAABd4wHToAMg0E0CAEAt6QIAXuUEAFDjCQAACwUAUOMHAAALAEC96A7wsOEPUC3pAQOg4wDgj+IE8BDlD1C96ATwXuIQQC3pBNBN4rAQzeEBQ6DjAkyE4rAA1OGyAM3hsBDd4QEAgOGwAMThAUOg4x8AoOMA8CnhAACg4wEDxOXTAKDjAPAp4bgAVOGwEN3hABAR4AAQIRC4EEQR8///CgFDoOMCTITisgDd4bAAxOEE0I3iEIC96A==\n';

const setVolume = (value: number) => {
  if (!gba) return;
  gba.audio.masterVolume = Math.pow(2, value) - 1;
};

const setPixelated = (pixelated: boolean) => {
  const screen = document.getElementById('screen') as HTMLCanvasElement;
  const context = screen.getContext('2d', { alpha: false });
  if (context) context.imageSmoothingEnabled = !pixelated;
};

const powerOff = () => {
  if (window.confirm('Quit game, OK?')) location.reload();
};

const Index = () => {
  const [initialized, setInitialized] = useState<boolean>(false);
  const media = useResponsive();

  const [isRun, setIsRun] = useState<boolean>(false);
  const run = (file: Blob) => {
    if (!gba) return;

    gba.loadRomFromFile(file, (result: boolean) => {
      if (!gba) return;

      if (result) {
        setIsRun(true);

        runCommands.forEach((cmd) => cmd());
        runCommands = [];

        gba.runStable();
      }
    });
  };

  const [paused, setPaused] = useState<boolean>(false);
  const togglePause = () => {
    if (!gba) return;
    gba.paused ? gba.runStable() : gba.pause();
    setPaused(gba.paused);
  };

  const [mute, setMute] = useState<boolean>(true);
  const toggleSound = () => {
    const old = mute;
    setMute(!mute);
    if (gba) {
      gba.audio.masterEnable = old;
      if (gba.audio.context) {
        if (gba.audio.context.state !== 'running') gba.audio.context.resume();
      }
    }
  };

  const screenRef = useRef<HTMLCanvasElement>(null);

  const [fps, setFPS] = useState<number>(0);
  useEffect(() => {
    const w = new Worker(new URL('../src/video/worker.ts', import.meta.url));
    try {
      gba = new GameBoyAdvance(w, setFPS as (f: number) => void);
      gba.keypad.eatInput = true;
      gba.isMobile = ['xs', 'sm'].includes(media);
      gba.setLogger((level: number, error: Error) => {
        if (gba) gba.pause();
        setPixelated(true);
      });
    } catch (exception) {
      console.error(exception);
      gba = null;
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (initialized) return;

    if (gba && screenRef.current) {
      const canvas = screenRef.current;
      gba.setCanvas(canvas);
      gba.logLevel = logLvs.ERROR;
      gba.setBios(base64ToArrayBuffer(bios), false);
      setInitialized(true);
    }
  }, [gba, screenRef.current, initialized]); // eslint-disable-line

  return (
    <div className="App">
      <Frame fps={fps}>
        <Screen ref={screenRef} />
      </Frame>

      <Controller isRun={isRun} turnOn={run} turnOff={powerOff} toggleSound={toggleSound} />
    </div>
  );
};

export default Index;
