import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialize = useAuthStore((state) => state.initialize);
  const setState = useAuthStore.setState;

  useEffect(() => {
    initialize();

    // Failsafe: if auth doesn't resolve in 5 seconds, force loading off
    const timeout = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.loading) {
        setState({ loading: false });
      }
    }, 5000);

    const { data } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        clearTimeout(timeout);
        if (!session?.user) {
          setState({
            user: null,
            session: null,
            profile: null,
            loading: false,
          });
          return;
        }

        try {
          const profile = await profileService.getProfile(session.user.id);
          setState({
            user: session.user,
            session,
            profile,
            loading: false,
          });

          // Update last_seen immediately
          await supabase
            .from("profiles")
            .update({ last_seen: new Date().toISOString() })
            .eq("id", session.user.id);
        } catch (error) {
          console.error("Error fetching profile during auth state change:", error);
          setState({
            user: session.user,
            session,
            profile: null,
            loading: false,
          });
        }
      }
    );

    // Periodic last_seen update (every 60 seconds)
    const interval = setInterval(async () => {
      const user = useAuthStore.getState().user;
      if (user) {
        await supabase
          .from("profiles")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", user.id);
      }
    }, 60000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      data.subscription.unsubscribe();
    };
  }, [initialize, setState]);

  return <>{children}</>;
}