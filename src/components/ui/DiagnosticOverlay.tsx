import { useState, useEffect } from "react";
import { uploadTelemetry, type TelemetryEvent } from "@/utils/uploadTelemetry";
import { useAuthStore } from "@/store/auth/authStore";
import { X, Copy, Trash2, Activity } from "lucide-react";
import toast from "react-hot-toast";

export default function DiagnosticOverlay() {
  const profile = useAuthStore((s) => s.profile);
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<TelemetryEvent[]>([]);

  const isDev = import.meta.env.DEV;
  const isAdmin = profile?.is_admin === true;

  // Initialize Eruda Mobile DevTools for Admins / Devs
  useEffect(() => {
    if (isAdmin || isDev) {
      import("eruda").then((eruda) => eruda.default.init());
    }
  }, [isAdmin, isDev]);

  useEffect(() => {
    if (isOpen) {
      setLogs(uploadTelemetry.getLogs());
      // Poll for new logs while open
      const interval = setInterval(() => {
        setLogs(uploadTelemetry.getLogs());
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isAdmin && !isDev) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[999] bg-black/80 text-white p-3 rounded-full shadow-lg backdrop-blur-sm"
        aria-label="Open Diagnostics"
      >
        <Activity size={20} />
      </button>
    );
  }

  const handleCopy = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text);
    toast.success("Logs copied to clipboard");
  };

  const handleClear = () => {
    uploadTelemetry.clearLogs();
    setLogs([]);
    toast.success("Logs cleared");
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 text-white p-4 flex flex-col font-mono text-xs overflow-hidden">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/20">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Activity size={18} /> Upload Diagnostics
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={handleCopy} className="p-2 bg-white/10 rounded hover:bg-white/20 flex items-center gap-1">
            <Copy size={14} /> Copy JSON
          </button>
          <button onClick={handleClear} className="p-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/40 flex items-center gap-1">
            <Trash2 size={14} /> Clear
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {logs.length === 0 ? (
          <div className="text-white/50 italic text-center mt-10">No logs found. Try selecting an image.</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`p-2 rounded border border-white/10 ${log.stage.includes('error') || log.stage.includes('fail') ? 'bg-red-900/30 border-red-500/30' : 'bg-white/5'}`}>
              <div className="flex justify-between text-white/50 mb-1">
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span>{log.attemptId?.split('_').pop()}</span>
              </div>
              <div className="font-bold text-white/90">{log.stage}</div>
              <div className="text-white/70">{log.message}</div>
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <pre className="mt-2 p-2 bg-black/50 rounded overflow-x-auto text-[10px] text-teal-300">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
