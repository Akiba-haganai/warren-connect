/**
 * Compress an image file before upload.
 * - Resizes to max 1200px width/height
 * - Converts to JPEG at 0.8 quality
 * - Keeps original aspect ratio
 * - Returns a new File with the same name but smaller size
 */
export async function compressImage(file: File, maxDimension = 1200, quality = 0.8): Promise<File> {
  if (!file || file.type === "application/pdf") return file;

  // 1. Try createImageBitmap (Hardware-accelerated, handles 48MP/50MP/200MP photos without memory crashes)
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
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
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
        if (blob) {
          const safeName = (file.name || "photo").replace(/\.[^/.]+$/, "") + ".jpg";
          return new File([blob], safeName, { type: "image/jpeg" });
        }
      }
    } catch (bitmapErr) {
      console.warn("createImageBitmap failed, falling back to FileReader:", bitmapErr);
    }
  }

  // 2. Fallback FileReader method
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
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
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(file);

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (!blob) return resolve(file);
                const safeName = (file.name || "image").replace(/\.[^/.]+$/, "") + ".jpg";
                const compressedFile = new File([blob], safeName, { type: "image/jpeg" });
                resolve(compressedFile);
              },
              "image/jpeg",
              quality
            );
          } catch (canvasErr) {
            console.warn("Canvas compression error, using original file:", canvasErr);
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    } catch (readerErr) {
      console.warn("FileReader error, using original file:", readerErr);
      resolve(file);
    }
  });
}