import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { MessageCircle, ShoppingBag, Building2, Shield, Star, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="px-4 pt-16 pb-12 text-center">
        <h1 className="text-3xl font-extrabold mb-3" style={{ color: "var(--color-text)" }}>
          Warren Connect
        </h1>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--color-text-secondary)" }}>
          The all‑in‑one student marketplace — buy, sell, find housing, connect with classmates, and build trust.
        </p>

        {user ? (
          <Link to="/feed" className="btn-primary w-auto px-8 inline-flex items-center gap-2">
            Go to Feed <ArrowRight size={16} />
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="btn-primary w-auto px-8">
              Join Free
            </Link>
            <Link to="/login" className="btn-ghost border px-6" style={{ borderColor: "var(--color-border)" }}>
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* Feature cards */}
      <div className="px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          <div className="card p-5 flex items-start gap-3">
            <ShoppingBag size={24} style={{ color: "var(--color-accent)" }} />
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>Marketplace</h3>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                List your items, discover deals, and sell with trust badges and reviews.
              </p>
            </div>
          </div>
          <div className="card p-5 flex items-start gap-3">
            <Building2 size={24} style={{ color: "var(--color-accent)" }} />
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>Accommodation</h3>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Browse housing listings, contact landlords, and find your next home.
              </p>
            </div>
          </div>
          <div className="card p-5 flex items-start gap-3">
            <MessageCircle size={24} style={{ color: "var(--color-accent)" }} />
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>Messaging</h3>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Chat in real time with sellers, landlords, and potential roommates.
              </p>
            </div>
          </div>
          <div className="card p-5 flex items-start gap-3">
            <Shield size={24} style={{ color: "var(--color-accent)" }} />
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>Verified Profiles</h3>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Know who you're dealing with — every user can be verified and rated.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>
          Trusted by students
        </p>
        <div className="flex justify-center gap-8">
          <div>
            <p className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>100+</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Members</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>50+</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Listings</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>4.8</p>
            <p className="text-xs flex items-center justify-center gap-1" style={{ color: "var(--color-text-muted)" }}>
              <Star size={12} style={{ color: "var(--color-accent)" }} /> Rating
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs pb-8 px-4" style={{ color: "var(--color-text-muted)" }}>
        <Link to="/terms" className="underline mr-3" style={{ color: "inherit" }}>
          Terms of Service
        </Link>
        <Link to="/privacy" className="underline" style={{ color: "inherit" }}>
          Privacy Policy
        </Link>
        <p className="mt-2">© {new Date().getFullYear()} Warren Connect. All rights reserved.</p>
      </div>
    </div>
  );
}