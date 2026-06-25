import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/profiles/profile.types";
import { authService } from "@/services/auth/authService";
import { profileService } from "@/services/profiles/profileService";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      const session = await authService.getSession();

      if (!session?.user) {
        set({ session: null, user: null, profile: null, loading: false });
        return;
      }

      const profile = await profileService.getProfile(session.user.id);

      set({
        session,
        user: session.user,
        profile,
        loading: false,
      });
    } catch (error) {
      console.error("Auth initialization failed:", error);
      // Failsafe: Ensure loading is set to false even if the fetch fails
      set({ session: null, user: null, profile: null, loading: false });
    }
  },

  signIn: async (email, password) => {
    const { user, session } = await authService.signIn({
      email,
      password,
    });

    const profile = await profileService.getProfile(user.id);

    set({ user, session, profile });
  },

  signUp: async (email, password) => {
    const { user, session } = await authService.signUp({
      email,
      password,
    });

    if (!user) return;

    const profile = await profileService.getProfile(user.id);

    set({ user, session, profile });
  },

  signOut: async () => {
    await authService.signOut();
    set({ user: null, session: null, profile: null });
  },

  refreshProfile: async (userId) => {
    const profile = await profileService.getProfile(userId);
    set({ profile });
  },
}));
