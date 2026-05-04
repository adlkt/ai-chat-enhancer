import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sizes = [16, 32, 48, 96, 128];
const scale = 4;
const outDir = new URL('../public/icon/', import.meta.url);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function writePng(path, width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND'),
    ]),
  );
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function gradient(x, y) {
  const t = Math.max(0, Math.min(1, (x + y) / 256));
  const a = [36, 198, 220];
  const b = t < 0.55 ? [59, 130, 246] : [124, 58, 237];
  const localT = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45;
  return [
    Math.round(mix(a[0], b[0], localT)),
    Math.round(mix(a[1], b[1], localT)),
    Math.round(mix(a[2], b[2], localT)),
    255,
  ];
}

function roundedRectAlpha(x, y, left, top, width, height, radius) {
  const right = left + width;
  const bottom = top + height;
  const cx = Math.max(left + radius, Math.min(x, right - radius));
  const cy = Math.max(top + radius, Math.min(y, bottom - radius));
  const dist = Math.hypot(x - cx, y - cy);
  return Math.max(0, Math.min(1, radius + 0.5 - dist));
}

function rectAlpha(x, y, left, top, width, height) {
  const dx = Math.min(x - left, left + width - x);
  const dy = Math.min(y - top, top + height - y);
  return Math.max(0, Math.min(1, Math.min(dx, dy) + 0.5));
}

function lineAlpha(x, y, x1, y1, x2, y2, width) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lengthSq = vx * vx + vy * vy;
  const t = Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / lengthSq));
  const px = x1 + vx * t;
  const py = y1 + vy * t;
  return Math.max(0, Math.min(1, width / 2 + 0.5 - Math.hypot(x - px, y - py)));
}

function bubbleAlpha(x, y) {
  const body = roundedRectAlpha(x, y, 15.5, 23.5, 89, 65.4, 10);
  const tailA = edge(x, y, 39.5, 88.9, 39.5, 104);
  const tailB = edge(x, y, 39.5, 104, 59.2, 88.9);
  const tailC = edge(x, y, 59.2, 88.9, 39.5, 88.9);
  const insideTail = tailA >= -0.5 && tailB >= -0.5 && tailC >= -0.5 ? 1 : 0;
  return Math.max(body, insideTail);
}

function edge(x, y, x1, y1, x2, y2) {
  return ((x - x1) * (y2 - y1) - (y - y1) * (x2 - x1)) / Math.hypot(x2 - x1, y2 - y1);
}

function sparkleAlpha(x, y, cx, cy, r) {
  const d = Math.abs(x - cx) + Math.abs(y - cy);
  return Math.max(0, Math.min(1, r + 0.5 - d));
}

function blend(dst, src, alpha) {
  const a = Math.max(0, Math.min(1, (src[3] / 255) * alpha));
  const outA = a + dst[3] * (1 - a);
  if (outA <= 0) return [0, 0, 0, 0];
  return [
    Math.round((src[0] * a + dst[0] * dst[3] * (1 - a)) / outA),
    Math.round((src[1] * a + dst[1] * dst[3] * (1 - a)) / outA),
    Math.round((src[2] * a + dst[2] * dst[3] * (1 - a)) / outA),
    outA,
  ];
}

function sample(x, y) {
  let color = [0, 0, 0, 0];

  color = blend(color, gradient(x, y), roundedRectAlpha(x, y, 2, 2, 124, 124, 28));
  color = blend(color, [15, 23, 42, 52], roundedRectAlpha(x, y, 19.5, 29.5, 89, 65.4, 10));
  color = blend(color, [255, 255, 255, 248], bubbleAlpha(x, y));
  color = blend(color, [234, 244, 255, 220], roundedRectAlpha(x, y, 18, 26, 84, 59, 9));

  color = blend(color, [21, 94, 239, 255], lineAlpha(x, y, 31.5, 44.5, 61.5, 44.5, 8));
  color = blend(color, [15, 23, 42, 184], lineAlpha(x, y, 31.5, 61.5, 76.5, 61.5, 7));
  color = blend(color, [15, 23, 42, 118], lineAlpha(x, y, 31.5, 77.5, 64.5, 77.5, 7));
  color = blend(color, [250, 204, 21, 255], sparkleAlpha(x, y, 83, 53, 14));
  color = blend(color, [34, 197, 94, 255], sparkleAlpha(x, y, 94, 69.6, 7));

  return color;
}

function render(size) {
  const highSize = size * scale;
  const high = Buffer.alloc(highSize * highSize * 4);

  for (let y = 0; y < highSize; y += 1) {
    for (let x = 0; x < highSize; x += 1) {
      const [r, g, b, a] = sample(((x + 0.5) / highSize) * 128, ((y + 0.5) / highSize) * 128);
      const offset = (y * highSize + x) * 4;
      high[offset] = r;
      high[offset + 1] = g;
      high[offset + 2] = b;
      high[offset + 3] = Math.round(a * 255);
    }
  }

  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const offset = (((y * scale + sy) * highSize + x * scale + sx) * 4);
          r += high[offset];
          g += high[offset + 1];
          b += high[offset + 2];
          a += high[offset + 3];
        }
      }
      const count = scale * scale;
      const offset = (y * size + x) * 4;
      out[offset] = Math.round(r / count);
      out[offset + 1] = Math.round(g / count);
      out[offset + 2] = Math.round(b / count);
      out[offset + 3] = Math.round(a / count);
    }
  }

  writePng(join(outDir.pathname, `${size}.png`), size, size, out);
}

for (const size of sizes) {
  render(size);
}
