import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/storageClient';
import type { Profile, Enrollment, AppRole } from '@/types/database';

export interface PendingJoinRequest {
  id: string;
  status: string;
  reference_number: string;
}
export interface UserSubjects {
  id: string;
  user_id: string;
  enrollment_id: string;
  subject_1: string;
  subject_2: string;
  subject_3: string;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  enrollment: Enrollment | null;
  userSubjects: UserSubjects | null;
  pendingJoinRequest: PendingJoinRequest | null;
  hasSelectedSubjects: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isCMO: boolean;
  isCreator: boolean;
  isHeadOps: boolean;
  signUp: (email: string, password: string, accessCode: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshEnrollment: () => Promise<void>;
  refreshUserSubjects: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [userSubjects, setUserSubjects] = useState<UserSubjects | null>(null);
  const [pendingJoinRequest, setPendingJoinRequest] = useState<PendingJoinRequest | null>(null);
  const [isHeadOps, setIsHeadOps] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  const isAdmin = roles.some((r) =>
    ['super_admin', 'content_admin', 'support_admin'].includes(r)
  );
  
  const isCMO = roles.includes('cmo');
  const isCreator = roles.includes('creator');

  // User has selected and locked subjects
  const hasSelectedSubjects = userSubjects?.is_locked ?? false;

  const fetchUserData = async (userId: string, opts?: { preserveExistingOnError?: boolean }) => {
    const preserve = opts?.preserveExistingOnError ?? false;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        if (!preserve) setProfile(null);
      } else {
        setProfile((profileData as Profile) ?? null);
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        if (!preserve) setRoles([]);
      } else {
        setRoles((rolesData ?? []).map((r) => r.role as AppRole));
      }

      // Check if user is Head of Ops (via cmo_profiles.is_head_ops flag)
      const { data: cmoProfile } = await supabase
        .from('cmo_profiles')
        .select('is_head_ops')
        .eq('user_id', userId)
        .maybeSingle();
      
      setIsHeadOps(cmoProfile?.is_head_ops === true);

      // Fetch active enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (enrollmentError) {
        console.error('Error fetching enrollment:', enrollmentError);
        if (!preserve) setEnrollment(null);
      } else {
        setEnrollment((enrollmentData as Enrollment) ?? null);
      }

      // Fetch user's subject selection (if they have an enrollment)
      if (enrollmentData) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('user_subjects')
          .select('*')
          .eq('user_id', userId)
          .eq('enrollment_id', enrollmentData.id)
          .maybeSingle();

