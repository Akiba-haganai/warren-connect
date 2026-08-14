import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
  const [studentIdNum, setStudentIdNum] = useState("");
  const [nrcNum, setNrcNum] = useState("");
  const [reason] = useState("");
  
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  
  const [nrcFile, setNrcFile] = useState<File | null>(null);
  const [nrcPreview, setNrcPreview] = useState<string | null>(null);
  
  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingRequest, setExistingRequest] = useState<any>(null);
  
  const idFileRef = useRef<HTMLInputElement>(null);
  const nrcFileRef = useRef<HTMLInputElement>(null);

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

  const handleIdSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleNrcSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNrcFile(file);
    setNrcPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !idFile || !fullName.trim() || !certified) return;
    setSubmitting(true);
    setError("");
    try {
      const compressedId = await compressImage(idFile);
      const { path: idPath } = await storageService.uploadPrivateFile(
        "verification-documents",
        compressedId,
        user.id
      );

      let nrcPath: string | undefined;
      if (nrcFile) {
        const compressedNrc = await compressImage(nrcFile);
        const res = await storageService.uploadPrivateFile(
          "verification-documents",
          compressedNrc,
          user.id
        );
        nrcPath = res.path;
      }

      await verificationService.submitRequest(
        user.id,
        fullName.trim(),
        idPath,
        nrcPath,
        studentIdNum.trim() || undefined,
        nrcNum.trim() || undefined,
        reason.trim() || undefined
      );

      toast.success("Verification request submitted for admin review! 🛡️");
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
      pending: { icon: Clock, color: "var(--color-warning)", text: "Your verification request is currently under review by administrators." },
      approved: { icon: CheckCircle, color: "var(--color-success)", text: "Your account is officially verified!" },
    };
    const cfg = config[status];
    const Icon = cfg.icon;

    return (
      <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-surface border-b border-border">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">Verification Status</h1>
        </div>
        <div className="px-4 pt-12 text-center max-w-sm mx-auto">
          <Icon size={52} style={{ color: cfg.color, margin: "0 auto 16px" }} />
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">{cfg.text}</p>
          <p className="text-xs text-slate-500">Submitted on: {new Date(existingRequest.created_at).toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-surface border-b border-border shadow-2xs">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-base font-extrabold text-slate-900 dark:text-white">Student & Seller Verification</h1>
      </div>

      <div className="px-4 pt-6 pb-12 max-w-lg mx-auto space-y-4">
        <div className="card p-5 border border-border bg-surface shadow-xs rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Genuine Verification</p>
              <p className="text-xs text-slate-500">Official student ID & NRC review for high-trust matching</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Full Legal Name (as on ID)
              </label>
              <input
                required
                className="input-field text-xs"
                placeholder="e.g. Chileshe Mwamba"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Student / Staff ID Number
                </label>
                <input
                  type="text"
                  className="input-field text-xs"
                  placeholder="e.g. 20240918"
                  value={studentIdNum}
                  onChange={(e) => setStudentIdNum(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  NRC / Passport Number
                </label>
                <input
                  type="text"
                  className="input-field text-xs"
                  placeholder="e.g. 123456/11/1"
                  value={nrcNum}
                  onChange={(e) => setNrcNum(e.target.value)}
                />
              </div>
            </div>

            {/* Document 1: Student ID Card */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                1. Official Student ID Card / Admission Letter (Required)
              </label>
              {idPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-border">
                  <img src={idPreview} alt="Student ID" className="w-full h-44 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setIdFile(null); setIdPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => idFileRef.current?.click()}
                  className="w-full py-6 rounded-2xl border-2 border-dashed border-border bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center gap-1.5 text-xs text-slate-500 hover:border-slate-400 transition-all"
                >
                  <Upload size={20} className="text-primary" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Upload Student ID Photo</span>
                </button>
              )}
              <input ref={idFileRef} type="file" accept="image/*" className="hidden" onChange={handleIdSelect} />
            </div>

            {/* Document 2: NRC Card */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                2. National Registration Card (NRC) / Passport (Optional, highly recommended)
              </label>
              {nrcPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-border">
                  <img src={nrcPreview} alt="NRC Card" className="w-full h-44 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setNrcFile(null); setNrcPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => nrcFileRef.current?.click()}
                  className="w-full py-6 rounded-2xl border-2 border-dashed border-border bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center gap-1.5 text-xs text-slate-500 hover:border-slate-400 transition-all"
                >
                  <Upload size={20} className="text-emerald-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Upload NRC Card Photo</span>
                </button>
              )}
              <input ref={nrcFileRef} type="file" accept="image/*" className="hidden" onChange={handleNrcSelect} />
            </div>

            {/* Anti-fraud Certification */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-2.5">
              <input
                type="checkbox"
                id="certified"
                className="mt-0.5 rounded cursor-pointer"
                checked={certified}
                onChange={(e) => setCertified(e.target.checked)}
              />
              <label htmlFor="certified" className="text-[11px] text-amber-900 dark:text-amber-200 font-medium leading-snug cursor-pointer">
                I certify that these documents are genuine and belong to me. Submitting fake or altered documents results in an immediate permanent ban.
              </label>
            </div>

            {error && (
              <p className="text-xs p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !idFile || !fullName.trim() || !certified}
              className="btn-primary w-full py-3 rounded-full text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Submit Documents for Verification"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}