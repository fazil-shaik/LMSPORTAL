import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, X, Sparkles, Check, Mail, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const {
    authModalOpen,
    authMode,
    closeAuthModal,
    setAuthMode,
    signIn,
    signUp,
    googleSignIn,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    verificationTokenPrompt,
    resetTokenPrompt,
  } = useAuth();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyTokenInput, setVerifyTokenInput] = useState('');
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [terms, setTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Status & Error states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (verificationTokenPrompt) {
      setVerifyTokenInput(verificationTokenPrompt);
    }
    if (resetTokenPrompt) {
      setResetTokenInput(resetTokenPrompt);
    }
  }, [verificationTokenPrompt, resetTokenPrompt]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (authMode === 'signin') {
        const result = await signIn(email, password, rememberMe);
        if (!result.success) {
          setError(result.message || 'Invalid credentials');
        } else {
          closeAuthModal();
        }
      } else if (authMode === 'signup') {
        if (!terms) {
          setError('You must agree to the Terms of Service and Privacy Policy');
          setLoading(false);
          return;
        }
        const result = await signUp(name, email, password, terms);
        if (!result.success) {
          setError(result.message || 'Registration failed');
        } else {
          setSuccessMessage('Account created! Verification code ready.');
          if (result.verificationToken) {
            setVerifyTokenInput(result.verificationToken);
          }
        }
      } else if (authMode === 'forgot') {
        const result = await forgotPassword(email);
        if (result.success) {
          setSuccessMessage(result.message || 'Password reset link sent to your email.');
          if (result.resetToken) {
            setResetTokenInput(result.resetToken);
          }
        } else {
          setError(result.message || 'Failed to send reset link.');
        }
      } else if (authMode === 'reset') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        const result = await resetPassword(resetTokenInput, password);
        if (result.success) {
          setSuccessMessage('Password reset successfully! You can now sign in.');
          setTimeout(() => {
            setAuthMode('signin');
            setPassword('');
            setConfirmPassword('');
          }, 1500);
        } else {
          setError(result.message || 'Failed to reset password.');
        }
      } else if (authMode === 'verify') {
        const tokenToVerify = verifyTokenInput.trim();
        if (!tokenToVerify) {
          setError('Please provide a verification token.');
          setLoading(false);
          return;
        }
        const result = await verifyEmail(tokenToVerify);
        if (result.success) {
          setSuccessMessage('Email verified successfully! You now have full access to purchase courses.');
          setTimeout(() => {
            closeAuthModal();
          }, 1500);
        } else {
          setError(result.message || 'Verification token invalid or expired.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const result = await googleSignIn();
    setLoading(false);
    if (!result.success) {
      setError(result.message || 'Google sign in failed');
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    const result = await resendVerification();
    setLoading(false);
    if (result.success) {
      setSuccessMessage('Verification email resent! Check token below.');
      if (result.verificationToken) {
        setVerifyTokenInput(result.verificationToken);
      }
    } else {
      setError(result.message || 'Could not resend email.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={closeAuthModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-[20px] shadow-2xl max-w-[1040px] w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row relative my-auto"
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close dialog"
        >
          <X className="size-5" />
        </button>

        {/* =====================================================================
            LEFT COLUMN: LEARNING PROMISE (Exact Figma Design: 3:117366 / 3:117479)
           ===================================================================== */}
        <div className="bg-[#eef2ff] dark:bg-slate-950 p-8 sm:p-10 w-full md:w-[480px] shrink-0 flex flex-col justify-between gap-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
          <div className="flex flex-col gap-6 items-start">
            {/* Status badge */}
            <div className="bg-[#e0e7ff] dark:bg-indigo-950/80 border border-[#c7d2fe] dark:border-indigo-800/80 px-[10px] py-[5px] rounded-[100px] inline-flex items-center gap-1.5 shadow-sm">
              <Sparkles className="size-3 text-[#4f46e5] dark:text-[#a5b4fc]" />
              <span className="font-bold text-[#4f46e5] dark:text-[#a5b4fc] text-[12px] tracking-tight">
                A little curiosity. A lot of possibility.
              </span>
            </div>

            {/* Heading */}
            <h2 className="font-extrabold text-[#0f172a] dark:text-white text-[32px] sm:text-[38px] leading-[1.12] tracking-[-1.5px]">
              Your next chapter starts here.
            </h2>

            {/* Gradient course thumbnail card (Figma exact match) */}
            <div className="bg-gradient-to-r from-[#312e81] to-[#6d28d9] h-[210px] rounded-[12px] p-[20px] flex flex-col justify-between text-white relative overflow-hidden w-full shadow-md">
              <div className="absolute inset-0 bg-[#0f172a]/20 pointer-events-none" />

              <p className="font-bold text-[10px] tracking-[2px] text-white/90 uppercase z-10">
                THE INTERNWALA SERIES
              </p>

              <div className="flex items-end justify-between z-10">
                <div className="font-extrabold text-[26px] leading-[1.06] tracking-[-1px]">
                  <p>Build with</p>
                  <p>confidence.</p>
                </div>
                <div className="size-[42px] rounded-[10px] border border-white/40 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                  <Sparkles className="size-5 text-white" />
                </div>
              </div>
            </div>

            <p className="text-[#475569] dark:text-slate-300 text-[15px] leading-[1.5]">
              Industry-grade curriculums, guaranteed internship opportunities, and verified certificates.
            </p>
          </div>

          {/* Community proof */}
          <div className="flex items-center gap-3 pt-4 border-t border-indigo-100 dark:border-slate-800">
            <span className="text-[#b45309] dark:text-amber-500 text-[16px] tracking-[2px] font-bold select-none">
              ★★★★★
            </span>
            <span className="text-[#0f172a] dark:text-white font-semibold text-[13px]">
              4.9 from 2,400+ learners across India
            </span>
          </div>
        </div>

        {/* =====================================================================
            RIGHT COLUMN: AUTHENTICATION FORM (Figma Design: 3:117381 / 3:117494)
           ===================================================================== */}
        <div className="p-8 sm:p-10 flex-1 flex flex-col justify-center max-w-[460px] mx-auto w-full">
          {/* Header */}
          <div className="mb-6">
            <h3 className="font-extrabold text-[28px] sm:text-[32px] leading-[1.2] tracking-[-1px] text-[#0f172a] dark:text-white">
              {authMode === 'signin' && 'Welcome back, learner.'}
              {authMode === 'signup' && 'Make room for growth.'}
              {authMode === 'forgot' && 'Reset your password.'}
              {authMode === 'reset' && 'Create new password.'}
              {authMode === 'verify' && 'Verify your email.'}
            </h3>
            <p className="text-[#475569] dark:text-slate-300 text-[14px] leading-[1.5] mt-1.5">
              {authMode === 'signin' && 'Pick up where you left off. Your courses are waiting.'}
              {authMode === 'signup' && 'Create your InternWala account to enroll and start learning.'}
              {authMode === 'forgot' && 'Enter your email address to receive password reset instructions.'}
              {authMode === 'reset' && 'Set a strong new password for your InternWala account.'}
              {authMode === 'verify' && 'Per PRD Section 4.2 (FR-7), email verification is required before purchasing courses.'}
            </p>
          </div>

          {/* Success or Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="size-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ==================== VERIFY EMAIL MODE (FR-7) ==================== */}
          {authMode === 'verify' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="size-14 rounded-full bg-indigo-50 dark:bg-indigo-950 text-[#4f46e5] mx-auto flex items-center justify-center">
                <Mail className="size-7" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                  Verification Token / Code
                </label>
                <input
                  type="text"
                  required
                  value={verifyTokenInput}
                  onChange={(e) => setVerifyTokenInput(e.target.value)}
                  placeholder="Paste token or click simulation below"
                  className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm py-3 rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                <span>Confirm & Verify Email</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="text-[#4f46e5] hover:underline font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="size-3" />
                  <span>Resend email link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Back to Sign in
                </button>
              </div>
            </form>
          )}

          {/* ==================== RESET PASSWORD MODE (FR-9) ==================== */}
          {authMode === 'reset' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={resetTokenInput}
                  onChange={(e) => setResetTokenInput(e.target.value)}
                  placeholder="Reset token from email"
                  className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters with a number"
                  className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm py-3 rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                <span>Reset Password & Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="text-xs text-slate-500 hover:text-slate-700 text-center"
              >
                Cancel and return to sign in
              </button>
            </form>
          )}

          {/* ==================== FORGOT PASSWORD MODE (FR-9) ==================== */}
          {authMode === 'forgot' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.morgan@gmail.com"
                  className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm py-3 rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                <span>Send Reset Link</span>
              </button>

              {resetTokenInput && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs flex flex-col gap-2">
                  <span className="font-semibold text-indigo-900">Simulation link available:</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('reset')}
                    className="bg-[#4f46e5] text-white py-1.5 px-3 rounded font-bold text-xs"
                  >
                    Click to Enter New Password Now →
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="text-xs text-slate-500 hover:text-slate-700 text-center"
              >
                Back to Sign in
              </button>
            </form>
          )}

          {/* ==================== SIGN IN & SIGN UP MODES ==================== */}
          {(authMode === 'signin' || authMode === 'signup') && (
            <>
              {/* Google Sign In button (FR-8, Figma 3:117387) */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="border border-[#e2e8f0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition rounded-[8px] h-[48px] w-full flex items-center justify-center gap-3 font-bold text-[14px] text-[#0f172a] dark:text-white shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Divider (Figma design 3:117390) */}
              <div className="flex items-center gap-4 my-5 w-full">
                <div className="bg-[#e2e8f0] dark:bg-slate-800 flex-1 h-px" />
                <span className="text-[12px] text-[#64748b] dark:text-slate-400 font-normal">
                  or with email
                </span>
                <div className="bg-[#e2e8f0] dark:bg-slate-800 flex-1 h-px" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Full Name (Sign Up only) */}
                {authMode === 'signup' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                    />
                  </div>
                )}

                {/* Email Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.morgan@gmail.com"
                    className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-[46px] w-full pl-3.5 pr-10 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {authMode === 'signup' && (
                    <p className="text-[12px] text-[#475569] dark:text-slate-400 mt-0.5">
                      At least 8 characters, including a number.
                    </p>
                  )}
                </div>

                {/* Preferences Row for Sign in (Remember Me & Forgot Password) */}
                {authMode === 'signin' && (
                  <div className="flex items-center justify-between text-[13px] pt-1">
                    <label className="flex items-center gap-2 text-[#0f172a] dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-[#e2e8f0] text-[#4f46e5] focus:ring-[#4f46e5]"
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[#4f46e5] dark:text-[#818cf8] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Terms consent for Sign up */}
                {authMode === 'signup' && (
                  <div className="flex items-start gap-2 pt-1 text-[13px] text-[#475569] dark:text-slate-300">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={terms}
                      onChange={(e) => setTerms(e.target.checked)}
                      className="mt-1 rounded border-[#e2e8f0] text-[#4f46e5] focus:ring-[#4f46e5]"
                    />
                    <label htmlFor="terms">
                      I agree to the{' '}
                      <span className="text-[#4f46e5] dark:text-[#818cf8] hover:underline font-medium cursor-pointer">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="text-[#4f46e5] dark:text-[#818cf8] hover:underline font-medium cursor-pointer">
                        Privacy Policy
                      </span>
                      .
                    </label>
                  </div>
                )}

                {/* Submit button (Figma design 3:117409) */}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-[14px] h-[48px] rounded-[8px] transition flex items-center justify-center gap-2 mt-2 shadow-sm disabled:opacity-50"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  <span>{authMode === 'signin' ? 'Sign in' : 'Create account'}</span>
                </button>
              </form>

              {/* Bottom toggle between sign in and sign up */}
              <div className="mt-6 text-center text-[13px] text-[#475569] dark:text-slate-400">
                {authMode === 'signin' ? (
                  <p>
                    Don't have an account?{' '}
                    <button
                      onClick={() => {
                        setAuthMode('signup');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="font-bold text-[#4f46e5] dark:text-[#818cf8] hover:underline"
                    >
                      Sign up for free
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button
                      onClick={() => {
                        setAuthMode('signin');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="font-bold text-[#4f46e5] dark:text-[#818cf8] hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
