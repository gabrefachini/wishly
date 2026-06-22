import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ensureProfile, getSession, onAuthStateChange, signOut } from "../services/auth";
import type { Session } from "@supabase/supabase-js";
import { AuthContext } from "./authContext";
import type { Profile } from "../types/domain";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(sessionValue: Session | null) {
    setSession(sessionValue);

    if (!sessionValue) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const nextProfile = await ensureProfile(sessionValue);
      setProfile(nextProfile);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("auth_profile_load_failed", error);
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((currentSession) => {
        if (mounted) {
          void load(currentSession);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const { data } = onAuthStateChange(async (_event, nextSession) => {
      setLoading(true);
      await load(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signOutUser() {
    await signOut();
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    const nextProfile = await ensureProfile(session);
    setProfile(nextProfile);
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signOutUser, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
