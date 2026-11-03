import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  emailVerified: boolean;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface AuthContextType {
  // 1. Student Session
  user: User | null;
  loading: boolean;
  studentToken: string | null;
  signIn: (email: string, password: string, rememberMe?: boolean, adminSecretKey?: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (name: string, email: string, password: string, terms: boolean) => Promise<{ success: boolean; message?: string }>;
  googleSignIn: (profileData?: { email?: string; name?: string; avatarUrl?: string }) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;

  // 2. Administrator Session (Completely Isolated & Secured)
  adminUser: User | null;
  adminLoading: boolean;
  adminToken: string | null;
  isAdminAuthenticated: boolean;
  adminSignIn: (email: string, password: string, adminSecretKey?: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  adminSignOut: () => Promise<void>;
  checkAdminAuth: () => Promise<boolean>;

  // 3. Modals & UI Controls
  authModalOpen: boolean;
  authMode: 'signin' | 'signup' | 'forgot' | 'reset' | 'verify';
  settingsModalOpen: boolean;
  settingsActiveTab: 'profile' | 'security' | 'billing' | 'privacy';
  verificationTokenPrompt: string | null;
  resetTokenPrompt: string | null;
  openAuthModal: (mode?: 'signin' | 'signup' | 'forgot' | 'reset' | 'verify', token?: string) => void;
  closeAuthModal: () => void;
  setAuthMode: (mode: 'signin' | 'signup' | 'forgot' | 'reset' | 'verify') => void;
  openSettingsModal: (tab?: 'profile' | 'security' | 'billing' | 'privacy') => void;
  closeSettingsModal: () => void;
  setSettingsActiveTab: (tab: 'profile' | 'security' | 'billing' | 'privacy') => void;

  // 4. Student Account & Progress Actions
  verifyEmail: (token: string, targetEmail?: string) => Promise<{ success: boolean; message?: string }>;
  resendVerification: (targetEmail?: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (name: string, avatarUrl?: string | null) => Promise<{ success: boolean; message?: string; profile?: any }>;
  exportUserData: () => Promise<void>;
  deleteAccount: (password: string) => Promise<{ success: boolean; message?: string }>;
  enrolledCourses: string[];
  refreshEnrollments: () => Promise<void>;
  enrollInCourse: (courseId: string) => Promise<{ success: boolean; message?: string; code?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Student Session State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [studentToken, setStudentToken] = useState<string | null>(() => {
    return localStorage.getItem('student_token') || localStorage.getItem('token');
  });

  // Dedicated Admin Session State (Completely Separate Storage & Lifecycle)
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminLoading, setAdminLoading] = useState<boolean>(true);
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token');
  });

  // Modals & UI State
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset' | 'verify'>('signin');
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'profile' | 'security' | 'billing' | 'privacy'>('profile');
  const [verificationTokenPrompt, setVerificationTokenPrompt] = useState<string | null>(null);
  const [resetTokenPrompt, setResetTokenPrompt] = useState<string | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);

  // 1. Check Student Session (Isolated from Admin)
  const checkAuth = async () => {
    try {
      setLoading(true);
      const activeToken = localStorage.getItem('student_token') || localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
        headers['X-Student-Token'] = activeToken;
      }

      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          setStudentToken(activeToken);
          fetchEnrollments(activeToken);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 2. Check Admin Session (Isolated from Student)
  const checkAdminAuth = async (): Promise<boolean> => {
    try {
      setAdminLoading(true);
      const activeAdminToken = localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (activeAdminToken) {
        headers['Authorization'] = `Bearer ${activeAdminToken}`;
        headers['X-Admin-Token'] = activeAdminToken;
      }

      const res = await fetch('/api/auth/admin/me', {
        credentials: 'include',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.adminUser) {
          setAdminUser(data.adminUser);
          setAdminToken(activeAdminToken);
          return true;
        }
      }
      setAdminUser(null);
      return false;
    } catch {
      setAdminUser(null);
      return false;
    } finally {
      setAdminLoading(false);
    }
  };

  // 3. Fetch Enrolled Courses for Authenticated Student
  const fetchEnrollments = async (authToken?: string | null) => {
    try {
      const tokenToUse = authToken || localStorage.getItem('student_token') || localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (tokenToUse) {
        headers['Authorization'] = `Bearer ${tokenToUse}`;
        headers['X-Student-Token'] = tokenToUse;
      }

      const res = await fetch('/api/courses/my-enrollments', {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.enrolledCourseIds) {
          setEnrolledCourses(data.enrolledCourseIds);
        }
      }
    } catch {
      // Quietly handle offline or unauthenticated enrollment check
    }
  };

  // Initialize both sessions on load concurrently without interfering
  useEffect(() => {
    checkAuth();
    checkAdminAuth();

    // Check URL parameters for password reset tokens
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('resetToken');

    if (resetToken) {
      setResetTokenPrompt(resetToken);
      openAuthModal('reset', resetToken);
    }

    const handleEnrollmentsChanged = () => {
      fetchEnrollments();
    };

    window.addEventListener('lms:enrollments-changed', handleEnrollmentsChanged);
    window.addEventListener('focus', handleEnrollmentsChanged);

    return () => {
      window.removeEventListener('lms:enrollments-changed', handleEnrollmentsChanged);
      window.removeEventListener('focus', handleEnrollmentsChanged);
    };
  }, []);

  const openAuthModal = (
    mode: 'signin' | 'signup' | 'forgot' | 'reset' | 'verify' = 'signin',
    token?: string
  ) => {
    setAuthMode(mode);
    if (token) {
      if (mode === 'verify') setVerificationTokenPrompt(token);
      if (mode === 'reset') setResetTokenPrompt(token);
    }
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const openSettingsModal = (tab: 'profile' | 'security' | 'billing' | 'privacy' = 'profile') => {
    setSettingsActiveTab(tab);
    setSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    setSettingsModalOpen(false);
  };

  // FR-9: Student Sign In with email and password
  const signIn = async (email: string, password: string, rememberMe = false, adminSecretKey?: string) => {
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe, adminSecretKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        const token = data.studentToken || data.token;
        if (token) {
          localStorage.setItem('student_token', token);
          localStorage.setItem('token', token);
          setStudentToken(token);
        }
        closeAuthModal();
        fetchEnrollments(token);

        // Route to /dashboard on student login if not already on an admin route
        if (!window.location.pathname.startsWith('/admin') && window.location.pathname !== '/dashboard') {
          window.history.pushState({}, '', '/dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Invalid credentials' };
      }
    } catch {
      return { success: false, message: 'Could not connect to authentication server.' };
    }
  };

  // FR-7: Student Sign Up with email and password
  const signUp = async (name: string, email: string, password: string, terms: boolean) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, terms }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        const token = data.studentToken || data.token;
        if (token) {
          localStorage.setItem('student_token', token);
          localStorage.setItem('token', token);
          setStudentToken(token);
        }
        setVerificationTokenPrompt(null);
        setAuthMode('verify');
        return {
          success: true,
          message: data.message,
        };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch {
      return { success: false, message: 'Could not connect to authentication server.' };
    }
  };

  // FR-8: Social login with Google for Student
  const googleSignIn = async (profileData?: { email?: string; name?: string; avatarUrl?: string }) => {
    try {
      const payload = {
        email: profileData?.email || 'alex.morgan@internwala.com',
        name: profileData?.name || 'Alex Morgan',
        avatarUrl:
          profileData?.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
        googleId: 'google_oauth_' + Date.now(),
      };
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        const token = data.studentToken || data.token;
        if (token) {
          localStorage.setItem('student_token', token);
          localStorage.setItem('token', token);
          setStudentToken(token);
        }
        closeAuthModal();
        fetchEnrollments(token);
        if (!window.location.pathname.startsWith('/admin') && window.location.pathname !== '/dashboard') {
          window.history.pushState({}, '', '/dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Google sign in failed' };
      }
    } catch {
      return { success: false, message: 'Failed to connect for Google sign-in.' };
    }
  };

  // FR-9: Student Sign Out (Clears student session ONLY; admin session is unaffected)
  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on signout
    } finally {
      setUser(null);
      setStudentToken(null);
      localStorage.removeItem('student_token');
      localStorage.removeItem('token');
      setEnrolledCourses([]);
      closeSettingsModal();
      if (window.location.pathname === '/dashboard') {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  };

  // =========================================================================
  // DEDICATED ADMINISTRATOR AUTHENTICATION (Air-tight isolation)
  // =========================================================================

  const adminSignIn = async (
    email: string,
    password: string,
    adminSecretKey?: string,
    rememberMe = false
  ) => {
    try {
      const res = await fetch('/api/auth/admin/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, adminSecretKey, rememberMe }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.adminUser) {
        setAdminUser(data.adminUser);
        const token = data.adminToken;
        if (token) {
          localStorage.setItem('admin_token', token);
          setAdminToken(token);
        }
        return { success: true, message: data.message };
      } else {
        return {
          success: false,
          message: data.message || 'Administrative credentials verification failed.',
        };
      }
    } catch {
      return { success: false, message: 'Could not connect to administrator authentication service.' };
    }
  };

  const adminSignOut = async () => {
    try {
      const activeAdminToken = localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (activeAdminToken) headers['X-Admin-Token'] = activeAdminToken;

      await fetch('/api/auth/admin/signout', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch {
      // Ignore network errors on admin signout
    } finally {
      setAdminUser(null);
      setAdminToken(null);
      localStorage.removeItem('admin_token');
    }
  };

  // FR-7: Verify Email with 6-digit OTP
  const verifyEmail = async (token: string, targetEmail?: string) => {
    try {
      const emailToSend = targetEmail || user?.email;
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: token.trim(), email: emailToSend }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.user) {
          setUser(data.user);
        } else if (user) {
          setUser({ ...user, emailVerified: true });
        }
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Verification code invalid or expired' };
      }
    } catch {
      return { success: false, message: 'Verification request failed.' };
    }
  };

  // FR-7: Resend 6-digit verification OTP email
  const resendVerification = async (targetEmail?: string) => {
    try {
      const emailToSend = targetEmail || user?.email;
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailToSend }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerificationTokenPrompt(null);
        return {
          success: true,
          message: data.message,
        };
      } else {
        return { success: false, message: data.message || 'Could not resend email.' };
      }
    } catch {
      return { success: false, message: 'Request failed.' };
    }
  };

  // FR-9: Forgot password
  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetTokenPrompt(null);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to send reset link.' };
      }
    } catch {
      return { success: false, message: 'Request failed.' };
    }
  };

  // FR-9: Reset password
  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Reset failed.' };
      }
    } catch {
      return { success: false, message: 'Failed to reset password.' };
    }
  };

  // FR-10: Change password from Settings
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Password change failed.' };
      }
    } catch {
      return { success: false, message: 'Failed to change password.' };
    }
  };

  // FR-11: Update Profile (name on certificate, avatar)
  const updateProfile = async (name: string, avatarUrl?: string | null) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, avatarUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser((prev) => (prev ? { ...prev, name, avatarUrl: avatarUrl ?? prev.avatarUrl } : null));
        return { success: true, message: data.message, profile: data.profile };
      } else {
        return { success: false, message: data.message || 'Profile update failed.' };
      }
    } catch {
      return { success: false, message: 'Failed to update profile.' };
    }
  };

  // FR-13: Data export
  const exportUserData = async () => {
    try {
      const res = await fetch('/api/user/export-data', {
        credentials: 'include',
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `internwala-user-data-${user?.id || 'export'}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Could not export user data.');
      }
    } catch {
      alert('Network error while exporting user data.');
    }
  };

  // FR-13: Account deletion
  const deleteAccount = async (password: string) => {
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(null);
        setEnrolledCourses([]);
        closeSettingsModal();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Could not delete account.' };
      }
    } catch {
      return { success: false, message: 'Failed to delete account.' };
    }
  };

  // FR-7: Course enrollment (requires verified email)
  const enrollInCourse = async (courseId: string) => {
    if (!user) {
      openAuthModal('signin');
      return { success: false, message: 'Please sign in to enroll.' };
    }
    if (!user.emailVerified) {
      openAuthModal('verify');
      return {
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required before purchase. Please verify your email first.',
      };
    }
    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Student-Token'] = token;
      }

      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEnrolledCourses((prev) => Array.from(new Set([...prev, courseId])));
        window.dispatchEvent(new CustomEvent('lms:enrollments-changed'));
        return { success: true, message: data.message };
      } else {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          openAuthModal('verify');
        }
        return {
          success: false,
          code: data.code,
          message: data.message || 'Enrollment failed',
        };
      }
    } catch {
      return { success: false, message: 'Network error during enrollment.' };
    }
  };

  const isAdminAuthenticated = !!adminUser && adminUser.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        studentToken,
        adminUser,
        adminLoading,
        adminToken,
        isAdminAuthenticated,
        adminSignIn,
        adminSignOut,
        checkAdminAuth,
        authModalOpen,
        authMode,
        settingsModalOpen,
        settingsActiveTab,
        verificationTokenPrompt,
        resetTokenPrompt,
        openAuthModal,
        closeAuthModal,
        setAuthMode,
        openSettingsModal,
        closeSettingsModal,
        setSettingsActiveTab,
        signIn,
        signUp,
        googleSignIn,
        signOut,
        checkAuth,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        changePassword,
        updateProfile,
        exportUserData,
        deleteAccount,
        enrolledCourses,
        refreshEnrollments: () => fetchEnrollments(),
        enrollInCourse,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
