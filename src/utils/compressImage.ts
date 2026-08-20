/**
 * Compress an image file before upload.
 * - Resizes to max 1200px width/height
 * - Converts to JPEG at given quality
 * - Keeps original aspect ratio
 * - Returns a new File with the same name but smaller size
 *
 * IMPORTANT: unlike the previous version, this THROWS on failure instead of
 * silently returning the original (possibly undecodable) file. Callers must
 * catch per-file so one bad photo doesn't take down the whole batch/composer.
 */

const MAX_INPUT_SIZE = 25 * 1024 * 1024; // 25MB — reject absurdly large originals up front
const PROCESSING_TIMEOUT_MS = 15_000; // fail fast instead of hanging on older WebViews

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

async function compressViaBitmap(file: File, maxDimension: number, quality: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) throw new Error("Canvas failed to produce an image blob");

    const safeName = (file.name || "photo").replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([blob], safeName, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

async function compressViaFileReader(file: File, maxDimension: number, quality: number): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read this file"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("This photo format isn't supported on your device/browser"));
    el.src = dataUrl;
  });

  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Canvas failed to produce an image blob");

  const safeName = (file.name || "photo").replace(/\.[^/.]+$/, "") + ".jpg";
  return new File([blob], safeName, { type: "image/jpeg" });
}

export async function compressImage(file: File, maxDimension = 1200, quality = 0.8): Promise<File> {
  if (!file) throw new Error("No file provided");
  if (file.type === "application/pdf") return file;

  if (file.size > MAX_INPUT_SIZE) {
    throw new Error(
      `This photo is too large (${Math.round(file.size / 1024 / 1024)}MB). Please choose a smaller photo.`
    );
  }

  // 1. Try createImageBitmap first — hardware-accelerated, handles very large photos
  //    without the memory spike of loading a full base64 string.
  if (typeof createImageBitmap === "function") {
    try {
      return await withTimeout(
        compressViaBitmap(file, maxDimension, quality),
        PROCESSING_TIMEOUT_MS,
        "Image processing"
      );
    } catch (bitmapErr) {
      console.warn("createImageBitmap failed, falling back to FileReader:", bitmapErr);
      // fall through to the FileReader path below
    }
  }

  // 2. Fallback: FileReader + <img> + canvas. If THIS also fails, we throw a
  //    real, user-facing error instead of quietly handing back an unusable file.
  try {
    return await withTimeout(
      compressViaFileReader(file, maxDimension, quality),
      PROCESSING_TIMEOUT_MS,
      "Image processing"
    );
  } catch (fallbackErr: any) {
    throw new Error(
      fallbackErr?.message ||
        "Couldn't process this photo on your device. Please try a different photo."
    );
  }
}