import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { ShoppingBag, Building2, Shield, ArrowRight, X, ChevronRight, Zap, CheckCircle2 } from "lucide-react";

const slides = [
  {
    title: "Buy & Sell Safely",
    description: "Discover verified student listings, negotiate prices with AI pricing suggestions, and trade with confidence.",
    badge: "Student Marketplace",
    highlights: ["Verified Seller Badges", "IQR Price Range Estimates", "Perceptual Image Hash Protection"],
    icon: ShoppingBag,
    action: "Explore Marketplace",
    path: "/marketplace",
    gradient: "from-blue-600 to-cyan-500",
    bg: "from-blue-600/10 to-cyan-500/10",
  },
  {
    title: "Find Housing & Roommates",
    description: "Browse nearby off-campus accommodations, contact landlords directly, and find compatible roommates.",
    badge: "Campus Housing",
    highlights: ["Verified Landlords", "Filter by Rent & Distance", "Roommate Matching"],
    icon: Building2,
    action: "Find Accommodation",
    path: "/accommodation",
    gradient: "from-purple-600 to-pink-500",
    bg: "from-purple-600/10 to-pink-500/10",
  },
  {
    title: "Instant Alerts & AI Safety",
    description: "Get instant price-drop notifications, AI text moderation, and instant mobile phone verification.",
    badge: "Smart & Secure",
    highlights: ["Real-time Notifications", "OpenAI Content Moderation", "Fast-Track Phone OTP"],
    icon: Shield,
    action: "Get Started Now",
    path: "/feed",
    gradient: "from-emerald-600 to-teal-500",
    bg: "from-emerald-600/10 to-teal-500/10",
  },
];

export default function OnboardingCarousel() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const seen = localStorage.getItem("onboarding-seen-v3");
    if (!seen && user) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem("onboarding-seen-v3", "1");
    setShow(false);
  };

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  const handleNavigate = (path: string) => {
    handleDismiss();
    navigate(path);
  };

  if (!show) return null;

  const slide = slides[step];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 transition-all duration-300"
      >
        {/* Top Accent Header */}
        <div className={`h-2 bg-gradient-to-r ${slide.gradient}`} />

        <div className="p-6 text-center relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Skip onboarding"
          >
            <X size={18} />
          </button>

          {/* Badge */}
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-gradient-to-r ${slide.bg} text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 mb-4`}>
            <Zap size={11} className="text-amber-500" /> {slide.badge}
          </span>

          {/* Icon Header */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${slide.gradient} mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20`}>
            <Icon size={30} className="text-white" />
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight">
            {slide.title}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            {slide.description}
          </p>

          {/* Feature Highlights */}
          <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left space-y-1.5">
            {slide.highlights.map((h) => (
              <div key={h} className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mt-5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? "w-7 bg-blue-600 dark:bg-blue-500" : "w-2 bg-slate-200 dark:bg-slate-700"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={() => handleNavigate(slide.path)}
            className={`w-full mt-5 py-3.5 bg-gradient-to-r ${slide.gradient} text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all`}
          >
            {slide.action}
            <ArrowRight size={15} />
          </button>

          <button
            onClick={handleNext}
            className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            {step < slides.length - 1 ? (
              <>
                Next Tip <ChevronRight size={14} />
              </>
            ) : (
              "Done with Tour"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}