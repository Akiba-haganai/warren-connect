import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import {
  MessageCircle, ShoppingBag, Building2, Shield,
  ArrowRight, GraduationCap, Zap, Users, Star,
} from "lucide-react";

const UNIVERSITIES = [
  { name: "UNZA", full: "University of Zambia", color: "#2563EB" },
  { name: "CBU", full: "Copperbelt University", color: "#059669" },
  { name: "MU", full: "Mulungushi University", color: "#7C3AED" },
  { name: "Cavendish", full: "Cavendish University", color: "#D97706" },
  { name: "Apex", full: "Apex Medical University", color: "#DC2626" },
  { name: "Northrise", full: "Northrise University", color: "#0891B2" },
  { name: "ZCAS", full: "ZCAS University", color: "#4F46E5" },
  { name: "DMI", full: "DMI-St. Eugene University", color: "#E11D48" },
];

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState({ members: 0, listings: 0, accommodations: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_hidden", false),
      supabase.from("accommodations").select("id", { count: "exact", head: true }).eq("status", "available"),
    ]).then(([profiles, products, accommodations]) => {
      setStats({
        members: profiles.count ?? 0,
        listings: products.count ?? 0,
        accommodations: accommodations.count ?? 0,
      });
      setStatsLoaded(true);
    }).catch((err) => {
      console.warn("Failed to load landing stats:", err);
      setStatsLoaded(true);
    });
  }, []);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100vh" }}>
      <main>

      {/* Hero */}
      <div className="px-5 pt-16 pb-10 text-center">
        {/* Logo mark */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 mx-auto shadow-lg"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" }}>
          <span className="text-3xl font-black text-white">P</span>
        </div>

        <h1 className="text-4xl font-black mb-2 tracking-tight" style={{ color: "var(--color-text)" }}>
          PLAWZA
        </h1>
        <p className="text-sm mb-2 font-semibold uppercase tracking-widest" style={{ color: "var(--color-primary)" }}>
          Your Campus. Your Marketplace.
        </p>
        <p className="text-sm mb-8 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Buy, sell, find housing, connect with classmates — the all‑in‑one student platform built for Zambian campuses.
        </p>

        {user ? (
          <Link to="/feed" className="btn-primary w-auto px-8 inline-flex items-center gap-2">
            Go to Feed <ArrowRight size={16} />
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="btn-primary w-auto px-8 inline-flex items-center gap-2">
              Join Free <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn-ghost border px-6 inline-flex items-center gap-2"
              style={{ borderColor: "var(--color-border)" }}>
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* Live Stats */}
      <div className="px-5 pb-10">
        <div className="max-w-lg mx-auto rounded-2xl p-5 grid grid-cols-3 gap-2 text-center"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div>
            <p className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>
              {statsLoaded ? `${fmt(stats.members)}+` : "—"}
            </p>
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>
              <Users size={10} className="inline mr-0.5" />Students
            </p>
          </div>
          <div style={{ borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)" }}>
            <p className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>
              {statsLoaded ? `${fmt(stats.listings)}+` : "—"}
            </p>
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>
              <ShoppingBag size={10} className="inline mr-0.5" />Listings
            </p>
          </div>
          <div>
            <p className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>
              {statsLoaded ? `${fmt(stats.accommodations)}+` : "—"}
            </p>
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>
              <Building2 size={10} className="inline mr-0.5" />Rentals
            </p>
          </div>
        </div>
      </div>

      {/* University Badges */}
      <div className="px-5 pb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-center mb-4"
          style={{ color: "var(--color-text-muted)" }}>
          <GraduationCap size={13} className="inline mr-1.5" />Serving students at
        </p>
        <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          {UNIVERSITIES.map((u) => (
            <div key={u.name} title={u.full}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm"
              style={{ background: u.color }}
            >
              <span className="w-2 h-2 rounded-full bg-white/40 inline-block" />
              {u.name}
            </div>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div className="px-5 pb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-center mb-4"
          style={{ color: "var(--color-text-muted)" }}>
          Everything you need on campus
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {[
            { icon: ShoppingBag, title: "Marketplace", desc: "Buy & sell student items with trust badges and price insights.", color: "text-blue-500" },
            { icon: Building2, title: "Housing", desc: "Browse verified landlord listings near your campus.", color: "text-emerald-500" },
            { icon: MessageCircle, title: "Messaging", desc: "Chat directly with sellers, landlords & classmates.", color: "text-purple-500" },
            { icon: Shield, title: "Verified Profiles", desc: "Every user can be verified for safer campus trade.", color: "text-amber-500" },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card p-4 flex flex-col gap-2">
              <Icon size={22} className={color} />
              <div>
                <h3 className="text-sm font-bold mb-0.5" style={{ color: "var(--color-text)" }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PWA Install CTA */}
      {!user && (
        <div className="px-5 pb-10">
          <div className="max-w-lg mx-auto rounded-2xl p-5 text-center"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" }}>
            <Zap size={20} className="text-white/80 mx-auto mb-2" />
            <p className="text-sm font-bold text-white mb-1">Install PLAWZA as an App</p>
            <p className="text-xs text-white/70 mb-4">Add to your home screen for instant access, offline support & push notifications.</p>
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white text-sm font-bold"
              style={{ color: "var(--color-primary)" }}>
              Get Started Free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Explore / Join */}
      {!user && (
        <div className="px-5 pb-10">
          <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold border transition-colors shadow-xs"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "var(--color-surface)" }}>
              🏠 Explore Housing &amp; Marketplace
            </Link>
            <Link to="/login"
              className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold border transition-colors shadow-xs"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", background: "var(--color-surface)" }}>
              🔑 Log In
            </Link>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
            Free for all university students in Zambia
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs pb-10 px-5" style={{ color: "var(--color-text-muted)" }}>
        <div className="flex justify-center gap-4 mb-2">
          <Link to="/terms" className="underline" style={{ color: "inherit" }}>Terms of Service</Link>
          <Link to="/privacy" className="underline" style={{ color: "inherit" }}>Privacy Policy</Link>
        </div>
        <p>© {new Date().getFullYear()} PLAWZA. All rights reserved.</p>
        <p className="mt-1 flex items-center justify-center gap-1">
          <Star size={10} className="text-amber-400" /> Built for Zambian students
        </p>
      </div>
      </main>
    </div>
  );
}