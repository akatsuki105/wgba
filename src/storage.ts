import localforage from 'localforage';

export type ROMHeader = {
  title: string;
  ext: string;
  hash: string;
};

export const getROMHeaders = async (): Promise<ROMHeader[]> => {
  try {
    const val = await localforage.getItem<ROMHeader[]>('headers');
    if (!val) return [];

    return val;
  } catch (err) {
    return [];
  }
};

export const getROMData = async (hash: string): Promise<ArrayBufferLike> => {
  try {
    const val = await localforage.getItem<ArrayBufferLike>(hash);
    if (!val) return new ArrayBuffer(1);

    return val;
  } catch (err) {
    return new ArrayBuffer(1);
  }
};

export const setROMHeader = async (h: ROMHeader): Promise<boolean> => {
  const old = await getROMHeaders();

  let alreadyExist = false;
  old.forEach((elm) => {
    if (elm.title === h.title && elm.ext === h.ext && h.hash === elm.hash) alreadyExist = true;
  });

  if (!alreadyExist) {
    old.push(h);
    await localforage.setItem<ROMHeader[]>('headers', old);
  }

  return !alreadyExist;
};

export const setROM = async (h: ROMHeader, r: ArrayBufferLike) => {
  try {
    const success = await setROMHeader(h);
    if (success) await localforage.setItem<ArrayBufferLike>(h.hash, r);
  } catch (err) {
    console.error(err);

    return;
  }
};
