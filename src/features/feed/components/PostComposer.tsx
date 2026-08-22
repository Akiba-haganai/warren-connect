import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { X, Camera, ImagePlus, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { postService } from "@/services/posts/postService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";
import TagInput from "@/components/ui/TagInput";
import { tagService } from "@/services/tags/tagService";
import { sendPushNotification } from "@/lib/notifications";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import CrossDeviceUploadPanel from "@/components/ui/CrossDeviceUploadPanel";
import { uploadTelemetry } from "@/utils/uploadTelemetry";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

interface UploadedImageItem {
  path: string;
  previewUrl: string;
}

export default function PostComposer({ onClose, onCreated }: Props) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [content, setContent] = useState("");
  const [uploadedImage, setUploadedImage] = useState<UploadedImageItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const lastPostTime = useRef<number>(0);

  const draftKey = user ? `draft:post-composer:${user.id}` : "draft:post-composer";

  // Persist form draft in sessionStorage across WebView reclaims
  const { clearDraft } = useDraftPersistence(
    draftKey,
    { content, tags, uploadedImage },
    (draft: any) => {
      if (draft.content !== undefined) setContent(draft.content);
      if (draft.tags !== undefined) setTags(draft.tags);
      if (draft.uploadedImage !== undefined) {
        const item = draft.uploadedImage;
        if (item && item.path) {
          storageService.getSignedUrl("pending-uploads", item.path, 3600)
            .then((signedUrl) => {
              setUploadedImage({ path: item.path, previewUrl: signedUrl });
            })
            .catch(() => {
              setUploadedImage(item);
            });
        } else {
          setUploadedImage(item);
        }
      }
    }
  );

  const processFile = async (file: File) => {
    if (!file || !user) return;
    
    uploadTelemetry.log("file_selected", `File selected: ${file.name}`, {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    setUploadingImage(true);

    try {
      const compressed = await compressImage(file);
      const fileName = `${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const path = `posts/${user.id}/drafts/${fileName}`;

      uploadTelemetry.log("upload_started", "Starting Supabase upload");
      await storageService.uploadFile(
        "pending-uploads",
        compressed,
        user.id,
        true,
        path
      );
      uploadTelemetry.log("upload_success", "Supabase upload completed");
      
      const signedUrl = await storageService.getSignedUrl("pending-uploads", path, 3600);
      setUploadedImage({ path, previewUrl: signedUrl });
    } catch (err: any) {
      uploadTelemetry.reportError("upload_failed", err);
      import("@sentry/react").then((Sentry) => {
        Sentry.captureException(err);
      });
      toast.error(err.message || "Failed to upload image preview");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = "";
  };

  const handleCrossDeviceFiles = async (files: File[]) => {
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;

    if (Date.now() - lastPostTime.current < 5000) {
      toast.error("Please wait a few seconds before posting again.");
      return;
    }
    lastPostTime.current = Date.now();

    setPosting(true);
    try {
      // 1. Create post (Synchronous text moderation happens here)
      const newPost = await postService.createPost(user.id, content.trim(), !!uploadedImage);
      
      if (!newPost) {
        throw new Error("Failed to create post");
      }

      // Save tags
      if (tags.length > 0) {
        const tagRecords = await Promise.all(
          tags.map((tagName) => tagService.createTag(tagName))
        );
        await Promise.all(
          tagRecords.map((tag) => tagService.addTagToPost(newPost.id, tag!.id))
        );
      }

      if (newPost) {
        const username = profile?.username || profile?.full_name || user?.email?.split('@')[0] || 'Someone';
        sendPushNotification(newPost.user_id, "New Post", `${username} posted: ${newPost.content.slice(0, 60)}`, `/post/${newPost.id}`);
      }

      clearDraft();
      onCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create post.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Create post"
    >
      <div
        className="w-full max-w-lg rounded-3xl p-5 bg-surface border border-border shadow-2xl flex flex-col max-h-[90vh]"
        style={{
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Create Post
          </h2>
          <button type="button" onClick={onClose} aria-label="Close composer" className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X size={20} />
          </button>
        </div>

        <textarea
          className="input-field text-base resize-none"
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

        {uploadedImage && (
          <div className="relative mt-3">
            <img src={uploadedImage.previewUrl} alt="Preview" className="rounded-xl w-full object-cover max-h-60" />
            <button
              type="button"
              onClick={() => setUploadedImage(null)}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 cursor-pointer"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="mt-3">
          <CrossDeviceUploadPanel onFilesReceived={handleCrossDeviceFiles} />
        </div>

        <div className="flex justify-between items-center mt-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            {/* Direct 1-Tap Camera */}
            <div
              className="relative p-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/15 text-teal-700 dark:text-teal-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Take Photo"
            >
              <Camera size={18} className="text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline text-[11px]">Camera</span>
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                capture="environment"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleImage}
                disabled={uploadingImage}
                onClick={(e) => { e.stopPropagation(); uploadTelemetry.startAttempt("PostComposer_Camera"); }}
                aria-label="Take photo with camera"
              />
            </div>

            {/* Direct 1-Tap Gallery */}
            <div
              className="relative p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Add from Gallery"
            >
              {uploadingImage ? (
                <Loader2 size={18} className="animate-spin text-primary" />
              ) : (
                <ImagePlus size={18} className="text-blue-600 dark:text-blue-400" />
              )}
              <span className="hidden sm:inline text-[11px]">Gallery</span>
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleImage}
                disabled={uploadingImage}
                onClick={(e) => { e.stopPropagation(); uploadTelemetry.startAttempt("PostComposer_Gallery"); }}
                aria-label="Select image from gallery"
              />
            </div>

            {uploadingImage && (
              <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
                <Loader2 size={12} className="animate-spin" /> Processing…
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn-primary w-auto px-6 cursor-pointer"
            disabled={!content.trim() || posting || uploadingImage}
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