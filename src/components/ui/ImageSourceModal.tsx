import { Image as ImageIcon, Camera, FolderOpen, X } from "lucide-react";

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
  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      onSelectImages(Array.from(selected));
      onClose();
    }
    e.target.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
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
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* === Camera Option === */}
          {/* The input is absolute-positioned OVER the visible button area.
              Android Chrome requires the user to physically touch the <input type="file">
              element itself. Programmatic .click() on a hidden input is blocked. */}
          <div className="relative overflow-hidden rounded-2xl">
            <div className="flex flex-col items-center justify-center p-4 bg-teal-500/10 border border-teal-500/20 text-center select-none">
              <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md mb-2">
                <Camera size={22} />
              </div>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-300">Take Photo</span>
              <span className="text-[10px] text-teal-600/80 dark:text-teal-400/80 mt-0.5">Use Camera</span>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFilesSelected}
            />
          </div>

          {/* === Files / Gallery Option === */}
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

        <p className="text-[11px] text-center mt-3" style={{ color: "var(--color-text-muted)" }}>
          In Files app: <strong>long-press</strong> the first photo to select multiple.
        </p>
      </div>
    </div>
  );
}
