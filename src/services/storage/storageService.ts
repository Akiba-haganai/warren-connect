import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/utils/compressImage";

export const storageService = {
  async uploadFile(
    bucket: string,
    file: File,
    userId?: string,
    generateThumb = false
  ): Promise<{ publicUrl: string; thumbUrl?: string }> {
    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error("File must be smaller than 5MB");
    }

    const extension = file.name.split(".").pop() ?? "jpg";

    const filePath = userId
      ? `${userId}/${crypto.randomUUID()}.${extension}`
      : `${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false });

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
};
