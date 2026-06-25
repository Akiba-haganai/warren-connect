import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/types/profiles/profile.types";

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}