const _base64ToArrayBuffer = (base64: string) => {
  // https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }

  return bytes.buffer;
};

export const biosBin = _base64ToArrayBuffer(
  'BgAA6v7//+oFAADq/v//6v7//+oAAKDhDAAA6v7//+oC86DjAABd4wHToAMg0E0CAEAt6QIAXuUEAFDjCQAACwUAUOMHAAALAEC96A7wsOEPUC3pAQOg4wDgj+IE8BDlD1C96ATwXuIQQC3pBNBN4rAQzeEBQ6DjAkyE4rAA1OGyAM3hsBDd4QEAgOGwAMThAUOg4x8AoOMA8CnhAACg4wEDxOXTAKDjAPAp4bgAVOGwEN3hABAR4AAQIRC4EEQR8///CgFDoOMCTITisgDd4bAAxOEE0I3iEIC96A==\n',
);
