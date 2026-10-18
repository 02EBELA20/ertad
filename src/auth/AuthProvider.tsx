import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  display_name: string;
  city: string;
  state: string;
};

type AuthState = {
  /** true until we know whether someone is signed in (and have their profile) */
  loading: boolean;
  /** true if the profile could not be loaded (network etc.) */
  profileError: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  /** returns an error message, or null on success */
  deleteAccount: () => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [profileError, setProfileError] = useState(false);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, city, state')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setProfileError(true);
    } else {
      setProfile((data as Profile | null) ?? null);
      setProfileError(false);
    }
    setProfileReady(true);
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileReady(false);
      setProfileError(false);
      return;
    }
    setProfileReady(false);
    void loadProfile(userId);
  }, [userId, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const deleteAccount = useCallback(async () => {
    // Remove the user's avatar files first (best effort), then the account itself.
    if (userId) {
      const files = await supabase.storage.from('avatars').list(userId);
      if (files.data && files.data.length > 0) {
        await supabase.storage.from('avatars').remove(files.data.map((f) => `${userId}/${f.name}`));
      }
    }
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return error.message;
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }, [userId]);

  const value = useMemo<AuthState>(
    () => ({
      loading: !sessionReady || (!!userId && !profileReady),
      profileError,
      session,
      profile,
      refreshProfile,
      signOut,
      deleteAccount,
    }),
    [sessionReady, userId, profileReady, profileError, session, profile, refreshProfile, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
