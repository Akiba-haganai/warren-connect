import { useState } from "react";
import { Link } from "react-router-dom";
import { adminService } from "@/services/admin/adminService";
import { triggerNotification } from "@/services/notifications/triggerService";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Spinner from "@/components/shared/Spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      // Notify all admins
      const admins = await adminService.getUsers();
      const adminIds = admins.filter(a => a.is_admin).map(a => a.id);
      await Promise.all(
        adminIds.map(adminId =>
          triggerNotification.accommodationInterest(
            adminId,
            adminId,   // using adminId as placeholder
            "🔐 Password Reset Request",
            `${email.trim()} has requested a password reset.`
          )
        )
      );
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-sm mx-auto pt-10 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#D1FAE5" }}>
          <CheckCircle size={32} style={{ color: "var(--color-success)" }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Request sent!</h2>
          <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
            An admin will review your request and contact you.
          </p>
        </div>
        <Link to="/login" className="btn-primary" style={{ textDecoration: "none" }}>Back to sign in</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 w-full max-w-sm mx-auto">
      <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium self-start" style={{ color: "var(--color-text-secondary)" }}>
        <ArrowLeft size={16} /> Back
      </Link>
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>Reset password</h2>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-secondary)" }}>An admin will help you reset your password.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="field-label">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: "var(--color-text-muted)" }} />
            <input
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              placeholder="you@university.ac.zm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ background: "#FEF2F2", color: "var(--color-danger)", border: "1px solid #FECACA" }}>
            <span>⚠️</span> {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary mt-1">
          {loading ? <Spinner size={16} /> : "Send request"}
        </button>
      </form>
    </div>
  );
}