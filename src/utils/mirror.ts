export const resolvePaletteMirror = (offset: number) => offset % 0x400;

export const resolveVRAMMirror = (offset: number) => {
  switch (true) {
    case offset < 0x18000:
      return offset;
    case offset < 0x20000:
      return offset - 0x8000;
    default:
      offset = offset % 0x20000;
      if (offset >= 0x18000 && offset < 0x20000) {
        return offset - 0x8000;
      }

      return offset;
  }
};

export const resolveOAMMirror = (offset: number) => offset % 0x400;
