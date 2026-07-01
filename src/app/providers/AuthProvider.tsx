import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setState = useAuthStore.setState;
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [profileFetchFailed, setProfileFetchFailed] = useState(false);
  const profileFetchFailedRef = useRef(profileFetchFailed);

  useEffect(() => {
    profileFetchFailedRef.current = profileFetchFailed;
  }, [profileFetchFailed]);

  const updateLastSeen = async (userId: string) => {
    try {
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", userId);
    } catch {}
  };

  const fetchProfileSafely = async (userId: string) => {
    try {
      const profile = await profileService.getProfile(userId);
      setState({ profile, loading: false });
      setProfileFetchFailed(false);
      return profile;
    } catch {
      setProfileFetchFailed(true);
      setState({ loading: false });
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const initialize = useAuthStore.getState().initialize;
      await initialize();
    };
    initAuth();

    const timeout = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.loading) setState({ loading: false });
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(timeout);

      if (event === "TOKEN_REFRESHED") {
        // Token refreshed successfully – nothing to do
        return;
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        setState({ user: null, session: null, profile: null, loading: false });
        return;
      }

      // New sign-in or initial session
      setState({ user: session.user, session, loading: true });
      const profile = await fetchProfileSafely(session.user.id);
      if (profile) await updateLastSeen(session.user.id);
      else setState({ loading: false });
    });

    // Offline/online listeners
    const handleOnline = async () => {
      setIsOffline(false);
      // Retry profile fetch if it failed
      const user = useAuthStore.getState().user;
      if (user && profileFetchFailed) {
        setState({ loading: true });
        await fetchProfileSafely(user.id);
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Visibility / focus updates (already in separate Presence section, but keep lightweight)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const user = useAuthStore.getState().user;
        if (user) updateLastSeen(user.id);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    // Gentle heartbeat every 30s when visible
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") {
        const user = useAuthStore.getState().user;
        if (user) updateLastSeen(user.id);
      }
    }, 30_000);

    return () => {
      clearTimeout(timeout);
      clearInterval(heartbeat);
      subscription.unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, []);

  return (
    <>
      {/* Offline banner */}
      {isOffline && (
        <div className="sticky top-0 z-[300] w-full py-1.5 text-center text-xs font-semibold bg-yellow-100 text-yellow-800">
          You are offline. Some features may be unavailable.
        </div>
      )}
      {children}
    </>
  );
}