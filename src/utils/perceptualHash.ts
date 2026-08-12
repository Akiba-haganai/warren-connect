/**
 * perceptualHash.ts
 *
 * Computes a true DCT-based perceptual hash (pHash), NOT a naive average
 * hash (aHash). The distinction matters for abuse prevention:
 *
 *   - aHash (resize + average brightness) changes significantly under
 *     recompression, minor crops, borders, or slight color/gamma shifts —
 *     trivial for anyone re-listing a stolen photo to defeat.
 *   - pHash isolates the LOW-FREQUENCY components of the image via a 2D
 *     Discrete Cosine Transform, which is far more stable under those same
 *     transformations. This is the standard approach used by real
 *     duplicate/stolen-image detectors.
 *
 * IMPORTANT: this module computes hashes client-side for instant UX
 * feedback in the composer ("this looks similar to an existing listing").
 * It must NOT be relied on as the enforcement boundary — anyone can bypass
 * client-side JS and hit the upload API directly. The moderation function
 * (or upload handler) should independently compute and compare hashes
 * server-side before a listing goes live.
 */

// Image is downsampled to this size before the DCT is applied. 32x32 is the
// standard pHash working size — large enough to preserve meaningful
// low-frequency structure, small enough to keep the DCT cheap.
const DCT_SIZE = 32;

// After the DCT, only the top-left HASH_SIZE x HASH_SIZE block of
// coefficients is kept (the lowest frequencies = the coarse image
// structure). This produces a HASH_SIZE^2-bit hash.
const HASH_SIZE = 8;

/**
 * Loads a File/Blob into an offscreen canvas and returns the grayscale pixel
 * matrix at DCT_SIZE x DCT_SIZE resolution.
 */
async function toGrayscaleMatrix(file: File | Blob): Promise<number[][]> {
  const bitmap = await createImageBitmap(file);

  const canvas = document.createElement('canvas');
  canvas.width = DCT_SIZE;
  canvas.height = DCT_SIZE;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not acquire 2D canvas context for perceptual hashing');
  }

  // Downscale directly to DCT_SIZE x DCT_SIZE. The browser's image
  // smoothing acts as a natural low-pass filter here, which is desirable —
  // it removes high-frequency noise before we ever get to the DCT.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, DCT_SIZE, DCT_SIZE);

  const { data } = ctx.getImageData(0, 0, DCT_SIZE, DCT_SIZE);
  bitmap.close();

  const matrix: number[][] = [];
  for (let y = 0; y < DCT_SIZE; y++) {
    const row: number[] = [];
    for (let x = 0; x < DCT_SIZE; x++) {
      const i = (y * DCT_SIZE + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Standard luminance-weighted grayscale conversion.
      row.push(0.299 * r + 0.587 * g + 0.114 * b);
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Precomputes the NxN DCT-II coefficient matrix once and reuses it, rather
 * than recomputing cosines per pixel per image.
 */
const dctCoefficientCache = new Map<number, number[][]>();

function getDctCoefficients(n: number): number[][] {
  const cached = dctCoefficientCache.get(n);
  if (cached) return cached;

  const coeffs: number[][] = [];
  for (let u = 0; u < n; u++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) {
      row.push(Math.cos(((2 * x + 1) * u * Math.PI) / (2 * n)));
    }
    coeffs.push(row);
  }
  dctCoefficientCache.set(n, coeffs);
  return coeffs;
}

/**
 * Applies a 2D DCT-II to an NxN matrix via separable 1D DCTs (rows then
 * columns), which is O(n^3) instead of the naive O(n^4) direct 2D form.
 */
function dct2D(matrix: number[][]): number[][] {
  const n = matrix.length;
  const c = getDctCoefficients(n);
  const alpha = (u: number) => (u === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n));

  // DCT along rows.
  const rowTransformed: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let y = 0; y < n; y++) {
    for (let u = 0; u < n; u++) {
      let sum = 0;
      for (let x = 0; x < n; x++) {
        sum += matrix[y][x] * c[u][x];
      }
      rowTransformed[y][u] = alpha(u) * sum;
    }
  }

  // DCT along columns.
  const result: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let u = 0; u < n; u++) {
    for (let v = 0; v < n; v++) {
      let sum = 0;
      for (let y = 0; y < n; y++) {
        sum += rowTransformed[y][u] * c[v][y];
      }
      result[v][u] = alpha(v) * sum;
    }
  }

  return result;
}

/**
 * Computes a 64-bit perceptual hash for an image file, returned as a
 * 16-character hex string.
 *
 * Algorithm:
 *   1. Downsample to 32x32 grayscale.
 *   2. Apply a 2D DCT.
 *   3. Keep the top-left 8x8 block of coefficients (low frequencies),
 *      EXCLUDING the DC term at [0][0] — the DC term just encodes overall
 *      brightness and adds no structural information, and including it
 *      tends to dominate the median and destabilize the hash.
 *   4. Compute the median of the remaining 63 coefficients.
 *   5. Set bit = 1 where the coefficient exceeds the median, else 0.
 */
export async function computePerceptualHash(file: File | Blob): Promise<string> {
  const grayscale = await toGrayscaleMatrix(file);
  const dct = dct2D(grayscale);

  const lowFreq: number[] = [];
  for (let y = 0; y < HASH_SIZE; y++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      if (x === 0 && y === 0) continue; // skip DC term
      lowFreq.push(dct[y][x]);
    }
  }

  const sorted = [...lowFreq].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  let bits = '';
  for (const value of lowFreq) {
    bits += value > median ? '1' : '0';
  }

  return bitsToHex(bits);
}

function bitsToHex(bits: string): string {
  // Pad to a multiple of 4 so each nibble maps cleanly to one hex digit.
  const padded = bits.padEnd(Math.ceil(bits.length / 4) * 4, '0');
  let hex = '';
  for (let i = 0; i < padded.length; i += 4) {
    hex += parseInt(padded.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function hexToBits(hex: string): string {
  let bits = '';
  for (const char of hex) {
    bits += parseInt(char, 16).toString(2).padStart(4, '0');
  }
  return bits;
}

/**
 * Hamming distance between two pHash hex strings — the count of differing
 * bit positions. Lower = more visually similar.
 */
export function computeHammingDistance(hash1: string, hash2: string): number {
  const bits1 = hexToBits(hash1);
  const bits2 = hexToBits(hash2);

  if (bits1.length !== bits2.length) {
    throw new Error('Cannot compare hashes of different lengths');
  }

  let distance = 0;
  for (let i = 0; i < bits1.length; i++) {
    if (bits1[i] !== bits2[i]) distance++;
  }
  return distance;
}

/**
 * Convenience helper for the composer: checks a candidate hash against a
 * list of existing (productId, hash) pairs and returns matches within the
 * given Hamming distance threshold, sorted by closeness.
 */
export function findNearDuplicates(
  candidateHash: string,
  existing: Array<{ productId: string; hash: string }>,
  threshold = 5
): Array<{ productId: string; distance: number }> {
  return existing
    .map(({ productId, hash }) => ({
      productId,
      distance: computeHammingDistance(candidateHash, hash),
    }))
    .filter((match) => match.distance <= threshold)
    .sort((a, b) => a.distance - b.distance);
}
