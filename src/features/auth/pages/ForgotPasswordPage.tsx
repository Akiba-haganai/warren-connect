import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle, ShieldCheck } from "lucide-react";
import { recoveryService } from "@/services/auth/recoveryService";
import Spinner from "@/components/shared/Spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    setError("");

    try {
      const res = await recoveryService.requestReset(email);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.message || "Failed to submit request.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting your request.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md mx-auto card p-8 items-center text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
          <CheckCircle size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Request Queued!</h2>
          <p className="text-xs mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
            Your password reset request has been securely queued. An admin will review and release your password reset email shortly.
          </p>
        </div>
        <Link to="/login" className="btn-primary w-full text-center" style={{ textDecoration: "none" }}>
          Return to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      <Link
        to="/login"
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors self-start"
      >
        <ArrowLeft size={16} /> Back to Sign In
      </Link>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 card p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Reset Password</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Secure Admin Recovery</p>
          </div>
        </div>

        <div>
          <label className="field-label">University Email Address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@university.ac.zm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs bg-red-50 text-red-600 border border-red-200">
            ⚠️ {error}
          </div>
        )}

        <button type="submit" disabled={loading || !email.trim()} className="btn-primary flex items-center justify-center gap-2">
          {loading ? <Spinner size={16} /> : "Request Password Reset"}
        </button>
      </form>
    </div>
  );
}