import { useParams } from "react-router-dom";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, ImagePlus } from "lucide-react";

const BUCKET = "cross-device-uploads";

export default function SessionUploadPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !sessionId) return;

    setStatus("uploading");
    setErrorMessage("");
    let succeeded = 0;

    for (const file of files) {
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const path = `${sessionId}/${safeName}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (!error) {
        succeeded++;
      } else {
        console.error("Upload error:", error);
        setErrorMessage(error.message);
      }
    }

    setUploadedCount((prev) => prev + succeeded);
    setStatus(succeeded > 0 ? "done" : "error");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-400 text-sm">
        Invalid or expired upload session.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Header Branding */}
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <UploadCloud size={28} />
        </div>

        <h1 className="text-xl font-bold text-white mb-2">Upload to PLAWZA</h1>
        <p className="text-xs text-slate-400 mb-6">
          Photos selected here will automatically sync directly into your active composer on your other device.
        </p>

        {/* File Drop / Select Area */}
        <div className="relative group cursor-pointer border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-950/60 rounded-2xl p-6 transition-all duration-200 mb-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            disabled={status === "uploading"}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
            <ImagePlus size={32} className="text-teal-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold text-slate-200">
              {status === "uploading" ? "Uploading photos…" : "Tap to choose photos"}
            </span>
            <span className="text-[11px] text-slate-500">Supports JPG, PNG, WEBP, HEIC</span>
          </div>
        </div>

        {/* Status Indicators */}
        {status === "uploading" && (
          <div className="flex items-center justify-center gap-2 text-teal-400 text-xs font-medium py-2">
            <Loader2 size={16} className="animate-spin" />
            <span>Sending photos to your phone…</span>
          </div>
        )}

        {status === "done" && (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-medium py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 mb-2">
            <CheckCircle2 size={16} />
            <span>
              {uploadedCount} photo{uploadedCount > 1 ? "s" : ""} synced! You can add more or close this tab.
            </span>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center justify-center gap-2 text-red-400 text-xs font-medium py-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 mb-2">
            <AlertCircle size={16} />
            <span>{errorMessage || "Failed to upload. Please try again."}</span>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Session: <code className="text-slate-400">{sessionId.slice(0, 8)}…</code></span>
          <span>Temporary transfer</span>
        </div>
      </div>
    </div>
  );
}
