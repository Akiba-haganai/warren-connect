import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Lock, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);

  // Check verification request status on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("verification_requests")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setVerificationStatus(data.status);
      });
  }, [user]);

  const handleUploadId = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingId(true);
    try {
      const fileExt = file.name.split(".").pop();
      const path = `verification/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("verification-docs").upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        id_document_url: path,
        full_name: profile?.full_name || profile?.username || user?.email?.split('@')[0] || "Student",
        status: "pending"
      });
      if (insertError) throw insertError;

      setVerificationStatus("pending");
      toast.success("Verification request submitted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit verification request");
    } finally {
      setUploadingId(false);
    }
  };

  const handleUploadClick = () => {
    if (window.confirm("I understand that this document will be reviewed by university administrators and stored securely.")) {
      document.getElementById("id-upload")?.click();
    }
  };

  const handleRequestDeletion = async () => {
    const reason = window.prompt("Why do you want to delete your account? (optional)");
    if (reason === null) return;
    if (!user) return;
    await supabase.from("deletion_requests").insert({
      user_id: user.id,
      reason: reason || null,
      status: "pending",
    });
    toast.success("Deletion request submitted. Admin will review.");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password changed successfully!");
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
        </button>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Settings</h1>
      </div>
      <div className="px-4 pt-6 space-y-4 max-w-sm mx-auto pb-10">
        {/* Verification Tile */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>Student Verification</h2>
          <div className="flex flex-col gap-2">
            {verificationStatus === "approved" ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-xl border border-green-200 dark:border-green-900/30">
                <ShieldCheck size={18} />
                <span className="font-medium">✅ Verified Student</span>
              </div>
            ) : verificationStatus === "pending" ? (
              <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
                <Loader2 size={18} className="animate-spin" />
                <span className="font-medium">⏳ Verification Pending Review</span>
              </div>
            ) : verificationStatus === "rejected" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/30">
                  <span>❌</span>
                  <span className="font-medium">Verification Rejected. Upload again.</span>
                </div>
                <button type="button" onClick={handleUploadClick} className="btn-primary w-full text-center">
                  {uploadingId ? <Loader2 size={14} className="animate-spin mr-1 inline" /> : null}
                  Verify with Student ID
                </button>
                <input id="id-upload" type="file" accept="image/*" className="hidden" onChange={handleUploadId} disabled={uploadingId} />
              </div>
            ) : (
              <>
                <button type="button" onClick={handleUploadClick} className="btn-primary w-full text-center">
                  {uploadingId ? <Loader2 size={14} className="animate-spin mr-1 inline" /> : null}
                  Verify with Student ID
                </button>
                <input id="id-upload" type="file" accept="image/*" className="hidden" onChange={handleUploadId} disabled={uploadingId} />
              </>
            )}
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Upload your official University student ID card. An administrator will verify your profile status.
            </p>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>Change Password</h2>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div>
              <label className="field-label">New password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input-field pl-9"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Confirm password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input
                  type="password"
                  required
                  className="input-field pl-9"
                  placeholder="Re‑enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>
            {message && (
              <p
                className="text-xs text-center"
                style={{
                  color: message.includes("success") ? "var(--color-success)" : "var(--color-danger)",
                }}
              >
                {message}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Change password"}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="card p-4 border border-red-200 dark:border-red-900/30">
          <h2 className="text-sm font-semibold mb-3 text-red-600 dark:text-red-400">Danger Zone</h2>
          <button type="button" onClick={handleRequestDeletion} className="w-full text-center px-4 py-2 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
            Request Account Deletion
          </button>
        </div>
      </div>
    </div>
  );
}