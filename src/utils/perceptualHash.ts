/**
 * DCT-based Perceptual Hash (pHash) implementation in Pure JavaScript / Canvas API.
 * Resilient against JPEG re-compression, minor cropping, and gamma/color shifts.
 */

// 1D DCT-II Transform
function dct1D(input: number[]): number[] {
  const N = input.length;
  const output = new Array(N).fill(0);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos((Math.PI * (2 * n + 1) * k) / (2 * N));
    }
    const alpha = k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
    output[k] = alpha * sum;
  }
  return output;
}

// 2D DCT Transform (32x32)
function dct2D(matrix: number[][]): number[][] {
  const N = 32;
  const rowTransformed: number[][] = [];

  // Transform rows
  for (let r = 0; r < N; r++) {
    rowTransformed.push(dct1D(matrix[r]));
  }

  // Transform columns
  const output: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let c = 0; c < N; c++) {
    const col = rowTransformed.map((row) => row[c]);
    const transformedCol = dct1D(col);
    for (let r = 0; r < N; r++) {
      output[r][c] = transformedCol[r];
    }
  }
  return output;
}

export async function computePerceptualHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Draw 32x32 grayscale
      ctx.drawImage(img, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32);
      const pixels = imgData.data;

      const matrix: number[][] = Array.from({ length: 32 }, () => new Array(32).fill(0));
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const idx = (y * 32 + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          // Grayscale luminance
          matrix[y][x] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
      }

      // 2D DCT
      const dctResult = dct2D(matrix);

      // Extract top-left 8x8 (excluding DC coefficient at 0,0)
      const coeffs: number[] = [];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (x === 0 && y === 0) continue; // Skip DC term
          coeffs.push(dctResult[y][x]);
        }
      }

      // Median value
      const sorted = [...coeffs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      // 64-bit binary string -> 16-char hex
      let binaryStr = "";
      for (const val of coeffs) {
        binaryStr += val > median ? "1" : "0";
      }

      let hexStr = "";
      for (let i = 0; i < binaryStr.length; i += 4) {
        const nibble = binaryStr.substring(i, i + 4);
        hexStr += parseInt(nibble, 2).toString(16);
      }

      resolve(hexStr);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Calculates the Hamming distance between two hex pHashes.
 * Lower distance means higher image similarity (0 = identical, <= 10 = very similar).
 */
export function computeHammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 64;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;

    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}
