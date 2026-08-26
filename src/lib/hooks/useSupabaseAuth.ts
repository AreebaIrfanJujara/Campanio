"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const isConfigured = !!SUPABASE_URL && !SUPABASE_URL.includes('placeholder');

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      // Supabase not configured — check localStorage for guest session
      try {
        const guestSession = localStorage.getItem('companio_guest_session');
        if (guestSession) {
          setUser(JSON.parse(guestSession) as any);
        }
      } catch (e) { /* ignore */ }
      setLoading(false);
      return;
    }

    // Get initial user state
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!isConfigured) {
      // Guest mode fallback
      const guestUser = { id: 'guest-' + Date.now(), email: 'guest@companio.local', user_metadata: { name: 'Guest' } };
      localStorage.setItem('companio_guest_session', JSON.stringify(guestUser));
      setUser(guestUser as any);
      return { data: {}, error: null };
    }
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/home` : undefined,
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!isConfigured) {
      const guestUser = { id: 'guest-' + Date.now(), email, user_metadata: { name: email.split('@')[0] } };
      localStorage.setItem('companio_guest_session', JSON.stringify(guestUser));
      setUser(guestUser as any);
      return { data: { user: guestUser as any }, error: null };
    }
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    if (!isConfigured) {
      const guestUser = { id: 'guest-' + Date.now(), email, user_metadata: { name: name || email.split('@')[0] } };
      localStorage.setItem('companio_guest_session', JSON.stringify(guestUser));
      setUser(guestUser as any);
      return { data: { user: guestUser as any }, error: null };
    }
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || '' } },
    });
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      return { data: {}, error: null };
    }
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/sign-in` : undefined,
    });
  };

  const signOut = async () => {
    if (!isConfigured) {
      localStorage.removeItem('companio_guest_session');
      setUser(null);
      return { error: null };
    }
    return supabase.auth.signOut();
  };

  return { user, loading, isConfigured, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut };
}
