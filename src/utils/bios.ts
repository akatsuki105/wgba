const I32_MIN = -2147483647 - 1;

export const divide = (num: number, denom: number): [number, number, number] => {
  if (denom == 0) {
    // If abs(num) > 1, this should hang, but that would be painful to
    // emulate in HLE, and no game will get into a state under normal
    // operation where it hangs...
    return [num < 0 ? -1 : 1, num, 1];
  } else if (denom == -1 && num == I32_MIN) {
    return [I32_MIN, 0, I32_MIN];
  } else {
    const result = (num | 0) / (denom | 0);
    const mod = (num | 0) % (denom | 0);

    return [result | 0, mod | 0, Math.abs(result | 0)];
  }
};

export const arcTan = (i: number): [number, number, number] => {
  const a = -((i * i) >> 14);
  let b = ((0xa9 * a) >> 14) + 0x390;
  b = ((b * a) >> 14) + 0x91c;
  b = ((b * a) >> 14) + 0xfb6;
  b = ((b * a) >> 14) + 0x16aa;
  b = ((b * a) >> 14) + 0x2081;
  b = ((b * a) >> 14) + 0x3651;
  b = ((b * a) >> 14) + 0xa2f9;

  const r0 = (i * b) >> 16;
  const r1 = a;
  const r3 = b;

  return [r0, r1, r3];
};

/**
 * @param {number} x - r0
 * @param {number} y - r1
 */
export const arcTan2 = (x: number, y: number): [number, number] => {
  if (!y) {
    if (x >= 0) {
      return [0, y];
    }

    return [0x8000, y];
  }
  if (!x) {
    if (y >= 0) {
      return [0x4000, y];
    }

    return [0xc000, y];
  }

  if (y >= 0) {
    if (x >= 0) {
      if (x >= y) {
        const res = arcTan((y << 14) / x);

        return [res[0], res[1]];
      }
    } else if (-x >= y) {
      const res = arcTan((y << 14) / x);

      return [res[0] + 0x8000, res[1]];
    }

    const res = arcTan((x << 14) / y);

    return [0x4000 - res[0], res[1]];
  } else {
    if (x <= 0) {
      if (-x > -y) {
        const res = arcTan((y << 14) / x);

        return [res[0] + 0x8000, res[1]];
      }
    } else if (x >= -y) {
      const res = arcTan((y << 14) / x);

      return [res[0] + 0x10000, res[1]];
    }

    const res = arcTan((x << 14) / y);

    return [0xc000 - res[0], res[1]];
  }
};
