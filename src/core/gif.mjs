// Minimal animated GIF89a encoder (indexed palette + LZW, infinite loop, optional transparency).
// Zero dependencies (Node stdlib only).

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;

  // Use a Map of (prefix << 8 | k) -> code
  let table = new Map();
  const out = [];
  let bitBuf = 0;
  let bitCount = 0;

  const writeCode = (code) => {
    bitBuf |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.push(bitBuf & 0xff);
      bitBuf >>>= 8;
      bitCount -= 8;
    }
  };

  writeCode(clearCode);

  if (indices.length > 0) {
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      const found = table.get(key);
      if (found !== undefined) {
        prefix = found;
      } else {
        writeCode(prefix);
        if (nextCode < 4096) {
          table.set(key, nextCode++);
          if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
        } else {
          writeCode(clearCode);
          table = new Map();
          codeSize = minCodeSize + 1;
          nextCode = endCode + 1;
        }
        prefix = k;
      }
    }
    writeCode(prefix);
  }

  writeCode(endCode);
  if (bitCount > 0) out.push(bitBuf & 0xff);

  // Split into GIF sub-blocks (max 255 bytes each)
  const blocks = [minCodeSize];
  for (let i = 0; i < out.length; i += 255) {
    const slice = out.slice(i, i + 255);
    blocks.push(slice.length, ...slice);
  }
  blocks.push(0); // block terminator
  return Buffer.from(blocks);
}

/**
 * Quantize RGBA canvases onto a shared palette (<= 256 colors) and encode as an animated GIF89a.
 * @param {number} width
 * @param {number} height
 * @param {Array<{ px: Buffer, delayCs?: number }>} frames - RGBA buffers and delay in centiseconds (100 = 1s)
 * @param {{ loop?: number, transparent?: boolean }} [opts]
 * @returns {Buffer}
 */
export function encodeGIF(width, height, frames, opts = {}) {
  const transparent = opts.transparent ?? false;
  const loop = opts.loop ?? 0; // 0 = infinite

  const palette = [];
  const colorToIdx = new Map();

  // Reserve index 0 for transparency if requested
  if (transparent) {
    palette.push([0, 0, 0]);
  }

  const getIndex = (r, g, b, a) => {
    if (transparent && a < 128) return 0;
    const key = (r << 16) | (g << 8) | b;
    let idx = colorToIdx.get(key);
    if (idx !== undefined) return idx;
    if (palette.length < 256) {
      idx = palette.length;
      palette.push([r, g, b]);
      colorToIdx.set(key, idx);
      return idx;
    }
    // Nearest color fallback if >256 unique colors
    let bestIdx = transparent ? 1 : 0;
    let bestDist = Infinity;
    for (let i = bestIdx; i < palette.length; i++) {
      const [pr, pg, pb] = palette[i];
      const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const frameIndices = frames.map((f) => {
    const arr = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      arr[i] = getIndex(f.px[i * 4], f.px[i * 4 + 1], f.px[i * 4 + 2], f.px[i * 4 + 3]);
    }
    return arr;
  });

  // Palette size must be a power of 2 between 2 and 256
  let bits = 1;
  while (1 << bits < Math.max(2, palette.length)) bits++;
  const tableLen = 1 << bits;
  const gct = Buffer.alloc(tableLen * 3);
  for (let i = 0; i < palette.length; i++) {
    gct[i * 3] = palette[i][0];
    gct[i * 3 + 1] = palette[i][1];
    gct[i * 3 + 2] = palette[i][2];
  }

  const header = Buffer.from("GIF89a", "ascii");
  const lsd = Buffer.alloc(7);
  lsd.writeUInt16LE(width, 0);
  lsd.writeUInt16LE(height, 2);
  lsd[4] = 0x80 | ((bits - 1) << 4) | (bits - 1); // Global Color Table flag + color res + size
  lsd[5] = 0; // bg color index
  lsd[6] = 0; // pixel aspect ratio

  const parts = [header, lsd, gct];

  // NETSCAPE2.0 application extension for looping
  if (frames.length > 1) {
    const netscape = Buffer.alloc(19);
    netscape[0] = 0x21;
    netscape[1] = 0xff;
    netscape[2] = 11;
    netscape.write("NETSCAPE2.0", 3, "ascii");
    netscape[14] = 3;
    netscape[15] = 1;
    netscape.writeUInt16LE(loop, 16);
    netscape[18] = 0;
    parts.push(netscape);
  }

  const minCodeSize = Math.max(2, bits);

  for (let f = 0; f < frames.length; f++) {
    const delayCs = Math.max(2, Math.round(frames[f].delayCs ?? 35));
    // Graphic Control Extension
    const gce = Buffer.alloc(8);
    gce[0] = 0x21;
    gce[1] = 0xf9;
    gce[2] = 4;
    // Disposal method = 2 (restore to background) if transparent, else 0; bit 0 = transparent flag
    gce[3] = (transparent ? 0x08 : 0x00) | (transparent ? 0x01 : 0x00);
    gce.writeUInt16LE(delayCs, 4);
    gce[6] = 0; // transparent color index
    gce[7] = 0;
    parts.push(gce);

    // Image Descriptor
    const imgDesc = Buffer.alloc(10);
    imgDesc[0] = 0x2c;
    imgDesc.writeUInt16LE(0, 1);
    imgDesc.writeUInt16LE(0, 3);
    imgDesc.writeUInt16LE(width, 5);
    imgDesc.writeUInt16LE(height, 7);
    imgDesc[9] = 0; // no local color table, non-interlaced
    parts.push(imgDesc);

    parts.push(lzwEncode(frameIndices[f], minCodeSize));
  }

  parts.push(Buffer.from([0x3b])); // GIF trailer
  return Buffer.concat(parts);
}
