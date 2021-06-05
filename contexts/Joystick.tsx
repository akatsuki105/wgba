import React, { createContext, useCallback, useState } from 'react';

type JoystickState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

type JoystickContext = JoystickState & {
  set: (xy: [number, number]) => void;
};

const defaultState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const defaultContext = {
  ...defaultState,
  set: (xy: [number, number]) => {},
};

const threshold = 0.3;

export const JoystickContext = createContext<JoystickContext>(defaultContext);

export const JoystickProvider: React.FC<{ size: number }> = ({ size, children }) => {
  const n = size / 2; // neutral
  const [state, setState] = useState<JoystickState>(defaultState);

  const set = useCallback(
    (xy: [number, number]) => {
      const x = (xy[0] - n) / n;
      const y = (xy[1] - n) / n;
      const newState = { ...state };
      newState.right = x > threshold;
      newState.left = -x > threshold;
      newState.up = -y > threshold;
      newState.down = y > threshold;
      if (
        newState.right !== state.right ||
        newState.left !== state.left ||
        newState.up !== state.up ||
        newState.down !== state.down
      ) {
        setState(newState);
      }
  }, [state]); // eslint-disable-line

  return (
    <JoystickContext.Provider
      value={{
        ...state,
        set,
      }}
    >
      {children}
    </JoystickContext.Provider>
  );
};
