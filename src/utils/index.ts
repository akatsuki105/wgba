export * from './bios';
export * from './mirror';

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

export const ror = (shiftVal: number, shift: number) => {
  shift %= 32;
  const tmp0 = shiftVal >> shift;
  const tmp1 = shiftVal << (32 - shift);

  return (tmp0 | tmp1) & 0xffff_ffff;
};

export const printAddr = (addr: number) => console.log(`0x${addr.toString(16)}`);

// ARM_BORROW_FROM_CARRY(M, N, C) (ARM_UXT_64(M) >= (ARM_UXT_64(N)) + (uint64_t) (C))
export const calcBorrowCarry = (m: number, n: number, c: boolean) => {
  const bigM = BigInt(m >>> 0);
  const bigN = BigInt(n >>> 0);
  const bigC = c ? BigInt(1) : BigInt(0);

  return bigM >= bigN + bigC;
};
