import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Spinner from "@/components/shared/Spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (sent) {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-sm mx-auto pt-10 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "#D1FAE5" }}
        >
          <CheckCircle size={32} style={{ color: "var(--color-success)" }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Check your email
          </h2>
          <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
            We sent a reset link to <strong>{email}</strong>. Check your inbox and spam folder.
          </p>
        </div>
        <Link to="/login" className="btn-primary" style={{ textDecoration: "none" }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  // Form state
  return (
    <div className="flex flex-col gap-7 w-full max-w-sm mx-auto">
      {/* Back link */}
      <Link
        to="/login"
        className="flex items-center gap-1.5 text-sm font-medium self-start"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
          Reset password
        </h2>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-secondary)" }}>
          We'll email you a magic link
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email */}
        <div>
          <label className="field-label">Email</label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"
              style={{ color: "var(--color-text-muted)" }}
            />
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

        {/* Error message */}
        {error && (
          <div
            className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
            style={{
              background: "#FEF2F2",
              color: "var(--color-danger)",
              border: "1px solid #FECACA",
            }}
          >
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Submit button */}
        <button type="submit" disabled={loading} className="btn-primary mt-1">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size={16} /> Sending…
            </span>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
    </div>
  );
}