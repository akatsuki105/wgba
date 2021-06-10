import { GameBoyAdvance } from './gba';

const validKeyIds = ['A', 'B', 'SELECT', 'START', 'RIGHT', 'LEFT', 'UP', 'DOWN', 'R', 'L'];

const keyIdx = {
  A: 0,
  B: 1,
  SELECT: 2,
  START: 3,
  RIGHT: 4,
  LEFT: 5,
  UP: 6,
  DOWN: 7,
  R: 8,
  L: 9,
} as const;

export class GameBoyAdvanceKeypad {
  core: GameBoyAdvance;

  KEYCODE_LEFT: string;
  KEYCODE_UP: string;
  KEYCODE_RIGHT: string;
  KEYCODE_DOWN: string;
  KEYCODE_START: string;
  KEYCODE_SELECT: string;
  KEYCODE_A: string;
  KEYCODE_B: string;
  KEYCODE_L: string;
  KEYCODE_R: string;

  GAMEPAD_LEFT: number;
  GAMEPAD_UP: number;
  GAMEPAD_RIGHT: number;
  GAMEPAD_DOWN: number;
  GAMEPAD_START: number;
  GAMEPAD_SELECT: number;
  GAMEPAD_A: number;
  GAMEPAD_B: number;
  GAMEPAD_L: number;
  GAMEPAD_R: number;
  GAMEPAD_THRESHOLD: number;
  currentDown: number;
  eatInput: boolean;
  gamepads: Gamepad[];
  remappingKeyId: string;

  constructor(core: GameBoyAdvance) {
    this.core = core;

    this.KEYCODE_LEFT = 'ArrowLeft';
    this.KEYCODE_UP = 'ArrowUp';
    this.KEYCODE_RIGHT = 'ArrowRight';
    this.KEYCODE_DOWN = 'ArrowDown';
    this.KEYCODE_START = 'Enter';
    this.KEYCODE_SELECT = 'Backspace';
    this.KEYCODE_A = 'KeyX';
    this.KEYCODE_B = 'KeyZ';
    this.KEYCODE_L = 'KeyA';
    this.KEYCODE_R = 'KeyS';

    this.GAMEPAD_LEFT = 14;
    this.GAMEPAD_UP = 12;
    this.GAMEPAD_RIGHT = 15;
    this.GAMEPAD_DOWN = 13;
    this.GAMEPAD_START = 9;
    this.GAMEPAD_SELECT = 8;
    this.GAMEPAD_A = 1;
    this.GAMEPAD_B = 0;
    this.GAMEPAD_L = 4;
    this.GAMEPAD_R = 5;
    this.GAMEPAD_THRESHOLD = 0.2;

    this.currentDown = 0x03ff;
    this.eatInput = false;

    this.gamepads = [];

    this.remappingKeyId = '';
  }

  keyboardHandler(e: KeyboardEvent) {
    // Check for a remapping
    if (this.remappingKeyId != '') {
      this.remapKeycode(this.remappingKeyId, e.code);
      this.remappingKeyId = '';
      e.preventDefault();

      return; // Could do an else and wrap the rest of the function in it, but this is cleaner
    }

    // rToggle is for guard emulator's crash due to pressing up-and-down or right-and-left key pair at once
    let [toggle, rToggle] = [0, 0];
    switch (e.code) {
      case this.KEYCODE_START:
        toggle = keyIdx.START;
        break;
      case this.KEYCODE_SELECT:
        toggle = keyIdx.SELECT;
        break;
      case this.KEYCODE_A:
        toggle = keyIdx.A;
        break;
      case this.KEYCODE_B:
        toggle = keyIdx.B;
        break;
      case this.KEYCODE_L:
        toggle = keyIdx.L;
        break;
      case this.KEYCODE_R:
        toggle = keyIdx.R;
        break;
      case this.KEYCODE_UP:
        toggle = keyIdx.UP;
        rToggle = keyIdx.DOWN;
        break;
      case this.KEYCODE_RIGHT:
        toggle = keyIdx.RIGHT;
        rToggle = keyIdx.LEFT;
        break;
      case this.KEYCODE_DOWN:
        toggle = keyIdx.DOWN;
        rToggle = keyIdx.UP;
        break;
      case this.KEYCODE_LEFT:
        toggle = keyIdx.LEFT;
        rToggle = keyIdx.RIGHT;
        break;
      default:
        return;
    }

    toggle = 1 << toggle;
    e.type == 'keydown' ? (this.currentDown &= ~toggle) : (this.currentDown |= toggle);

    if (rToggle > 0) {
      rToggle = 1 << rToggle;
      e.type == 'keydown' && (this.currentDown |= rToggle);
    }

    this.eatInput && e.preventDefault();
  }

