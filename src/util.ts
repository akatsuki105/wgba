export const hex = (number: number, leading = 8, usePrefix = true): string => {
  const string = (number >>> 0).toString(16).toUpperCase();
  leading -= string.length;
  if (leading < 0) return string;

  return (usePrefix ? '0x' : '') + new Array(leading + 1).join('0') + string;
};

export class Pointer {
  index: number;
  top: number;
  stack: number[];

  constructor() {
    this.index = 0;
    this.top = 0;
    this.stack = [];
  }

  advance(amount: number): number {
    const index = this.index;
    this.index += amount;

    return index;
  }

  mark(): number {
    return this.index - this.top;
  }

  push() {
    this.stack.push(this.top);
    this.top = this.index;
  }

  pop() {
    const val = this.stack.pop();
    if (val) this.top = val;
  }

  readString(view: DataView) {
    const length = view.getUint32(this.advance(4), true);
    const bytes = [];
    for (let i = 0; i < length; ++i) {
      bytes.push(String.fromCharCode(view.getUint8(this.advance(1))));
    }

    return bytes.join('');
  }
}

export class Serializer {
  static TAG_INT = 1;
  static TAG_STRING = 2;
  static TAG_STRUCT = 3;
  static TAG_BLOB = 4;
  static TAG_BOOLEAN = 5;
  static TYPE = 'application/octet-stream';

  /**
   * create ArrayBuffer has value
   */
  static pack(value: number): ArrayBuffer {
    const object = new DataView(new ArrayBuffer(4));
    object.setUint32(0, value, true);

    return object.buffer;
  }

  pack8(value: number): ArrayBuffer {
    const object = new DataView(new ArrayBuffer(1));
    object.setUint8(0, value);

    return object.buffer;
  }

  static prefix(value: any): ArrayBuffer {
    return Serializer.pack(value.size || value.length || value.byteLength);
  }

  static deserialize(blob: Blob, callback: any) {
    const reader = new FileReader();
    reader.onload = (data: any) => {
      callback(Serializer.deserealizeStream(new DataView(data.target.result), new Pointer()));
    };
    reader.readAsArrayBuffer(blob);
  }

  static deserealizeStream(view: DataView, pointer: Pointer) {
    pointer.push();
    const obj = {} as { [head: string]: any };
    const remaining = view.getUint32(pointer.advance(4), true);
    while (pointer.mark() < remaining) {
      const tag = view.getUint8(pointer.advance(1));
      const head = pointer.readString(view);
      let body;
      switch (tag) {
        case this.TAG_INT:
          body = view.getUint32(pointer.advance(4), true);
          break;
        case this.TAG_STRING:
          body = pointer.readString(view);
          break;
        case this.TAG_STRUCT:
          body = Serializer.deserealizeStream(view, pointer);
          break;
        case Serializer.TAG_BLOB:
          const size = view.getUint32(pointer.advance(4), true);
          body = view.buffer.slice(pointer.advance(size), pointer.advance(0));
          break;
        case Serializer.TAG_BOOLEAN:
          body = !!view.getUint8(pointer.advance(1));
          break;
      }
      obj[head] = body;
    }

    if (pointer.mark() > remaining) throw 'Size of serialized data exceeded';
    pointer.pop();

    return obj;
  }

  serializePNG(blob: Blob, base: HTMLCanvasElement, callback: any) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    const pixels = base
      .getContext('2d', { alpha: false })
      ?.getImageData(0, 0, base.width, base.height);
    if (!pixels) return;

    let transparent = 0;
    for (let y = 0; y < base.height; ++y) {
      for (let x = 0; x < base.width; ++x) {
        if (!pixels.data[(x + y * base.width) * 4 + 3]) ++transparent;
      }
    }

    const bytesInCanvas = transparent * 3 + (base.width * base.height - transparent);

    let multiplier: number;
    for (multiplier = 1; bytesInCanvas * multiplier * multiplier < blob.size; ++multiplier);

    const edges = bytesInCanvas * multiplier * multiplier - blob.size;
    const padding = Math.ceil(edges / (base.width * multiplier));
    canvas.setAttribute('width', String(base.width * multiplier));
    canvas.setAttribute('height', String(base.height * multiplier + padding));

    const reader = new FileReader();
    reader.onload = (data) => {
      if (!data.target) return;
      const view = new Uint8Array(data.target.result as ArrayBuffer);
      let pointer = 0;
      let pixelPointer = 0;

      if (!context) return;
      const newPixels = context.createImageData(canvas.width, canvas.height + padding);
      for (let y = 0; y < canvas.height; ++y) {
        for (let x = 0; x < canvas.width; ++x) {
          const oldY = (y / multiplier) | 0;
          const oldX = (x / multiplier) | 0;
          if (oldY > base.height || !pixels.data[(oldX + oldY * base.width) * 4 + 3]) {
            newPixels.data[pixelPointer++] = view[pointer++];
            newPixels.data[pixelPointer++] = view[pointer++];
            newPixels.data[pixelPointer++] = view[pointer++];
            newPixels.data[pixelPointer++] = 0;
          } else {
            const byte = view[pointer++];
            newPixels.data[pixelPointer++] =
              pixels.data[(oldX + oldY * base.width) * 4 + 0] | (byte & 7);
            newPixels.data[pixelPointer++] =
              pixels.data[(oldX + oldY * base.width) * 4 + 1] | ((byte >> 3) & 7);
            newPixels.data[pixelPointer++] =
              pixels.data[(oldX + oldY * base.width) * 4 + 2] | ((byte >> 6) & 7);
            newPixels.data[pixelPointer++] = pixels.data[(oldX + oldY * base.width) * 4 + 3];
          }
        }
      }
      context.putImageData(newPixels, 0, 0);
      callback(canvas.toDataURL('image/png'));
    };
    reader.readAsArrayBuffer(blob);

    return canvas;
  }

  deserializePNG(blob: Blob, callback: any) {
    const reader = new FileReader();
    reader.onload = (data: any) => {
      const image = document.createElement('img');
      image.setAttribute('src', data.target.result);
      const canvas = document.createElement('canvas');
      canvas.setAttribute('height', String(image.height));
      canvas.setAttribute('width', String(image.width));
      const context = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      data = [];
      for (let y = 0; y < canvas.height; ++y) {
        for (let x = 0; x < canvas.width; ++x) {
          if (!pixels.data[(x + y * canvas.width) * 4 + 3]) {
            data.push(pixels.data[(x + y * canvas.width) * 4 + 0]);
            data.push(pixels.data[(x + y * canvas.width) * 4 + 1]);
            data.push(pixels.data[(x + y * canvas.width) * 4 + 2]);
          } else {
            let byte = 0;
            byte |= pixels.data[(x + y * canvas.width) * 4 + 0] & 7;
            byte |= (pixels.data[(x + y * canvas.width) * 4 + 1] & 7) << 3;
            byte |= (pixels.data[(x + y * canvas.width) * 4 + 2] & 7) << 6;
            data.push(byte);
          }
        }
      }
      const newBlob = new Blob(
        data.map((byte: number) => {
          const array = new Uint8Array(1);
          array[0] = byte;

          return array;
        }),
        { type: Serializer.TYPE },
      );
      Serializer.deserialize(newBlob, callback);
    };
    reader.readAsDataURL(blob);
  }
}
