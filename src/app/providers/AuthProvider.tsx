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
    // Make sure your authStore.ts initialize() also has a try/catch!
    initialize();
    
    const { data } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
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
          // Attempt to fetch the profile
          const profile = await profileService.getProfile(session.user.id);

          setState({
            user: session.user,
            session,
            profile,
            loading: false,
          });
        } catch (error) {
          console.error("Error fetching profile during auth state change:", error);
          
          // Failsafe: Ensure loading is set to false even if the profile fetch fails!
          // We still set the user and session so they aren't completely locked out.
          setState({
            user: session.user,
            session,
            profile: null, 
            loading: false, 
          });
        }
      }
    );

    return () => {
      data.subscription.unsubscribe();
    };
  }, [initialize, setState]);

  return <>{children}</>;
}