        if (subjectsError) {
          console.error('Error fetching user subjects:', subjectsError);
          if (!preserve) setUserSubjects(null);
        } else {
          setUserSubjects((subjectsData as UserSubjects) ?? null);
        }
      } else {
        if (!preserve) setUserSubjects(null);
      }

      // Fetch pending join request (for bank transfer users)
      const { data: joinReqData, error: joinReqError } = await supabase
        .from('join_requests')
        .select('id, status, reference_number')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (joinReqError) {
        console.error('Error fetching join request:', joinReqError);
        if (!preserve) setPendingJoinRequest(null);
      } else {
        setPendingJoinRequest((joinReqData as PendingJoinRequest) ?? null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (!preserve) {
        setProfile(null);
        setRoles([]);
        setEnrollment(null);
        setUserSubjects(null);
        setPendingJoinRequest(null);
        setIsHeadOps(false);
      }
    }
  };

  useEffect(() => {
    const reconcileSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const stableSession = sessionData.session;

      if (!stableSession) return;

      setSession(stableSession);
      setUser(stableSession.user ?? null);

      const stableUserId = stableSession.user?.id ?? null;
      if (stableUserId && stableUserId !== lastUserIdRef.current) {
        lastUserIdRef.current = stableUserId;
        setIsLoading(true);
        fetchUserData(stableUserId).finally(() => setIsLoading(false));
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Mobile browsers can temporarily report a null session when switching to camera/file picker.
      // Only treat null session as a real sign-out when the event is SIGNED_OUT.
      if (!nextSession && event !== 'SIGNED_OUT' && event !== 'INITIAL_SESSION') {
        void reconcileSession();
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        lastUserIdRef.current = null;
        setProfile(null);
        setRoles([]);
        setEnrollment(null);
        setUserSubjects(null);
        setPendingJoinRequest(null);
        setIsHeadOps(false);
        setIsLoading(false);
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      const nextUserId = nextSession?.user?.id ?? null;
      const userChanged = nextUserId !== lastUserIdRef.current;
      lastUserIdRef.current = nextUserId;

      if (!nextUserId) {
        setProfile(null);
        setRoles([]);
        setEnrollment(null);
        setUserSubjects(null);
        setPendingJoinRequest(null);
        setIsHeadOps(false);
        setIsLoading(false);
        return;
      }

      // CRITICAL: avoid toggling route-level loading for same-user events (prevents remounts on mobile)
      if (userChanged) {
        setProfile(null);
        setRoles([]);
        setEnrollment(null);
        setUserSubjects(null);
        setPendingJoinRequest(null);
        setIsHeadOps(false);
        setIsLoading(true);
        fetchUserData(nextUserId).finally(() => setIsLoading(false));
      } else if (event === 'USER_UPDATED') {
        // Background refresh only (no route-blocking loading state)
        void fetchUserData(nextUserId, { preserveExistingOnError: true });
      }
    });

    setIsLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      lastUserIdRef.current = session?.user?.id ?? null;

      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    accessCode: string
  ): Promise<{ error: Error | null }> => {
    try {
      // Use secure RPC function for code validation
      const { data, error: rpcError } = await supabase.rpc('validate_access_code', {
        _code: accessCode.toUpperCase(),
      });

      if (rpcError) {
        return { error: new Error('Failed to validate access code') };
      }

      const codeData = data as {
        valid: boolean;
        error?: string;
        message?: string;
        code_id?: string;
        grade?: string;
        stream?: string;
        medium?: string;
        tier?: string;
        duration_days?: number;
      };

      if (!codeData.valid) {
        return { error: new Error(codeData.message || 'Invalid or expired access code') };
      }

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) {
        return { error: authError };
      }

      if (!authData.user) {
        return { error: new Error('Failed to create user') };
      }

      // Ensure a profile row exists (we keep profiles.id == auth user id across the app)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: authData.user.id,
            user_id: authData.user.id,
            email,
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      // Update access code - use code_id from validation response
      const { error: updateCodeError } = await supabase
        .from('access_codes')
        .update({
          status: 'used' as const,
          activated_by: authData.user.id,
          activated_at: new Date().toISOString(),
          bound_email: email,
          activations_used: 1,
        })
        .eq('id', codeData.code_id!);

      if (updateCodeError) {
        console.error('Error updating access code:', updateCodeError);
      }

      // Calculate expiry
      const expiresAt = codeData.duration_days && codeData.duration_days > 0
        ? new Date(Date.now() + codeData.duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create enrollment
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          user_id: authData.user.id,
          access_code_id: codeData.code_id!,
          grade: codeData.grade as any,
          stream: codeData.stream as any,
          medium: codeData.medium as any,
          tier: codeData.tier as any,
          expires_at: expiresAt,
          is_active: true,
        });

      if (enrollmentError) {
        console.error('Error creating enrollment:', enrollmentError);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    setEnrollment(null);
    setUserSubjects(null);
    setPendingJoinRequest(null);
    // Redirect to auth page after sign out
    window.location.href = '/auth';
  };

  const refreshEnrollment = async () => {
    if (!user) return;

    const { data: enrollmentData, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error refreshing enrollment:', error);
    }

    setEnrollment((enrollmentData as Enrollment) ?? null);
  };

  const refreshUserSubjects = async () => {
    if (!user || !enrollment) return;

    const { data: subjectsData, error } = await supabase
      .from('user_subjects')
      .select('*')
      .eq('user_id', user.id)
      .eq('enrollment_id', enrollment.id)
      .maybeSingle();

    if (error) {
      console.error('Error refreshing user subjects:', error);
    }

    setUserSubjects((subjectsData as UserSubjects) ?? null);
  };

  const refreshUserData = async () => {
    if (!user) return;
    await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        enrollment,
        userSubjects,
        pendingJoinRequest,
        hasSelectedSubjects,
        isLoading,
        isAdmin,
        isCMO,
        isCreator,
        isHeadOps,
        signUp,
        signIn,
        signOut,
        refreshEnrollment,
        refreshUserSubjects,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