  gamepadHandler(gamepad: Gamepad) {
    let value = 0;
    if (gamepad.buttons[this.GAMEPAD_LEFT].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.LEFT;
    }
    if (gamepad.buttons[this.GAMEPAD_UP].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.UP;
    }
    if (gamepad.buttons[this.GAMEPAD_RIGHT].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.RIGHT;
    }
    if (gamepad.buttons[this.GAMEPAD_DOWN].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.DOWN;
    }
    if (gamepad.buttons[this.GAMEPAD_START].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.START;
    }
    if (gamepad.buttons[this.GAMEPAD_SELECT].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.SELECT;
    }
    if (gamepad.buttons[this.GAMEPAD_A].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.A;
    }
    if (gamepad.buttons[this.GAMEPAD_B].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.B;
    }
    if (gamepad.buttons[this.GAMEPAD_L].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.L;
    }
    if (gamepad.buttons[this.GAMEPAD_R].value > this.GAMEPAD_THRESHOLD) {
      value |= 1 << keyIdx.R;
    }

    this.currentDown = ~value & 0x3ff;
  }

  gamepadConnectHandler(gamepad: Gamepad) {
    this.gamepads.push(gamepad);
  }

  gamepadDisconnectHandler(gamepad: Gamepad) {
    this.gamepads = this.gamepads.filter((other: Gamepad): boolean => {
      return other != gamepad;
    });
  }

  pollGamepads() {
    const navigatorList = navigator.getGamepads() || [];

    // Let's all give a shout out to Chrome for making us get the gamepads EVERY FRAME
    /* How big of a performance draw is this? Would it be worth letting users know? */
    if (navigatorList.length) this.gamepads = [];

    for (let i = 0; i < navigatorList.length; ++i) {
      if (navigatorList[i]) {
        this.gamepads.push(navigatorList[i] as Gamepad);
      }
    }

    this.gamepads.length > 0 && this.gamepadHandler(this.gamepads[0]);
  }

  registerHandlers() {
    window.addEventListener('keydown', this.keyboardHandler.bind(this), true);
    window.addEventListener('keyup', this.keyboardHandler.bind(this), true);
  }

  // keyId is ["A", "B", "SELECT", "START", "RIGHT", "LEFT", "UP", "DOWN", "R", "L"]
  initKeycodeRemap(keyId: string) {
    // Ensure valid keyId
    if (validKeyIds.indexOf(keyId) != -1) {
      this.remappingKeyId = keyId; // If remappingKeyId holds a value, the keydown event above will wait for the next keypress to assign the keycode
    }
  }

  // keyId is ["A", "B", "SELECT", "START", "RIGHT", "LEFT", "UP", "DOWN", "R", "L"]
  remapKeycode(keyId: string, keycode: string) {
    switch (keyId) {
      case 'A':
        this.KEYCODE_A = keycode;
        break;
      case 'B':
        this.KEYCODE_B = keycode;
        break;
      case 'SELECT':
        this.KEYCODE_SELECT = keycode;
        break;
      case 'START':
        this.KEYCODE_START = keycode;
        break;
      case 'RIGHT':
        this.KEYCODE_RIGHT = keycode;
        break;
      case 'LEFT':
        this.KEYCODE_LEFT = keycode;
        break;
      case 'UP':
        this.KEYCODE_UP = keycode;
        break;
      case 'DOWN':
        this.KEYCODE_DOWN = keycode;
        break;
      case 'R':
        this.KEYCODE_R = keycode;
        break;
      case 'L':
        this.KEYCODE_L = keycode;
        break;
    }
  }

  setGBAKey(key: keyof typeof keyIdx, state: 'keydown' | 'keyup') {
    let [toggle, rToggle] = [0, 0];
    switch (key) {
      case 'START':
        toggle = keyIdx.START;
        break;
      case 'SELECT':
        toggle = keyIdx.SELECT;
        break;
      case 'A':
        toggle = keyIdx.A;
        break;
      case 'B':
        toggle = keyIdx.B;
        break;
      case 'L':
        toggle = keyIdx.L;
        break;
      case 'R':
        toggle = keyIdx.R;
        break;
      case 'UP':
        toggle = keyIdx.UP;
        rToggle = keyIdx.DOWN;
        break;
      case 'RIGHT':
        toggle = keyIdx.RIGHT;
        rToggle = keyIdx.LEFT;
        break;
      case 'DOWN':
        toggle = keyIdx.DOWN;
        rToggle = keyIdx.UP;
        break;
      case 'LEFT':
        toggle = keyIdx.LEFT;
        rToggle = keyIdx.RIGHT;
        break;
      default:
        return;
    }

    toggle = 1 << toggle;
    state == 'keydown' ? (this.currentDown &= ~toggle) : (this.currentDown |= toggle);

    if (rToggle > 0) {
      rToggle = 1 << rToggle;
      state == 'keydown' && (this.currentDown |= rToggle);
    }
  }
}
