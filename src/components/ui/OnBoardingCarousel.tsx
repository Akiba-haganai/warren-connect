import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { MessageCircle, ShoppingBag, Building2, ArrowRight, X } from "lucide-react";

const slides = [
  {
    title: "Connect with Classmates",
    description: "Share posts, ask questions, and stay in the loop with your campus community.",
    icon: MessageCircle,
    action: "See the feed",
    path: "/feed",
    gradient: "from-blue-600 to-cyan-500",
  },
  {
    title: "Buy, Sell & Trade",
    description: "List your items, discover great deals, and even open your own shop.",
    icon: ShoppingBag,
    action: "Explore marketplace",
    path: "/marketplace",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    title: "Find Your Next Home",
    description: "Browse accommodation listings, contact landlords, and find your perfect place.",
    icon: Building2,
    action: "Browse housing",
    path: "/accommodation",
    gradient: "from-emerald-500 to-green-500",
  },
];

export default function OnboardingCarousel() {
  const [show, setShow] = useState(false);
  const [step] = useState(0);

  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Show only if user is logged in AND hasn't seen it before
    const seen = localStorage.getItem("onboarding-seen");
    if (!seen && user) {
      // Delay so the page renders first
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleFinish = () => {
    localStorage.setItem("onboarding-seen", "1");
    setShow(false);
  };

  const handleNavigate = (path: string) => {
    localStorage.setItem("onboarding-seen", "1");
    setShow(false);
    navigate(path);
  };

  if (!show) return null;

  const slide = slides[step];
  const Icon = slide.icon;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div className="w-[85vw] max-w-sm rounded-3xl p-6 text-center relative overflow-hidden" style={{ background: "var(--color-surface)" }}>
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${slide.gradient}`} />
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 p-1 rounded-full"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Skip onboarding"
        >
          <X size={18} />
        </button>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mt-4 bg-gradient-to-tr ${slide.gradient}`}>
          <Icon size={32} className="text-white" />
        </div>
        <h2 className="text-lg font-bold mt-5" style={{ color: "var(--color-text)" }}>{slide.title}</h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{slide.description}</p>
        <div className="flex items-center justify-center gap-2 mt-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? "w-6" : ""}`}
              style={{ background: i === step ? "var(--color-primary)" : "var(--color-border)" }}
            />
          ))}
        </div>
        <button onClick={() => handleNavigate(slide.path)} className="btn-primary mt-5 flex items-center justify-center gap-2">
          {slide.action}
          <ArrowRight size={16} />
        </button>
        <button onClick={handleFinish} className="text-xs font-medium mt-4 block mx-auto" style={{ color: "var(--color-text-muted)" }}>
          {step < slides.length - 1 ? "Next tip" : "Got it!"}
        </button>
      </div>
    </div>
  );
}