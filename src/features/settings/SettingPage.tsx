import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
      <div className="px-4 pt-6 space-y-4 max-w-sm mx-auto">
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
      </div>
    </div>
  );
}