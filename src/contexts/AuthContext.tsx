import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  activationKey: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async (userId: string) => {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (isMounted && profileData) {
        setProfile(profileData);
      }

      // Fetch role using RPC (bypasses RLS for unconfirmed users)
      const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
        p_user_id: userId
      });
      
      if (isMounted && !roleError && roleData) {
        setRole(roleData);
      }
    };

    // Listener for ONGOING auth changes (does NOT control isLoading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fire and forget - don't await, don't set loading
          fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    );

    // INITIAL load - controls isLoading
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        // AWAIT role fetch BEFORE setting loading false
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map error codes to Arabic messages
      let message = error.message;
      if (error.message.includes('Invalid login credentials')) {
        message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'يرجى تأكيد البريد الإلكتروني أولاً';
      }
      return { error: new Error(message) };
    }

    return { error: null };
  };

  const signUp = async (data: SignUpData): Promise<{ error: Error | null }> => {
    try {
      // Step 1: Validate activation key
      const { data: isValid, error: validateError } = await supabase.rpc('validate_activation_key', {
        key_code: data.activationKey
      });

      if (validateError || !isValid) {
        return { error: new Error('مفتاح التفعيل غير صالح أو منتهي الصلاحية') };
      }

      // Step 2: Create user with metadata
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.fullName,
            phone: data.phone
          }
        }
      });

      if (authError) {
        let message = authError.message;
        if (authError.message.includes('already registered')) {
          message = 'هذا البريد الإلكتروني مسجل مسبقاً';
        } else if (authError.message.includes('weak password')) {
          message = 'كلمة المرور ضعيفة جداً';
        }
        return { error: new Error(message) };
      }

      if (!authData.user) {
        return { error: new Error('حدث خطأ أثناء إنشاء الحساب') };
      }

      // Step 3: Complete registration atomically (mark key used, assign role, create wallet)
      const { data: completed, error: regError } = await supabase.rpc('complete_user_registration', {
        p_user_id: authData.user.id,
        p_activation_key: data.activationKey
      });

      if (regError || !completed) {
        return { error: new Error('فشل إكمال التسجيل - يرجى المحاولة مرة أخرى') };
      }

      return { error: null };
    } catch (err) {
      return { error: new Error('حدث خطأ غير متوقع') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const hasRole = (checkRole: AppRole): boolean => {
    return role === checkRole;
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileData) {
      setProfile(profileData);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    isLoading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
    hasRole,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
