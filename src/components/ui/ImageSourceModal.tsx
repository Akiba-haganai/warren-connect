import { useState } from "react";
import { Image as ImageIcon, Camera, FolderOpen, X, Loader2 } from "lucide-react";

interface ImageSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImages: (files: File[]) => void;
  multiple?: boolean;
}

/**
 * Materialize a File's bytes into a fresh File object whose data lives in
 * JS heap memory, completely decoupled from the Android content:// URI.
 *
 * Android invalidates content:// URIs once the <input> element that
 * produced them is removed from the DOM. By reading the ArrayBuffer while
 * the input is still mounted, we avoid that race condition entirely.
 */
async function materializeFile(file: File): Promise<File | null> {
  // Primary: arrayBuffer() — fast, modern
  if (typeof file.arrayBuffer === "function") {
    try {
      const ab = await file.arrayBuffer();
      const mime = file.type || "image/jpeg";
      const safeName = file.name || `photo_${Date.now()}.jpg`;
      return new File([ab], safeName, { type: mime });
    } catch {
      // fall through to FileReader fallback below
    }
  }

  // Fallback: FileReader — works on iOS Safari 11+, all Android WebViews
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const ab = reader.result;
        if (!ab) throw new Error("Null array buffer");
        const mime = file.type || "image/jpeg";
        const safeName = file.name || `photo_${Date.now()}.jpg`;
        resolve(new File([ab as BlobPart], safeName, { type: mime }));
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

export default function ImageSourceModal({
  isOpen,
  onClose,
  onSelectImages,
  multiple = true,
}: ImageSourceModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Array.from(e.target.files || []);
    if (!raw.length) return;

    setLoading(true);
    try {
      // Read all file bytes into memory NOW, before the modal closes and the
      // input unmounts. This is the fix for Android content:// URI invalidation.
      const materialized = await Promise.all(raw.map(materializeFile));
      const valid = materialized.filter((f): f is File => f !== null);

      if (valid.length === 0 && raw.length > 0) {
        import("react-hot-toast").then((module) => {
          module.default.error("Could not read the selected photos on this device. Try the QR upload option instead.");
        });
        setLoading(false);
        onClose();
        return;
      }

      if (valid.length > 0) {
        onSelectImages(valid);
      }
    } finally {
      setLoading(false);
      e.target.value = "";
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                Add Photos
              </h3>
              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Choose a photo source
              </p>
            </div>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {loading ? (
          /* Loading state while we materialize bytes from Android content:// URIs */
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Loading photos…
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {/* Camera — uses capture to open camera directly */}
              <div className="relative overflow-hidden rounded-2xl">
                <div className="flex flex-col items-center justify-center p-4 bg-teal-500/10 border border-teal-500/20 text-center select-none">
                  <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md mb-2">
                    <Camera size={22} />
                  </div>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300">Take Photo</span>
                  <span className="text-[10px] text-teal-600/80 dark:text-teal-400/80 mt-0.5">Use Camera</span>
                </div>
                {/* Overlay input — user physically taps the input, satisfying Android's
                    security requirement that file picker activation comes from a direct user gesture. */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFilesSelected}
                />
              </div>

              {/* Gallery / Files browser */}
              <div className="relative overflow-hidden rounded-2xl">
                <div className="flex flex-col items-center justify-center p-4 bg-blue-500/10 border border-blue-500/20 text-center select-none">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md mb-2">
                    <FolderOpen size={22} />
                  </div>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Gallery / Files</span>
                  <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">Internal &amp; SD</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple={multiple}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFilesSelected}
                />
              </div>
            </div>

            <div className="mt-3.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-left">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                💡
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-200">
                <strong>Got photos on WhatsApp?</strong> Save them to your phone's <em>Gallery / Photos</em> app first so Android grants permission to upload them.
              </p>
            </div>

            <p className="text-[11px] text-center mt-3" style={{ color: "var(--color-text-muted)" }}>
              In Files app: <strong>long-press</strong> the first photo to select multiple.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
