export const base64ToArrayBuffer = (base64: string) => {
  // https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }

  return bytes.buffer;
};

export const sleep = async (ms: number) => {
  return new Promise((r) => setTimeout(r, ms));
};
