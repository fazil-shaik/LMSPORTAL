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

interface AuthContextType {
  user: User | null;
  loading: boolean;
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
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  signUp: (name: string, email: string, password: string, terms: boolean) => Promise<{ success: boolean; message?: string; verificationToken?: string }>;
  googleSignIn: (profileData?: { email?: string; name?: string; avatarUrl?: string }) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string }>;
  resendVerification: () => Promise<{ success: boolean; message?: string; verificationToken?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (name: string, avatarUrl?: string | null) => Promise<{ success: boolean; message?: string; profile?: any }>;
  exportUserData: () => Promise<void>;
  deleteAccount: (password: string) => Promise<{ success: boolean; message?: string }>;
  enrolledCourses: string[];
  enrollInCourse: (courseId: string) => Promise<{ success: boolean; message?: string; code?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'reset' | 'verify'>('signin');
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'profile' | 'security' | 'billing' | 'privacy'>('profile');
  const [verificationTokenPrompt, setVerificationTokenPrompt] = useState<string | null>(null);
  const [resetTokenPrompt, setResetTokenPrompt] = useState<string | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);

  // Check current session from backend on load
  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          fetchEnrollments();
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const res = await fetch('/api/courses/my-enrollments', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.enrolledCourseIds) {
          setEnrolledCourses(data.enrolledCourseIds);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch enrollments:', e);
    }
  };

  useEffect(() => {
    checkAuth();

    // Check URL parameters for email verification or password reset tokens
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verifyToken');
    const resetToken = params.get('resetToken');

    if (verifyToken) {
      setVerificationTokenPrompt(verifyToken);
      openAuthModal('verify', verifyToken);
    } else if (resetToken) {
      setResetTokenPrompt(resetToken);
      openAuthModal('reset', resetToken);
    }
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

  // FR-9: Sign In with email and password
  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        closeAuthModal();
        fetchEnrollments();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Invalid credentials' };
      }
    } catch (error: any) {
      return { success: false, message: 'Could not connect to authentication server.' };
    }
  };

  // FR-7: Sign Up with email and password
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
        if (data.verificationToken) {
          setVerificationTokenPrompt(data.verificationToken);
        }
        setAuthMode('verify');
        return {
          success: true,
          message: data.message,
          verificationToken: data.verificationToken,
        };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error: any) {
      return { success: false, message: 'Could not connect to authentication server.' };
    }
  };

  // FR-8: Social login with Google
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
        closeAuthModal();
        fetchEnrollments();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Google sign in failed' };
      }
    } catch (err) {
      return { success: false, message: 'Failed to connect for Google sign-in.' };
    }
  };

  // FR-7: Verify Email
  const verifyEmail = async (token: string) => {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
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
        return { success: false, message: data.message || 'Verification token invalid or expired' };
      }
    } catch (e) {
      return { success: false, message: 'Verification request failed.' };
    }
  };

  // FR-7: Resend verification email
  const resendVerification = async () => {
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: user?.email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.verificationToken) {
          setVerificationTokenPrompt(data.verificationToken);
        }
        return {
          success: true,
          message: data.message,
          verificationToken: data.verificationToken,
        };
      } else {
        return { success: false, message: data.message || 'Could not resend email.' };
      }
    } catch (e) {
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
        if (data.resetToken) {
          setResetTokenPrompt(data.resetToken);
        }
        return { success: true, message: data.message, resetToken: data.resetToken };
      } else {
        return { success: false, message: data.message || 'Failed to send reset link.' };
      }
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
      console.error('Export error:', e);
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
    } catch (e) {
      return { success: false, message: 'Failed to delete account.' };
    }
  };

  // FR-9: Sign Out
  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.warn('Sign out request failed:', e);
    } finally {
      setUser(null);
      setEnrolledCourses([]);
      closeSettingsModal();
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
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEnrolledCourses((prev) => [...prev, courseId]);
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
    } catch (e) {
      return { success: false, message: 'Network error during enrollment.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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
