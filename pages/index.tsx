import { useEffect, useRef, useState } from 'react';
import { Maximize } from 'components/Maximize';
import { Pause } from 'components/Pause';
import { Power } from 'components/Power';
import { Sound } from 'components/Sound';
import { GameBoyAdvance, logLvs } from 'src/gba';
import { base64ToArrayBuffer } from 'src/utils/biosbin';

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
  if (window.confirm('Quit game, OK?')) {
    location.reload();
  }
};

const Index = () => {
  const [initialized, setInitialized] = useState<boolean>(false);

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
      const canvas = screenRef.current;
      gba.setCanvas(canvas);
      gba.logLevel = logLvs.ERROR;
      gba.setBios(base64ToArrayBuffer(bios), false);
      setInitialized(true);
    }
  }, [gba, screenRef.current, initialized]); // eslint-disable-line

  return (
    <div className="App">
      <div id="frame">
        <canvas id="screen" width="240" height="160" ref={screenRef}></canvas>
      </div>

      <div id="controls">
        <Power isRun={isRun} turnOn={run} turnOff={powerOff} />

        <Pause isRun={isRun} paused={paused} toggle={togglePause} />

        <Maximize isRun={isRun} ref={screenRef} />

        {initialized && <Sound mute={mute} toggleSound={toggleSound} setVolume={setVolume} />}
      </div>
    </div>
  );
};

export default Index;
