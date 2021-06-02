import { GameBoyAdvance, logLvs } from './gba';
import { biosBin } from './utils/biosbin';

let gba: GameBoyAdvance | null | undefined;
let runCommands: (() => any)[] = [];
let isRun = false;

const pauseBtn = document.getElementById('pause') as HTMLImageElement;
let pauseBtnDisabled = true;

try {
  gba = new GameBoyAdvance();
  gba.keypad.eatInput = true;
  gba.setLogger((level: number, error: Error) => {
    console.log(error);

    if (!gba) return;
    gba.pause();
    pauseBtnDisabled = false;

    const screen = document.getElementById('screen') as HTMLElement;
    if (screen.getAttribute('class') === 'dead') {
      console.log('We appear to have crashed multiple times without reseting.');

      return;
    }
    setPixelated(true);

    const crash = document.createElement('img');
    crash.setAttribute('id', 'crash');
    crash.setAttribute('src', 'resources/crash.png');

    if (screen.parentElement) screen.parentElement.insertBefore(crash, screen);
    screen.setAttribute('class', 'dead');
  });
} catch (exception) {
  console.error(exception);
  gba = null;
}

window.onload = () => {
  if (gba) {
    const canvas = document.getElementById('screen') as HTMLCanvasElement;
    gba.setCanvas(canvas);

    gba.logLevel = logLvs.ERROR;

    gba.setBios(biosBin, false);

    if (!gba.audio.context) {
      // Remove the sound box if sound isn't available
      const soundbox = document.getElementById('sound') as HTMLElement;
      if (soundbox.parentElement) soundbox.parentElement.removeChild(soundbox);
    }
  } else {
    const dead = document.getElementById('controls') as HTMLElement;
    if (dead.parentElement) dead.parentElement.removeChild(dead);
  }
};

export const fadeOut = (id: string, nextId: string | null, kill: any) => {
  const e = document.getElementById(id) as HTMLElement;
  const e2 = document.getElementById(nextId || '') as HTMLElement;
  if (!e) return;

  const removeSelf = () => {
    if (kill) {
      if (e.parentElement) e.parentElement.removeChild(e);
    } else {
      e.setAttribute('class', 'dead');
      e.removeEventListener('webkitTransitionEnd', removeSelf);
      e.removeEventListener('oTransitionEnd', removeSelf);
      e.removeEventListener('transitionend', removeSelf);
    }
    if (e2) {
      e2.setAttribute('class', 'hidden');
      setTimeout(() => {
        e2.removeAttribute('class');
      }, 0);
    }
  };

  e.addEventListener('webkitTransitionEnd', removeSelf, false);
  e.addEventListener('oTransitionEnd', removeSelf, false);
  e.addEventListener('transitionend', removeSelf, false);
  e.setAttribute('class', 'hidden');
};

const run = (file: Blob) => {
  const dead = document.getElementById('loader') as any;
  dead.value = '';

  if (!gba) return;

  gba.loadRomFromFile(file, (result: boolean) => {
    if (!gba) return;

    if (result) {
      isRun = true;

      runCommands.forEach((cmd) => cmd());
      runCommands = [];

      gba.runStable();
    }
  });
};

const uploadSavedataPending = (file: Blob) => {
  if (!gba) return;
  runCommands.push(() => {
    gba && gba.loadSavedataFromFile(file);
  });
};

const togglePause = () => {
  if (!gba) return;
  gba.paused ? gba.runStable() : gba.pause();
};

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

export const lcdFade = (
  context: CanvasRenderingContext2D,
  target: CanvasRenderingContext2D,
  callback: () => void,
) => {
  let i = 0;

  const drawInterval = setInterval(() => {
    i++;
    const pixelData = context.getImageData(0, 0, 240, 160);
    for (let y = 0; y < 160; ++y) {
      for (let x = 0; x < 240; ++x) {
        const xDiff = Math.abs(x - 120);
        const yDiff = Math.abs(y - 80) * 0.8;
        const xFactor = (120 - i - xDiff) / 120;
        const yFactor = (80 - i - (y & 1) * 10 - yDiff + Math.pow(xDiff, 1 / 2)) / 80;
        pixelData.data[(x + y * 240) * 4 + 3] *=
          Math.pow(xFactor, 1 / 3) * Math.pow(yFactor, 1 / 2);
      }
    }
    context.putImageData(pixelData, 0, 0);
    target.clearRect(0, 0, 480, 320);
    i > 40 ? clearInterval(drawInterval) : callback();
  }, 50);
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

const fullScreen = () => {
  document.getElementById('screen')?.requestFullscreen();
};

const volume = document.getElementById('volume') as HTMLInputElement;
volume?.addEventListener('change', (e: Event) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  setVolume(Number(e.target.value));
});
volume?.addEventListener('input', (e: Event) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  setVolume(Number(e.target.value));
});

const soundToggle = document.getElementById('soundtoggle') as HTMLInputElement;
const soundIcon = document.getElementById('soundtoggleicon') as HTMLImageElement;
soundToggle.addEventListener('change', (e) => {
  if (!gba) return;

  gba.audio.masterEnable = soundToggle.checked;
  if (gba.audio.context?.state !== 'running') {
    gba.audio.context?.resume();
  }

  if (soundToggle.checked) {
    soundIcon.src = './resources/volume_on.svg';
    volume.disabled = false;
  } else {
    soundIcon.src = './resources/volume_off.svg';
    volume.disabled = true;
  }
});

const loader = document.getElementById('loader');
loader?.addEventListener('change', (e: Event) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  if (e.target.files) run(e.target.files[0]);
});
loader?.addEventListener('click', (e: Event) => {
  if (isRun) {
    window.alert('Quit Game, OK?');
    window.location.reload();
  }
});

document.getElementById('saveloader')?.addEventListener('change', (e: Event) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  if (e.target.files) uploadSavedataPending(e.target.files[0]);
});

pauseBtn?.addEventListener('click', () => {
  if (pauseBtnDisabled && isRun) {
    togglePause();
    pauseBtn.src = gba?.paused ? './resources/play.svg' : './resources/pause.svg';
  }
});

document.getElementById('screenshot')?.addEventListener('click', () => isRun && screenshot());
document.getElementById('fullscreen')?.addEventListener('click', () => isRun && fullScreen());
