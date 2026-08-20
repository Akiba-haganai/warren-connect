import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { ArrowLeft, Lock, Loader2, ShieldCheck, BellRing, Check, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { triggerHaptic } from "@/utils/haptic";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);

  // Push Permission State (Survives Refresh)
  const [pushPerm, setPushPerm] = useState<NotificationPermission | "unsupported">("default");
  const [testingPush, setTestingPush] = useState(false);

  // Granular Notification Preferences (Persisted in localStorage)
  const [notifPrefs, setNotifPrefs] = useState({
    dmAlerts: true,
    priceDropAlerts: true,
    listingAlerts: true,
    emailAlerts: true,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setPushPerm(Notification.permission);
      } else {
        setPushPerm("unsupported");
      }

      const saved = localStorage.getItem("plawza_notif_prefs");
      if (saved) {
        try {
          setNotifPrefs((prev) => ({ ...prev, ...JSON.parse(saved) }));
        } catch {}
      }
    }
  }, []);

  const toggleNotifPref = (key: keyof typeof notifPrefs) => {
    triggerHaptic();
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("plawza_notif_prefs", JSON.stringify(next));
      return next;
    });
    toast.success("Preferences updated", { id: "pref-update", duration: 1500 });
  };

  const handleEnablePush = async () => {
    triggerHaptic();
    if (!("Notification" in window)) {
      toast.error("Web Push is not supported on this browser.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setPushPerm(perm);
      if (perm === "granted") {
        toast.success("Web push notifications enabled!");
      } else if (perm === "denied") {
        toast.error("Notification permission denied in browser settings.");
      }
    } catch {
      toast.error("Failed to request notification permission.");
    }
  };

  const handleTestNotification = async () => {
    triggerHaptic();
    setTestingPush(true);
    try {
      // Request permission first if not yet granted
      if ("Notification" in window && Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        setPushPerm(perm);
      }

      if (!user) {
        toast.error("You must be logged in to test notifications.");
        return;
      }

      // Insert a real in-app notification so the bell badge lights up too
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "system",
        title: "Test Notification",
        body: "🔔 Test notification — your notifications are working!",
        is_read: false,
      });

      // Fire a browser-level push if permission is granted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("PLAWZA", {
          body: "🔔 Push notifications are working perfectly on this device!",
          icon: "/icons/icon-192.png",
        });
      }

      toast.success("Test notification sent! Check your notifications tab.");
    } catch {
      toast.error("Could not send test notification.");
    } finally {
      setTestingPush(false);
    }
  };

  const { updateAvailable, currentVersion, serverVersion } = useVersionCheck();
  const [clearing, setClearing] = useState(false);

  const handleForceRefresh = async () => {
    setClearing(true);
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      toast.success("Cache cleared! Reloading…");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error("Force refresh failed:", err);
      window.location.reload();
    }
  };

  // Check verification request status on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("verification_requests")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setVerificationStatus(data.status);
      });
  }, [user]);

  const handleUploadId = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingId(true);
    try {
      const fileExt = file.name.split(".").pop();
      const path = `verification/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("verification-docs").upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        id_document_url: path,
        full_name: profile?.full_name || profile?.username || user?.email?.split('@')[0] || "Student",
        status: "pending"
      });
      if (insertError) throw insertError;

      setVerificationStatus("pending");
      toast.success("Verification request submitted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit verification request");
    } finally {
      setUploadingId(false);
    }
  };

  const handleUploadClick = () => {
    if (window.confirm("I understand that this document will be reviewed by university administrators and stored securely.")) {
      document.getElementById("id-upload")?.click();
    }
  };

  const handleRequestDeletion = async () => {
    const reason = window.prompt("Why do you want to delete your account? (optional)");
    if (reason === null) return;
    if (!user) return;
    await supabase.from("deletion_requests").insert({
      user_id: user.id,
      reason: reason || null,
      status: "pending",
    });
    toast.success("Deletion request submitted. Admin will review.");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password changed successfully!");
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
        </button>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Settings</h1>
      </div>
      <div className="px-4 pt-6 space-y-4 max-w-sm mx-auto pb-10">
        {/* Verification Tile */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>Student Verification</h2>
          <div className="flex flex-col gap-2">
            {verificationStatus === "approved" ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-xl border border-green-200 dark:border-green-900/30">
                <ShieldCheck size={18} />
                <span className="font-medium">✅ Verified Student</span>
              </div>
            ) : verificationStatus === "pending" ? (
              <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
                <Loader2 size={18} className="animate-spin" />
                <span className="font-medium">⏳ Verification Pending Review</span>
              </div>
            ) : verificationStatus === "rejected" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/30">
                  <span>❌</span>
                  <span className="font-medium">Verification Rejected. Upload again.</span>
                </div>
                <button type="button" onClick={handleUploadClick} className="btn-primary w-full text-center">
                  {uploadingId ? <Loader2 size={14} className="animate-spin mr-1 inline" /> : null}
                  Verify with Student ID
                </button>
                <input id="id-upload" type="file" accept="image/*" className="hidden" onChange={handleUploadId} disabled={uploadingId} />
              </div>
            ) : (
              <>
                <button type="button" onClick={handleUploadClick} className="btn-primary w-full text-center">
                  {uploadingId ? <Loader2 size={14} className="animate-spin mr-1 inline" /> : null}
                  Verify with Student ID
                </button>
                <input id="id-upload" type="file" accept="image/*" className="hidden" onChange={handleUploadId} disabled={uploadingId} />
              </>
            )}
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Upload your official University student ID card. An administrator will verify your profile status.
            </p>
          </div>
        </div>

        {/* Notification Preferences Tile */}
        <div className="card p-5 border border-border bg-surface/80 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <BellRing size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Notification Preferences</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Control real-time updates and device alerts</p>
              </div>
            </div>
            {pushPerm === "granted" && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Check size={11} /> Push Active
              </span>
            )}
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Main Push Permission Row */}
            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-border/80 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Smartphone size={13} className="text-primary" /> Web Push Notifications
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {pushPerm === "granted"
                    ? "Instant notifications delivered to this device"
                    : pushPerm === "denied"
                    ? "Blocked by your browser. Enable in site settings."
                    : "Receive instant push alerts for chats & activity"}
                </p>
              </div>

              {pushPerm === "granted" ? (
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testingPush}
                  className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  {testingPush ? <Loader2 size={12} className="animate-spin" /> : "Test Alert"}
                </button>
              ) : pushPerm === "denied" ? (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  Permission Blocked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="px-3.5 py-1.5 rounded-full bg-primary text-white text-[11px] font-bold hover:bg-primary-dark shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  Enable Push
                </button>
              )}
            </div>

            {/* Granular Toggles (Survive Refresh via localStorage) */}
            <div className="divide-y divide-border/60">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Direct Message Alerts</p>
                  <p className="text-[11px] text-slate-400">Instant notification when a buyer or student messages you</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotifPref("dmAlerts")}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    notifPrefs.dmAlerts ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                  aria-label="Toggle direct message alerts"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      notifPrefs.dmAlerts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Price Drop & Saved Alerts</p>
                  <p className="text-[11px] text-slate-400">Alert me when wishlist items or saved listings update</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotifPref("priceDropAlerts")}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    notifPrefs.priceDropAlerts ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                  aria-label="Toggle price drop alerts"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      notifPrefs.priceDropAlerts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Listing & Order Updates</p>
                  <p className="text-[11px] text-slate-400">Notify about moderation approvals, reviews, and inquiries</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotifPref("listingAlerts")}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    notifPrefs.listingAlerts ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                  aria-label="Toggle listing updates"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      notifPrefs.listingAlerts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Email Updates</p>
                  <p className="text-[11px] text-slate-400">Receive important security, password, and account emails</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotifPref("emailAlerts")}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                    notifPrefs.emailAlerts ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                  aria-label="Toggle email alerts"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      notifPrefs.emailAlerts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* iOS PWA Notice */}
            <div className="mt-2 p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <span className="text-base leading-none">📱</span>
              <p>
                <span className="font-bold">iPhone/iOS Note:</span> On iOS, push notifications require adding PLAWZA to your Home Screen (Tap <span className="font-semibold">Share ➔ Add to Home Screen</span>).
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>Change Password</h2>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div>
              <label className="field-label">New password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input-field pl-9"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Confirm password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input
                  type="password"
                  required
                  className="input-field pl-9"
                  placeholder="Re‑enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>
            {message && (
              <p
                className="text-xs text-center"
                style={{
                  color: message.includes("success") ? "var(--color-success)" : "var(--color-danger)",
                }}
              >
                {message}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Change password"}
            </button>
          </form>
        </div>

        {/* App Version Info & Diagnostics */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>App Information</h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs py-1" style={{ color: "var(--color-text-secondary)" }}>
              <span>Installed Version</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-bold">
                {currentVersion}
              </span>
            </div>
            {updateAvailable && serverVersion ? (
              <div className="flex items-center justify-between text-xs py-1 text-amber-600 dark:text-amber-400">
                <span>Vercel Live Build</span>
                <span className="font-mono bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50 font-bold">
                  {serverVersion} (New Build Ready)
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs py-1 text-emerald-600 dark:text-emerald-400">
                <span>Vercel Deployment</span>
                <span className="font-mono bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50 font-bold">
                  ✅ Up to date
                </span>
              </div>
            )}
            <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
              If you are facing display, caching, or update issues, you can clear all service worker caches manually.
            </p>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("pwa-open-install-banner"));
                toast.success("Opening install options…");
              }}
              className="mt-2 w-full text-center px-4 py-2.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <span>📱</span> Install App to Home Screen
            </button>
            <button
              type="button"
              onClick={handleForceRefresh}
              disabled={clearing}
              className="mt-2 w-full text-center px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors disabled:opacity-50"
            >
              {clearing ? <Loader2 size={12} className="animate-spin mr-1 inline" /> : null}
              {clearing ? "Clearing cache…" : "Force Refresh App"}
            </button>
          </div>
        </div>

        {/* Legal & Support */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>Legal &amp; Support</h2>
          <div className="flex flex-col gap-2.5 text-xs">
            <Link to="/terms" className="flex items-center justify-between py-1 text-slate-700 dark:text-slate-200 hover:text-primary transition-colors">
              <span>Terms of Service</span>
              <span className="text-slate-400">➔</span>
            </Link>
            <div className="h-px bg-border/50" />
            <Link to="/privacy" className="flex items-center justify-between py-1 text-slate-700 dark:text-slate-200 hover:text-primary transition-colors">
              <span>Privacy Policy</span>
              <span className="text-slate-400">➔</span>
            </Link>
            <div className="h-px bg-border/50" />
            <a href="mailto:support@plawza.com" className="flex items-center justify-between py-1 text-slate-700 dark:text-slate-200 hover:text-primary transition-colors">
              <span>Contact Support</span>
              <span className="text-slate-400">support@plawza.com</span>
            </a>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-4 border border-red-200 dark:border-red-900/30">
          <h2 className="text-sm font-semibold mb-3 text-red-600 dark:text-red-400">Danger Zone</h2>
          <button type="button" onClick={handleRequestDeletion} className="w-full text-center px-4 py-2 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
            Request Account Deletion
          </button>
        </div>
      </div>
    </div>
  );
}