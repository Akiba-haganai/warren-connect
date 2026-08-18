import { useState } from "react";
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

  const handleWhatsAppDirect = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodedWhatsappText}`, "_blank");
  };

  const handleWhatsAppStatus = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      toast.success("Caption copied! Opening WhatsApp Status…", { duration: 3000 });
      setTimeout(() => {
        window.open("https://api.whatsapp.com/send", "_blank");
      }, 800);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank");
  };

  const handleTwitterShare = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, "_blank");
  };

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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface">
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

        {/* Modal Content */}
        <div className="p-5 space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* WhatsApp Direct */}
            <button
              type="button"
              onClick={handleWhatsAppDirect}
              className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Send size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs truncate">WhatsApp</div>
                <div className="text-[10px] opacity-80 truncate">Send to a friend</div>
              </div>
            </button>

            {/* WhatsApp Status */}
            <button
              type="button"
              onClick={handleWhatsAppStatus}
              className="flex items-center gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400 hover:bg-teal-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs truncate">WA Status</div>
                <div className="text-[10px] opacity-80 truncate">Post to your status</div>
              </div>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleFacebookShare}
              className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Globe size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs truncate">Facebook</div>
                <div className="text-[10px] opacity-80 truncate">Share to feed</div>
              </div>
            </button>

            {/* Twitter / X */}
            <button
              type="button"
              onClick={handleTwitterShare}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-800 dark:text-slate-200 hover:bg-slate-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Share2 size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs truncate">X (Twitter)</div>
                <div className="text-[10px] opacity-80 truncate">Post a tweet</div>
              </div>
            </button>
          </div>

          {/* Native Device Share Sheet / Copy Link Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2">
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
}
