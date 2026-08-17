/**
 * Compress an image file before upload.
 * - Resizes to max 1200px width/height
 * - Converts to JPEG at 0.8 quality
 * - Keeps original aspect ratio
 * - Returns a new File with the same name but smaller size
 */
export async function compressImage(file: File, maxDimension = 1200, quality = 0.8): Promise<File> {
  // If file is non-image or empty, return original file
  if (!file || file.type === "application/pdf") return file;

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