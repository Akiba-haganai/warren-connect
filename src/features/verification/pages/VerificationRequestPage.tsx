import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { storageService } from "@/services/storage/storageService";
import { verificationService } from "@/services/verification/verificationService";
import { compressImage } from "@/utils/compressImage";
import { Shield, Upload, Loader2, ArrowLeft, Clock, CheckCircle } from "lucide-react";

export default function VerificationRequestPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [reason, setReason] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    verificationService.getMyRequests(user.id).then((reqs) => {
      if (reqs.length > 0) setExistingRequest(reqs[0]);
    });
  }, [user]);

  if (!user || !profile) return null;
  if (profile.is_verified) {
    navigate("/profile", { replace: true });
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFile(file);
    setPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !idFile || !fullName.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const compressed = await compressImage(idFile);
      const { publicUrl } = await storageService.uploadFile(
        "verification-documents",
        compressed,
        user.id
      );
      await verificationService.submitRequest(
        user.id,
        fullName.trim(),
        publicUrl,
        reason.trim() || undefined
      );
      navigate("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (existingRequest && existingRequest.status !== "rejected") {
    const status = (existingRequest.status as "pending" | "approved") || "pending";
    const config: Record<"pending" | "approved", { icon: React.FC<{ size?: number; style?: React.CSSProperties }>; color: string; text: string }> = {
      pending: { icon: Clock, color: "var(--color-warning)", text: "Your verification is being reviewed." },
      approved: { icon: CheckCircle, color: "var(--color-success)", text: "Your verification has been approved!" },
    };
    const cfg = config[status];
    const Icon = cfg.icon;

    return (
      <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
             style={{ background: "rgba(250,250,248,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--color-border)" }}>
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
          </button>
          <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Verification</h1>
        </div>
        <div className="px-4 pt-10 text-center">
          <Icon size={48} style={{ color: cfg.color, marginBottom: 16 }} />
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{cfg.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
           style={{ background: "rgba(250,250,248,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
        </button>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Get Verified</h1>
      </div>

      <div className="px-4 pt-6 pb-8">
        <div className="card p-5 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent-light)" }}>
              <Shield size={18} style={{ color: "var(--color-accent)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Verified Badge</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Build trust with other students and landlords</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="field-label">Full name (as on ID)</label>
              <input
                required
                className="input-field"
                placeholder="Your legal full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">University ID / Document</label>
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="ID preview" className="w-full rounded-xl object-cover" style={{ maxHeight: 200 }} />
                  <button
                    type="button"
                    onClick={() => { setIdFile(null); setPreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-8 rounded-xl flex flex-col items-center gap-2 text-sm font-medium"
                  style={{
                    background: "var(--color-bg)",
                    border: "1.5px dashed var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <Upload size={20} />
                  Upload student ID or national ID
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileSelect} />
            </div>

            <div>
              <label className="field-label">Reason (optional)</label>
              <textarea
                rows={2}
                className="input-field resize-none"
                placeholder="Why do you want to be verified?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm px-4 py-3 rounded-xl" style={{ background: "#FEF2F2", color: "var(--color-danger)", border: "1px solid #FECACA" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting || !idFile || !fullName.trim()} className="btn-primary">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : "Submit for verification"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}