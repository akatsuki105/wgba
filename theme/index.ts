import { old, black, green, gray, red, blue, white, orange } from './colors';

const theme = {
  buttonSize: {
    lg: 72,
    md: 48,
    sm: 36,
  },
  extraFontSize: 12,
  radius: 10,
  topBarSize: 72,
  fontWeight: 700,
  siteWidth: 1440,
  breakpoints: {
    xs: 380,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  color: {
    old,
    black,
    gray,
    red,
    blue,
    orange,
    green,
    primary: {
      light: blue[100],
      main: orange[500],
    },
    secondary: {
      main: green[500],
    },
    white,
  },
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 14,
    4: 24,
    5: 32,
    6: 48,
    7: 64,
    8: 72,
    9: 96,
  },
};

export default theme;
