"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { upsertUserProfile } from '@/lib/supabaseService';
import type { User } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const isConfigured = !!SUPABASE_URL && !SUPABASE_URL.includes('placeholder');

// Helper to manage session cookies for middleware/proxy route protection
function setSessionCookies(token: string) {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `sb-access-token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `companio-session=active; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearSessionCookies() {
  if (typeof document === 'undefined') return;
  document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'companio-session=; path=/; max-age=0; SameSite=Lax';
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      // Supabase not configured — check localStorage for guest session
      try {
        const guestSession = localStorage.getItem('companio_guest_session');
        if (guestSession) {
          const parsed = JSON.parse(guestSession);
          setUser(parsed as unknown as User);
          setSessionCookies('guest-' + parsed.id);
        }
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }

    // Get initial user state & sync cookies
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        setUser(data.session.user);
        setSessionCookies(data.session.access_token);
      } else {
        setUser(null);
        clearSessionCookies();
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes & keep cookies in sync with middleware
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setUser(session.user);
        setSessionCookies(session.access_token);
      } else {
        setUser(null);
        clearSessionCookies();
      }
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isConfigured) {
      // Guest mode fallback
      const guestId = 'guest-' + Date.now();
      const guestUser = { id: guestId, email: 'guest@companio.local', user_metadata: { name: 'Guest' } };
      localStorage.setItem('companio_guest_session', JSON.stringify(guestUser));
      setSessionCookies('guest-' + guestId);
      setUser(guestUser as unknown as User);
      return { data: {}, error: null };
    }
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/home` : undefined,
      },
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!isConfigured) {
      const guestId = 'guest-' + Date.now();
      const guestUser = { id: guestId, email, user_metadata: { name: email.split('@')[0] } };
      localStorage.setItem('companio_guest_session', JSON.stringify(guestUser));
      setSessionCookies('guest-' + guestId);
      setUser(guestUser as unknown as User);
      return { data: { user: guestUser as unknown as User }, error: null };
    }

    let res = await supabase.auth.signInWithPassword({ email, password });

    // If Supabase blocked login due to unconfirmed email, auto-confirm immediately via backend Admin API and retry
    if (res.error && res.error.message && /not confirmed|confirm/i.test(res.error.message)) {
      try {
        const confirmRes = await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (confirmRes.ok) {
          // Retry sign-in with email now confirmed
          res = await supabase.auth.signInWithPassword({ email, password });
        }
      } catch (err) {
        console.warn('Auto-confirm attempt failed:', err);
      }
    }

    if (res.data.session?.access_token) {
      setSessionCookies(res.data.session.access_token);
      setUser(res.data.user);
    }
    return res;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    if (!isConfigured) {
      const guestId = 'guest-' + Date.now();
      const guestUser = { id: guestId, email, user_metadata: { name: name || email.split('@')[0] } };
      localStorage.setItem('companio_guest_session', JSON.stringify(guestUser));
      setSessionCookies('guest-' + guestId);
      setUser(guestUser as unknown as User);
      return { data: { user: guestUser as unknown as User }, error: null };
    }

    // Step 1: Pre-confirm creation via admin API to completely bypass email verification requirement
    try {
      const confirmRes = await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (confirmRes.ok) {
        const signInRes = await supabase.auth.signInWithPassword({ email, password });
        if (signInRes.data.session?.access_token) {
          setSessionCookies(signInRes.data.session.access_token);
          setUser(signInRes.data.user);
          if (signInRes.data.user?.id) {
            upsertUserProfile(signInRes.data.user.id, {
              name: name || email.split('@')[0] || 'Alex',
              preset: 'standard',
            }).catch(() => {});
          }
          return { data: { user: signInRes.data.user, session: signInRes.data.session }, error: null };
        }
      }
    } catch {
      // Fall through to standard sign-up
    }

    // Step 2: Standard sign up fallback
    const res = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || '' } },
    });

    if (res.error) {
      return res;
    }

    // Auto-confirm if returned user without session
    if (!res.data.session && res.data.user) {
      try {
        await fetch('/api/auth/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const signInRes = await supabase.auth.signInWithPassword({ email, password });
        if (signInRes.data.session?.access_token) {
          setSessionCookies(signInRes.data.session.access_token);
          setUser(signInRes.data.user);
          return { data: { user: signInRes.data.user, session: signInRes.data.session }, error: null };
        }
      } catch {}
    }

    if (res.data.session?.access_token) {
      setSessionCookies(res.data.session.access_token);
      setUser(res.data.user);
    } else if (res.data.user) {
      setSessionCookies('user-' + res.data.user.id);
      setUser(res.data.user);
    }

    if (res.data.user?.id) {
      upsertUserProfile(res.data.user.id, {
        name: name || email.split('@')[0] || 'Alex',
        preset: 'standard',
      }).catch(() => {});
    }

    return res;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isConfigured) {
      return { data: {}, error: null };
    }
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/sign-in` : undefined,
    });
  }, []);

  const signOut = useCallback(async () => {
    clearSessionCookies();
    if (!isConfigured) {
      localStorage.removeItem('companio_guest_session');
      setUser(null);
      return { error: null };
    }
    return supabase.auth.signOut();
  }, []);

  return { user, loading, isConfigured, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut };
}
