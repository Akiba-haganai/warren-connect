import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Share2, Send, MessageSquare, Globe } from "lucide-react";
import toast from "react-hot-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  price?: number | string;
  url?: string;
  imageUrl?: string;
  category?: "product" | "accommodation" | "post";
  location?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  title,
  price,
  url,
  imageUrl,
  category = "product",
  location,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetUrl = url || window.location.href;
  const formattedPrice = price ? ` — K${Number(price).toLocaleString()}` : "";
  const locationText = location ? ` (${location})` : "";

  // PLAWZA WhatsApp Spec: Double line breaks, clear formatting, standalone URL line
  const whatsappText = `Check out this listing on PLAWZA:\n\n${title}${formattedPrice}${locationText}\n\n${targetUrl}`;
  const encodedWhatsappText = encodeURIComponent(whatsappText);
  const encodedUrl = encodeURIComponent(targetUrl);
  const encodedTitle = encodeURIComponent(`Check out ${title}${formattedPrice} on PLAWZA! 🛍️`);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} | PLAWZA`,
          text: `Check out ${title}${formattedPrice} on PLAWZA!`,
          url: targetUrl,
        });
      } catch {
        // User cancelled native share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const shareOptions = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      description: "Send to a friend",
      href: `https://wa.me/?text=${encodedWhatsappText}`,
      iconBg: "bg-[#25D366]",
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.39a9.9 9.9 0 0 0 4.76 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.11c-.24.68-1.4 1.31-1.93 1.36-.5.05-.99.24-3.34-.7-2.82-1.12-4.63-4-4.77-4.19-.14-.19-1.14-1.52-1.14-2.9 0-1.38.73-2.06.98-2.34.26-.28.56-.35.75-.35h.53c.17 0 .4-.06.62.48.24.58.8 2 .87 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.13-.28.28-.12.55.16.28.71 1.18 1.53 1.92 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.17-.19.7-.82.89-1.1.19-.28.38-.23.63-.14.26.09 1.66.79 1.94.93.28.14.47.21.53.33.07.12.07.68-.17 1.36Z" />
        </svg>
      ),
    },
    {
      id: "facebook",
      label: "Facebook",
      description: "Share to timeline",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      iconBg: "bg-[#1877F2]",
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6" aria-hidden="true">
          <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
        </svg>
      ),
    },
    {
      id: "twitter",
      label: "X (Twitter)",
      description: "Post to your feed",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      iconBg: "bg-black",
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5" aria-hidden="true">
          <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.7l-5.2-6.8L5.6 22H2.4l8.1-9.3L1.5 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
        </svg>
      ),
    },
    {
      id: "telegram",
      label: "Telegram",
      description: "Send in a chat",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      iconBg: "bg-[#26A5E4]",
      icon: (
        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6" aria-hidden="true">
          <path d="M21.94 4.5 18.6 20.2c-.25 1.13-.9 1.4-1.82.87l-5.03-3.7-2.43 2.33c-.27.27-.5.5-1.02.5l.36-5.13 9.34-8.44c.4-.36-.09-.56-.63-.2L6.06 12.9 1.1 11.34c-1.08-.34-1.1-1.08.23-1.6L20.6 3.34c.9-.33 1.68.21 1.34 1.16Z" />
        </svg>
      ),
    },
  ] as const;

  // We use a Portal to ensure the fixed modal breaks out of any parent CSS transforms/filters
  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Share2 size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-none">Share Listing</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Spread the word across your campus network
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
            aria-label="Close share modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content (Scrollable) */}
        <div className="p-5 pb-8 sm:pb-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Card Preview Banner */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-border">
            {imageUrl && !imageUrl.includes("pending-uploads") ? (
              <img src={imageUrl} alt={title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                P
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{title}</p>
              {price && (
                <p className="text-xs font-extrabold text-primary mt-0.5">
                  K{Number(price).toLocaleString()}
                  {category === "accommodation" ? "/mo" : ""}
                </p>
              )}
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{targetUrl}</p>
            </div>
          </div>

          {/* Share Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shareOptions.map((opt) => (
              <a
                key={opt.id}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:border-border-hover dark:hover:bg-slate-800/50 hover:bg-slate-50 active:scale-[0.98]"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${opt.iconBg}`}>
                  {opt.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{opt.label}</span>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {opt.description}
                  </span>
                </span>
              </a>
            ))}
          </div>

          {/* Native Device Share Sheet / Copy Link Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2 shrink-0">
            {"share" in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors cursor-pointer"
              >
                <Share2 size={16} /> More Options
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                "share" in navigator
                  ? "border border-border bg-surface text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  : "w-full bg-primary text-white hover:bg-primary-dark"
              }`}
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render into body to escape ALL CSS transforms/positioning traps
  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
