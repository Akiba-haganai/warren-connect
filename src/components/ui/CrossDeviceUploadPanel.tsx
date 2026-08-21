import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { QrCode, Copy, Check, X, Smartphone, Monitor, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

interface CrossDeviceUploadPanelProps {
  onFilesReceived: (files: File[]) => Promise<void> | void;
}

const BUCKET = "cross-device-uploads";
const POLL_INTERVAL_MS = 2500;

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export default function CrossDeviceUploadPanel({ onFilesReceived }: CrossDeviceUploadPanelProps) {
  const [sessionId] = useState(generateSessionId);
  const [open, setOpen] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [copied, setCopied] = useState(false);

  const seenPaths = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uploadUrl = `${window.location.origin}/upload/session/${sessionId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    uploadUrl
  )}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      toast.success("Upload link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const poll = useCallback(async () => {
    try {
      setIsPolling(true);
      const { data, error } = await supabase.storage.from(BUCKET).list(sessionId);
      if (error || !data || data.length === 0) return;

      const newEntries = data.filter((entry) => !seenPaths.current.has(entry.name) && entry.name !== ".emptyFolderPlaceholder");
      if (newEntries.length === 0) return;

      const downloaded: File[] = [];
      const pathsToDelete: string[] = [];

      for (const entry of newEntries) {
        seenPaths.current.add(entry.name);
        const filePath = `${sessionId}/${entry.name}`;
        
        const { data: fileData, error: dlErr } = await supabase.storage
          .from(BUCKET)
          .download(filePath);

        if (dlErr || !fileData) {
          console.error("Failed to download session file:", dlErr);
          continue;
        }

        const mime = fileData.type || "image/jpeg";
        downloaded.push(new File([fileData], entry.name, { type: mime }));
        pathsToDelete.push(filePath);
      }

      if (downloaded.length > 0) {
        setReceivedCount((prev) => prev + downloaded.length);
        toast.success(`Received ${downloaded.length} photo${downloaded.length > 1 ? "s" : ""} from other device!`);
        await onFilesReceived(downloaded);

        // Delete temporary session files after successful pull
        if (pathsToDelete.length > 0) {
          await supabase.storage.from(BUCKET).remove(pathsToDelete);
        }
      }
    } catch (err) {
      console.warn("Session polling error:", err);
    } finally {
      setIsPolling(false);
    }
  }, [sessionId, onFilesReceived]);

  useEffect(() => {
    if (!open) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // Initial check immediately
    poll();
    // Set up continuous poll
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, poll]);

  if (!open) {
    return (
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition-all cursor-pointer select-none"
        >
          <QrCode size={14} />
          <span>Upload from PC or another device via QR</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-2xl border transition-all duration-200"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Monitor size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
              Scan to Upload from PC / Phone
            </h4>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              Open camera or link on another device
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 rounded-full text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 my-4">
        {/* QR Code Container */}
        <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 shrink-0">
          <img
            src={qrImageUrl}
            alt="Upload QR Code"
            className="w-36 h-36 object-contain block"
            loading="eager"
          />
        </div>

        {/* Instructions & Actions */}
        <div className="flex flex-col justify-center gap-2.5 text-left flex-1 w-full">
          <div className="flex items-start gap-2">
            <Smartphone size={16} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              1. Scan this QR code or copy the link below.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles size={16} className="text-teal-500 mt-0.5 shrink-0" />
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              2. Select photos on your other device — they will appear here automatically.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied!" : "Copy Upload Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live sync banner */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
        style={{
          background: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
        }}
      >
        <div className="flex items-center gap-2">
          {isPolling ? (
            <Loader2 size={13} className="animate-spin text-primary" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <span className="text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Listening for photos…
          </span>
        </div>

        {receivedCount > 0 && (
          <span className="text-[11px] font-bold text-emerald-500">
            {receivedCount} synced ✓
          </span>
        )}
      </div>
    </div>
  );
}
