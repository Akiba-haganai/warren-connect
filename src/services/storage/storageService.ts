import { supabase } from "@/lib/supabase/client";

export const storageService = {
  async uploadFile(
    bucket: string,
    file: File,
    userId?: string
  ) {
    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error(
        "File must be smaller than 5MB"
      );
    }

    const extension =
      file.name.split(".").pop() ?? "jpg";

    const filePath = userId
      ? `${userId}/${crypto.randomUUID()}.${extension}`
      : `${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },
};