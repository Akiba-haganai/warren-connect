import { useState, useRef } from "react";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { postService } from "@/services/posts/postService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";
import TagInput from "@/components/ui/TagInput";
import { tagService } from "@/services/tags/tagService";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function PostComposer({ onClose, onCreated }: Props) {
  const user = useAuthStore((s) => s.user);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        const compressed = await compressImage(imageFile);
        const { publicUrl } = await storageService.uploadFile(
          "post-images",
          compressed,
          user.id,
          true
        );
        image_url = publicUrl;
      }
      const newPost = await postService.createPost(user.id, content.trim(), image_url);

      // Save tags
      if (tags.length > 0 && newPost) {
        const tagRecords = await Promise.all(
          tags.map((tagName) => tagService.createTag(tagName))
        );
        await Promise.all(
          tagRecords.map((tag) => tagService.addTagToPost(newPost.id, tag!.id))
        );
      }

      onCreated();
      onClose();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create post"
    >
      <div
        className="w-full rounded-t-3xl p-5"
        style={{
          background: "var(--color-surface)",
          paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
            Create Post
          </h2>
          <button onClick={onClose} aria-label="Close composer">
            <X size={20} style={{ color: "var(--color-text-secondary)" }} />
          </button>
        </div>

        <textarea
          className="input-field resize-none"
          rows={4}
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label="Post content"
        />

        {/* Tags */}
        <div className="mt-3">
          <label className="field-label">Tags</label>
          <TagInput
            selectedTags={tags}
            onChange={setTags}
          />
        </div>

        {preview && (
          <div className="relative mt-3">
            <img src={preview} alt="Preview" className="rounded-xl w-full object-cover max-h-60" />
            <button
              onClick={() => { setImageFile(null); setPreview(null); }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <button onClick={() => fileRef.current?.click()} className="btn-ghost p-2" aria-label="Add image">
            <ImagePlus size={20} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} aria-label="Select image file" />
          <button
            className="btn-primary w-auto px-6"
            disabled={!content.trim() || posting}
            onClick={handleSubmit}
            aria-label="Publish post"
          >
            {posting ? <Loader2 className="animate-spin" size={16} /> : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}