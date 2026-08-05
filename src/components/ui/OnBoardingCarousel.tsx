import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { ShoppingBag, Building2, Shield, ArrowRight, X, ChevronRight } from "lucide-react";

const slides = [
  {
    title: "Buy & Sell Easily",
    description: "Discover verified listings from fellow students or list items you no longer need.",
    icon: ShoppingBag,
    action: "Browse market",
    path: "/feed",
    gradient: "from-blue-600 to-cyan-500",
    bg: "from-blue-600/10 to-cyan-500/10",
  },
  {
    title: "Find Student Housing",
    description: "Explore nearby accommodations, contact landlords, and locate potential roommates.",
    icon: Building2,
    action: "Explore housing",
    path: "/feed",
    gradient: "from-purple-600 to-pink-500",
    bg: "from-purple-600/10 to-pink-500/10",
  },
  {
    title: "Trade with Confidence",
    description: "Connect safely with verified profiles and built-in chat messaging.",
    icon: Shield,
    action: "Get started",
    path: "/feed",
    gradient: "from-emerald-600 to-green-500",
    bg: "from-emerald-600/10 to-green-500/10",
  },
];

export default function OnboardingCarousel() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const seen = localStorage.getItem("onboarding-seen-v2");  // v2 to reset for returning users
    if (!seen && user) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem("onboarding-seen-v2", "1");
    setShow(false);
  };

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const handleNavigate = (path: string) => {
    handleDismiss();
    navigate(path);
  };

  if (!show) return null;

  const slide = slides[step];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="w-[85vw] max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Gradient top bar */}
        <div className={`h-1.5 bg-gradient-to-r ${slide.gradient}`} />

        <div className="px-6 pb-6 pt-5 text-center relative">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Skip"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${slide.gradient} mx-auto flex items-center justify-center`}>
            <Icon size={30} className="text-white" />
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-4">{slide.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{slide.description}</p>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-5">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-blue-600" : "w-2 bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={() => handleNavigate(slide.path)}
            className={`w-full mt-5 py-3 bg-gradient-to-r ${slide.gradient} text-white font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform`}
          >
            {slide.action}
            <ArrowRight size={16} />
          </button>

          <button
            onClick={handleNext}
            className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 transition flex items-center justify-center gap-1 mx-auto"
          >
            {step < slides.length - 1 ? (
              <>
                Next tip <ChevronRight size={16} />
              </>
            ) : (
              "Got it!"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}