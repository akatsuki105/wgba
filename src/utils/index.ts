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

export const getExtension = (s: string) => {
  return s.substr((~-s.lastIndexOf('.') >>> 0) + 2);
};

export const appendBuffer = (buffer1: ArrayBufferLike, buffer2: ArrayBufferLike) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

  return tmp.buffer;
};
