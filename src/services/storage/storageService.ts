import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/utils/compressImage";

export const storageService = {
  async uploadFile(
    bucket: string,
    file: File,
    userId?: string,
    generateThumb = false,
    customPath?: string
  ): Promise<{ publicUrl: string; thumbUrl?: string }> {
    const extension = (file.name ? file.name.split(".").pop() : "jpg")?.toLowerCase() ?? "jpg";
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "bmp", "pdf"];
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif", "image/bmp", "application/pdf", "application/octet-stream", ""];

    const isMimeValid = !file.type || allowedMimeTypes.includes(file.type.toLowerCase()) || file.type.startsWith("image/");
    const isExtValid = allowedExtensions.includes(extension);

    if (!isMimeValid && !isExtValid) {
      throw new Error("Invalid file type. Only JPEG, PNG, WebP, HEIC and PDF files are allowed.");
    }

    let fileToUpload = file;
    let finalExtension = extension;

    // Aggressively compress main image on client-side (skip GIFs to preserve animation)
    if (file.type && file.type.startsWith("image/") && file.type !== "image/gif") {
      fileToUpload = await compressImage(file, 1200, 0.8);
      finalExtension = "jpg"; // compressImage forces JPEG output
    }

    const filePath = customPath
      ? customPath
      : userId
      ? `${userId}/${crypto.randomUUID()}.${finalExtension}`
      : `${crypto.randomUUID()}.${finalExtension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload, { upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    let thumbUrl: string | undefined;
    if (generateThumb) {
      const thumbFile = await compressImage(file, 200, 0.7);
      const thumbPath = userId
        ? `${userId}/thumb_${crypto.randomUUID()}.${extension}`
        : `thumb_${crypto.randomUUID()}.${extension}`;

      const { error: thumbErr } = await supabase.storage
        .from(bucket)
        .upload(thumbPath, thumbFile, { upsert: false });
      if (thumbErr) throw thumbErr;

      const { data: thumbData } = supabase.storage
        .from(bucket)
        .getPublicUrl(thumbPath);
      thumbUrl = thumbData.publicUrl;
    }

    return { publicUrl: data.publicUrl, thumbUrl };
  },

  async uploadPrivateFile(
    bucket: string,
    file: File,
    userId?: string
  ): Promise<{ path: string }> {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (file.type && !allowedMimeTypes.includes(file.type.toLowerCase())) {
      throw new Error("Invalid file type. Only JPEG, PNG, WebP, HEIC and PDF files are allowed.");
    }

    let fileToUpload = file;
    const extension = file.name ? file.name.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";
    let finalExtension = extension;

    if (file.type && file.type.startsWith("image/") && file.type !== "image/gif") {
      fileToUpload = await compressImage(file, 1200, 0.8);
      finalExtension = "jpg";
    }

    const filePath = userId
      ? `${userId}/${crypto.randomUUID()}.${finalExtension}`
      : `${crypto.randomUUID()}.${finalExtension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload, { upsert: false });

    if (error) throw error;
    return { path: filePath };
  },

  async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  getPublicUrl(bucket: string, path: string): string {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;

    let targetBucket = bucket;
    let cleanPath = path;

    const knownBuckets = ["public-images", "pending-uploads", "product-images", "accommodation-images", "avatars", "posts"];
    for (const b of knownBuckets) {
      if (cleanPath.startsWith(`${b}/`)) {
        targetBucket = b;
        cleanPath = cleanPath.slice(b.length + 1);
        break;
      }
    }

    const { data } = supabase.storage.from(targetBucket).getPublicUrl(cleanPath);
    return data.publicUrl;
  },
};
