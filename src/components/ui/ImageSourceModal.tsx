import { useRef } from "react";
import { Camera, FolderOpen, X, Image as ImageIcon } from "lucide-react";

interface ImageSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImages: (files: File[]) => void;
  multiple?: boolean;
}

export default function ImageSourceModal({
  isOpen,
  onClose,
  onSelectImages,
  multiple = true,
}: ImageSourceModalProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      onSelectImages(Array.from(selected));
      onClose();
    }
    // reset input so picking same file again triggers onChange
    e.target.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Inputs triggered directly via ref.click() for maximum mobile compatibility */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFilesSelected}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic"
          multiple={multiple}
          className="hidden"
          onChange={handleFilesSelected}
        />

        <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ImageIcon size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Photos
              </h3>
              <p className="text-[11px] text-slate-400">
                Choose photo source (select multiple files)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Buttons Stack */}
        <div className="grid grid-cols-2 gap-3">
          {/* Camera Option */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-all cursor-pointer group text-center"
          >
            <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
              <Camera size={22} />
            </div>
            <span className="text-xs font-bold">Take Photo</span>
            <span className="text-[10px] text-teal-600/80 dark:text-teal-400/80 mt-0.5">
              Use Camera
            </span>
          </button>

          {/* Internal Storage / Files Option */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-all cursor-pointer group text-center"
          >
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
              <FolderOpen size={22} />
            </div>
            <span className="text-xs font-bold">Files &amp; Storage</span>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
              SD Card &amp; Internal
            </span>
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400 mt-3">
          Tip: In internal storage / Files app, long-press a photo to select multiple.
        </p>
      </div>
    </div>
  );
}
