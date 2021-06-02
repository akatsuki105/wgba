import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { GameBoyAdvance, logLvs } from 'src/gba';
import { base64ToArrayBuffer } from 'src/utils/biosbin';

let initialized = false;
let gba: GameBoyAdvance | null | undefined;
let runCommands: (() => any)[] = [];
let isRun = false;

const run = (file: Blob) => {
  if (!gba) return;

  gba.loadRomFromFile(file, (result: boolean) => {
    if (!gba) return;

    if (result) {
      isRun = true;

      runCommands.forEach((cmd) => cmd());
      runCommands = [];

      console.log(gba);
      gba.runStable();
    }
  });
};

const togglePause = () => {
  if (!gba) return;
  gba.paused ? gba.runStable() : gba.pause();
};

const setVolume = (value: number) => {
  if (!gba) return;
  gba.audio.masterVolume = Math.pow(2, value) - 1;
};

const setPixelated = (pixelated: boolean) => {
  const screen = document.getElementById('screen') as HTMLCanvasElement;
  const context = screen.getContext('2d', { alpha: false });
  if (context) context.imageSmoothingEnabled = !pixelated;
};

const Index = () => {
  const screenshot = () => {
    if (!gba) return;

    const canvas = gba.indirectCanvas;
    if (!canvas) return;

    const data = canvas.toDataURL('image/png');

    const image = new Image();
    image.src = data;

    const w = window.open('');
    w?.document.write(image.outerHTML);
  };

  const [mute, setMute] = useState<boolean>(false);
  const toggleSound = () => {
    setMute(!mute);
    if (gba) {
      gba.audio.masterEnable = !mute;
      if (gba.audio.context) {
        if (gba.audio.context.state !== 'running') gba.audio.context.resume();
      }
    }
  };

  const screenRef = useRef<HTMLCanvasElement>(null);
  const powerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      gba = new GameBoyAdvance();
      gba.keypad.eatInput = true;
      gba.setLogger((level: number, error: Error) => {
        if (gba) gba.pause();
        setPixelated(true);
      });
    } catch (exception) {
      console.error(exception);
      gba = null;
    }
  }, []);

  useEffect(() => {
    if (initialized) return;

    if (gba && screenRef.current) {
      const biosBin = base64ToArrayBuffer(
        'BgAA6v7//+oFAADq/v//6v7//+oAAKDhDAAA6v7//+oC86DjAABd4wHToAMg0E0CAEAt6QIAXuUEAFDjCQAACwUAUOMHAAALAEC96A7wsOEPUC3pAQOg4wDgj+IE8BDlD1C96ATwXuIQQC3pBNBN4rAQzeEBQ6DjAkyE4rAA1OGyAM3hsBDd4QEAgOGwAMThAUOg4x8AoOMA8CnhAACg4wEDxOXTAKDjAPAp4bgAVOGwEN3hABAR4AAQIRC4EEQR8///CgFDoOMCTITisgDd4bAAxOEE0I3iEIC96A==\n',
      );

      const canvas = screenRef.current;
      gba.setCanvas(canvas);
      gba.logLevel = logLvs.ERROR;
      gba.setBios(biosBin, false);
      initialized = true;
    }
  }, [gba, screenRef.current]); // eslint-disable-line

  return (
    <div className="App">
      <div id="frame">
        <canvas id="screen" width="240" height="160" ref={screenRef}></canvas>
      </div>

      <div id="controls">
        <NextImage
          src="/images/power.svg"
          width="36"
          height="36"
          onClick={() => powerRef.current?.click()}
        />
        <input
          id="loader"
          type="file"
          accept=".gba"
          ref={powerRef}
          onChange={(e) => {
            e.target.files && run(e.target.files[0]);
          }}
        />

        <NextImage
          id="pause"
          src={isRun ? '/images/play.svg' : '/images/pause.svg'}
          width="36"
          height="36"
          onClick={() => isRun && togglePause()}
        />

        <NextImage
          id="screenshot"
          src="/images/camera.svg"
          width="36"
          height="36"
          onClick={() => isRun && screenshot()}
        />

        <NextImage
          id="fullscreen"
          src="/images/maximize.svg"
          width="36"
          height="36"
          onClick={() => isRun && screenRef.current?.requestFullscreen()}
        />

        {gba && !gba.audio.context && (
          <div id="sound" className="flex">
            <div>
              <NextImage
                src={mute ? '/images/volume_off.svg' : '/images/volume_on.svg'}
                width="36"
                height="36"
                onClick={toggleSound}
              />
            </div>
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              value="1"
              step="any"
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
