import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import Spinner from "@/components/shared/Spinner";

export default function RegisterPage() {
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!tosAgreed) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await signUp(email.trim(), password);
      navigate("/complete-profile");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(
        msg.includes("already registered")
          ? "An account with this email already exists."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-7 w-full max-w-sm mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
          Join PLAWZA
        </h2>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-secondary)" }}>
          Your campus community is waiting
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

        {/* Password */}
        <div>
          <label className="field-label">Password</label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "2.5rem", paddingRight: "2.75rem" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>
            At least 8 characters
          </p>
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

        {/* Terms Agreement */}
        <label className="flex items-start gap-2.5 cursor-pointer mt-1 text-xs select-none">
          <input
            type="checkbox"
            checked={tosAgreed}
            onChange={(e) => setTosAgreed(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 shrink-0"
          />
          <span style={{ color: "var(--color-text-secondary)" }}>
            I agree to the{" "}
            <Link to="/terms" target="_blank" className="font-bold underline" style={{ color: "var(--color-primary)" }}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" className="font-bold underline" style={{ color: "var(--color-primary)" }}>
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {/* Submit button */}
        <button type="submit" disabled={loading || !tosAgreed} className="btn-primary mt-1">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size={16} /> Creating account…
            </span>
          ) : (
            "Create account"
          )}
        </button>

        <p className="text-xs text-slate-400 text-center mt-3">
          Your privacy is important. Uploaded IDs are only visible to university
          administrators for verification purposes.
        </p>
      </form>

      {/* Bottom link */}
      <p className="text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Already a member?{" "}
        <Link
          to="/login"
          className="font-bold"
          style={{ color: "var(--color-primary)" }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}