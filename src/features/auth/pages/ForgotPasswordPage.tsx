import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { recoveryService, type RecoveryQuestion, type SubmittedAnswer } from "@/services/auth/recoveryService";
import { Mail, ArrowLeft, CheckCircle, ShieldCheck, HelpCircle } from "lucide-react";
import Spinner from "@/components/shared/Spinner";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "quiz" | "done">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState<RecoveryQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const [cooldown, setCooldown] = useState(0);

  // Restore cooldown from localStorage when email changes
  useEffect(() => {
    if (!email) {
      setCooldown(0);
      return;
    }
    const key = `reset_cooldown_${email.trim().toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const remaining = Math.ceil((Number(stored) - Date.now()) / 1000);
      if (remaining > 0) {
        setCooldown(remaining);
      } else {
        localStorage.removeItem(key);
        setCooldown(0);
      }
    } else {
      setCooldown(0);
    }
  }, [email]);

  // Tick the cooldown timer down every second
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const persistCooldown = (seconds: number) => {
    setCooldown(seconds);
    localStorage.setItem(`reset_cooldown_${email.trim().toLowerCase()}`, (Date.now() + seconds * 1000).toString());
  };

  // Step 1: Start recovery challenge
  const handleStartChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || cooldown > 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await recoveryService.getChallenge(email.trim());
      if (res.success && res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        setStep("quiz");
      } else {
        setError(res.message || "Failed to load verification questions.");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to generate identity verification challenge.";
      
      // Handle Rate Limiting gracefully
      if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("seconds")) {
        const match = msg.match(/after (\d+) seconds/i);
        const secs = match ? parseInt(match[1], 10) : 60;
        persistCooldown(secs);
        setError(`Please wait ${secs}s before trying again.`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit quiz answers
  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(selectedAnswers).length < questions.length) {
      toast.error("Please answer all verification questions.");
      return;
    }

    setLoading(true);
    setError("");

    const answersPayload: SubmittedAnswer[] = questions.map((q) => ({
      type: q.type,
      selected_value: selectedAnswers[q.type] || "",
    }));

    try {
      const res = await recoveryService.verifyChallenge(email.trim(), answersPayload);
      if (res.success) {
        setStep("done");
        toast.success("Identity verified successfully!");
      } else {
        setError(res.message || "Identity verification failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Verification submission failed.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto pt-8 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
          <CheckCircle size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Proof of Ownership Verified!</h2>
          <p className="text-xs mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
            Your identity challenge was passed. Your request has been queued in the Admin Password Recovery Queue.
            An admin will review and release your password reset email shortly.
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

      {step === "email" && (
        <form onSubmit={handleStartChallenge} className="flex flex-col gap-5 card p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Reset Password</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Proof-of-Ownership Account Verification</p>
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

          <button type="submit" disabled={loading || !email.trim() || cooldown > 0} className="btn-primary flex items-center justify-center gap-2">
            {loading ? <Spinner size={16} /> : cooldown > 0 ? `Please wait ${cooldown}s` : "Continue to Verification Challenge"}
          </button>
        </form>
      )}

      {step === "quiz" && (
        <form onSubmit={handleSubmitQuiz} className="flex flex-col gap-5 card p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Account Identity Challenge</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Answer 3 questions generated from your account activity</p>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  {idx + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedAnswers[q.type] === opt
                          ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/50 dark:border-blue-400 dark:text-blue-300 font-medium"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q_${q.type}`}
                        value={opt}
                        checked={selectedAnswers[q.type] === opt}
                        onChange={() => setSelectedAnswers((prev) => ({ ...prev, [q.type]: opt }))}
                        className="text-blue-600"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-xl text-xs bg-red-50 text-red-600 border border-red-200">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
            {loading ? <Spinner size={16} /> : "Submit Identity Verification"}
          </button>
        </form>
      )}
    </div>
  );
}