import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../types/domain";

export type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
