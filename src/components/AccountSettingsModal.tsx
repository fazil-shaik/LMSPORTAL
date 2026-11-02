import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Shield,
  KeyRound,
  Monitor,
  Download,
  Trash2,
  User as UserIcon,
  CreditCard,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccountSettingsModal() {
  const {
    user,
    settingsModalOpen,
    closeSettingsModal,
    settingsActiveTab,
    setSettingsActiveTab,
    updateProfile,
    changePassword,
    exportUserData,
    deleteAccount,
    openAuthModal,
  } = useAuth();

  // Profile tab states
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timeZone, setTimeZone] = useState('Pacific Time (UTC−07:00)');
  const [language, setLanguage] = useState('English (US)');

  // Preference switches
  const [learningReminders, setLearningReminders] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const [courseAnnouncements, setCourseAnnouncements] = useState(true);

  // Security tab states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete account confirmation
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // UI feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Populate data when modal opens or user changes
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setDisplayName(user.name ? user.name.split(' ')[0] : '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user, settingsModalOpen]);

  if (!settingsModalOpen || !user) return null;

  // Initials for avatar
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const result = await updateProfile(fullName, avatarUrl || null);
    setIsSaving(false);

    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Profile preferences saved successfully.' });
    } else {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to update profile.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      setStatusMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    setIsSaving(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsSaving(false);

    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage({ type: 'success', text: 'Password successfully updated.' });
    } else {
      setStatusMessage({ type: 'error', text: result.message || 'Could not change password.' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      setStatusMessage({ type: 'error', text: 'Please enter your password to confirm deletion.' });
      return;
    }

    setIsSaving(true);
    const result = await deleteAccount(deleteConfirmPassword);
    setIsSaving(false);

    if (result.success) {
      setShowDeleteModal(false);
      closeSettingsModal();
      alert('Your account and personal data have been permanently deleted.');
    } else {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to delete account.' });
    }
  };

  const handleAvatarUpload = () => {
    const newUrl = prompt('Enter image URL for avatar:', avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256');
    if (newUrl) {
      setAvatarUrl(newUrl);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={closeSettingsModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#f8fafc] dark:bg-slate-900 rounded-[20px] shadow-2xl max-w-[1020px] w-full overflow-hidden border border-[#e2e8f0] dark:border-slate-800 flex flex-col relative my-auto max-h-[90vh]"
      >
        {/* Top Header */}
        <div className="bg-white dark:bg-slate-950 border-b border-[#e2e8f0] dark:border-slate-800 px-6 sm:px-10 py-5 flex items-center justify-between shrink-0">
          <div>
            <p className="font-['Plus_Jakarta_Sans'] font-bold text-[#4f46e5] text-[12px] uppercase tracking-wider">
              YOUR ACCOUNT
            </p>
            <h2 className="font-['Plus_Jakarta_Sans'] font-extrabold text-[#0f172a] dark:text-white text-[24px] sm:text-[28px] tracking-tight">
              A space that feels like you.
            </h2>
            <p className="text-[#475569] dark:text-slate-400 text-[14px]">
              Manage your profile, security, and learning preferences.
            </p>
          </div>
          <button
            onClick={closeSettingsModal}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close settings"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Area with Sidebar & Main Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
          {/* Left Sidebar Navigation (Matching Figma Frame 3:119983) */}
          <div className="w-full md:w-[240px] p-6 flex flex-col gap-2 shrink-0 border-b md:border-b-0 md:border-r border-[#e2e8f0] dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-900/60">
            <button
              onClick={() => {
                setSettingsActiveTab('profile');
                setStatusMessage(null);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-left text-[14px] font-['Plus_Jakarta_Sans'] transition ${
                settingsActiveTab === 'profile'
                  ? 'bg-[#eef2ff] text-[#4f46e5] font-bold shadow-xs'
                  : 'text-[#475569] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <UserIcon className="size-4 shrink-0" />
              <span>Profile & preferences</span>
            </button>

            <button
              onClick={() => {
                setSettingsActiveTab('security');
                setStatusMessage(null);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-left text-[14px] font-['Plus_Jakarta_Sans'] transition ${
                settingsActiveTab === 'security'
                  ? 'bg-[#eef2ff] text-[#4f46e5] font-bold shadow-xs'
                  : 'text-[#475569] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <Shield className="size-4 shrink-0" />
              <span>Security</span>
            </button>

            <button
              onClick={() => {
                setSettingsActiveTab('billing');
                setStatusMessage(null);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-left text-[14px] font-['Plus_Jakarta_Sans'] transition ${
                settingsActiveTab === 'billing'
                  ? 'bg-[#eef2ff] text-[#4f46e5] font-bold shadow-xs'
                  : 'text-[#475569] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <CreditCard className="size-4 shrink-0" />
              <span>Billing & receipts</span>
            </button>

            <button
              onClick={() => {
                setSettingsActiveTab('privacy');
                setStatusMessage(null);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-left text-[14px] font-['Plus_Jakarta_Sans'] transition ${
                settingsActiveTab === 'privacy'
                  ? 'bg-[#eef2ff] text-[#4f46e5] font-bold shadow-xs'
                  : 'text-[#475569] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <AlertTriangle className="size-4 shrink-0" />
              <span>Privacy & Data</span>
            </button>
          </div>

          {/* Right Main Panel */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
            {/* Feedback Alert */}
            {statusMessage && (
              <div
                className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <Check className="size-5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="size-5 shrink-0 text-rose-600" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* TAB 1: PROFILE & PREFERENCES (FR-11) */}
            {settingsActiveTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] p-6 flex flex-col gap-5">
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-[#0f172a] dark:text-white text-[20px]">
                    Profile
                  </h3>

                  {/* Avatar row */}
                  <div className="flex items-center gap-5">
                    <div className="size-[64px] rounded-full bg-[#eef2ff] dark:bg-indigo-950 text-[#4f46e5] dark:text-[#a5b4fc] flex items-center justify-center font-bold text-[22px] overflow-hidden shrink-0 border border-[#c7d2fe] dark:border-indigo-800 shadow-sm">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 items-start">
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0f172a] dark:text-white font-bold text-[14px] px-4 py-2 rounded-[8px] transition"
                      >
                        Upload photo
                      </button>
                      <p className="text-[12px] text-[#64748b] dark:text-slate-400">
                        JPG or PNG · Max 5 MB
                      </p>
                    </div>
                  </div>

                  {/* Full Name & Display Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                        Full name <span className="text-[#4f46e5] text-xs font-normal">(printed on certificate)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                        Display name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Alex"
                        className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                      />
                    </div>
                  </div>

                  {/* Email address */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                      Email address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-slate-500 bg-slate-50 dark:bg-slate-800 cursor-not-allowed"
                    />
                  </div>

                  {/* Email Verification Status Badge (FR-7) */}
                  <div className="flex items-center gap-3">
                    {user.emailVerified ? (
                      <div className="bg-[#f0fdf4] dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-bold text-[#15803d] dark:text-emerald-400">
                        <Check className="size-3.5 text-[#15803d] dark:text-emerald-400" />
                        <span>Email verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="size-3.5" />
                          <span>Verification required before purchasing courses</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            closeSettingsModal();
                            openAuthModal('verify');
                          }}
                          className="text-xs font-bold text-[#4f46e5] hover:underline"
                        >
                          Verify now →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Time Zone & Language */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                        Time zone
                      </label>
                      <input
                        type="text"
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                        Language
                      </label>
                      <input
                        type="text"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="h-[46px] px-3.5 border border-[#e2e8f0] dark:border-slate-700 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                      />
                    </div>
                  </div>
                </div>

                {/* Learning Preferences Card (Figma Exact Match) */}
                <div className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] p-6 flex flex-col gap-4">
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-[#0f172a] dark:text-white text-[20px]">
                    Learning preferences
                  </h3>

                  {/* Reminder toggle */}
                  <div className="flex items-center justify-between py-2 border-b border-[#e2e8f0] dark:border-slate-800">
                    <div>
                      <p className="font-semibold text-[15px] text-[#0f172a] dark:text-white">
                        Learning reminders
                      </p>
                      <p className="text-[13px] text-[#475569] dark:text-slate-400">
                        A gentle nudge to keep your momentum.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLearningReminders(!learningReminders)}
                      className={`w-12 h-7 rounded-full p-1 transition-colors ${
                        learningReminders ? 'bg-[#4f46e5]' : 'bg-[#cbd5e1] dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`size-5 rounded-full bg-white transition-transform ${
                          learningReminders ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Product updates toggle */}
                  <div className="flex items-center justify-between py-2 border-b border-[#e2e8f0] dark:border-slate-800">
                    <div>
                      <p className="font-semibold text-[15px] text-[#0f172a] dark:text-white">
                        Product updates
                      </p>
                      <p className="text-[13px] text-[#475569] dark:text-slate-400">
                        News about new courses and platform improvements.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProductUpdates(!productUpdates)}
                      className={`w-12 h-7 rounded-full p-1 transition-colors ${
                        productUpdates ? 'bg-[#4f46e5]' : 'bg-[#cbd5e1] dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`size-5 rounded-full bg-white transition-transform ${
                          productUpdates ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Course announcements toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-semibold text-[15px] text-[#0f172a] dark:text-white">
                        Course announcements
                      </p>
                      <p className="text-[13px] text-[#475569] dark:text-slate-400">
                        Important updates from your instructor.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCourseAnnouncements(!courseAnnouncements)}
                      className={`w-12 h-7 rounded-full p-1 transition-colors ${
                        courseAnnouncements ? 'bg-[#4f46e5]' : 'bg-[#cbd5e1] dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`size-5 rounded-full bg-white transition-transform ${
                          courseAnnouncements ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-[#64748b] dark:text-slate-400">
                    Only you can see these details.
                  </p>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-[14px] px-6 py-3 rounded-[8px] transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="size-4 animate-spin" />}
                    <span>Save changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: SECURITY (FR-10, FR-12) */}
            {settingsActiveTab === 'security' && (
              <div className="flex flex-col gap-6">
                <form
                  onSubmit={handleChangePassword}
                  className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] p-6 flex flex-col gap-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-[#0f172a] dark:text-white text-[20px]">
                        Change Password
                      </h3>
                      <p className="text-sm text-[#475569] dark:text-slate-400">
                        Requires your current password to confirm your identity (FR-10).
                      </p>
                    </div>
                    <KeyRound className="size-6 text-[#4f46e5]" />
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-[13px] text-[#0f172a] dark:text-slate-200">
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
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
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="self-start bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-[14px] px-6 py-2.5 rounded-[8px] transition flex items-center gap-2 mt-2 disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="size-4 animate-spin" />}
                    <span>Update password</span>
                  </button>
                </form>

                {/* Session Security Card (FR-12 & Figma 3:120058) */}
                <div className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] p-6 flex flex-col gap-4">
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-[#0f172a] dark:text-white text-[18px]">
                    Active Session & Security
                  </h3>
                  <div className="flex items-start gap-3">
                    <Monitor className="size-5 text-[#4f46e5] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[14px] text-[#0f172a] dark:text-white">
                        Web Browser on macOS / Current Device
                      </p>
                      <p className="text-xs text-[#475569] dark:text-slate-400">
                        Session protected with HTTP-only secure cookie · Expiry: 7 days (or 30 days with Remember Me).
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Current session · Active now</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BILLING & RECEIPTS (Figma 3:120063) */}
            {settingsActiveTab === 'billing' && (
              <div className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] p-6 flex flex-col gap-5">
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-[#0f172a] dark:text-white text-[20px]">
                  Billing & receipts
                </h3>

                <div className="border border-[#e2e8f0] dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[15px] text-[#0f172a] dark:text-white">
                      Full-Stack Web Development Bootcamp
                    </p>
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      Order IW-2026-0842 · ₹499.00 INR / $200.00 USD · Paid via Razorpay / Stripe
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      alert('Receipt download generated for InternWala order IW-2026-0842.');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4f46e5] hover:underline shrink-0"
                  >
                    <span>Download receipt</span>
                    <ExternalLink className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: PRIVACY & DATA (FR-13) */}
            {settingsActiveTab === 'privacy' && (
              <div className="flex flex-col gap-6">
                {/* Export Data */}
                <div className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] p-6 flex flex-col gap-3">
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-[#0f172a] dark:text-white text-[18px]">
                    Export Account Data (GDPR Compliant)
                  </h3>
                  <p className="text-sm text-[#475569] dark:text-slate-400">
                    Download a comprehensive JSON archive of your personal account, course enrollments, progress, and certificate records.
                  </p>
                  <button
                    onClick={exportUserData}
                    className="self-start inline-flex items-center gap-2 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4f46e5] font-bold text-sm px-4 py-2.5 rounded-lg transition"
                  >
                    <Download className="size-4" />
                    <span>Export my data (JSON)</span>
                  </button>
                </div>

                {/* Delete Account */}
                <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-[12px] p-6 flex flex-col gap-3">
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-rose-700 dark:text-rose-400 text-[18px]">
                    Danger Zone: Delete Account
                  </h3>
                  <p className="text-sm text-[#475569] dark:text-slate-400">
                    Permanently delete your account, course access, certificates, and personal history. This action cannot be undone.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="self-start inline-flex items-center gap-2 text-[#b91c1c] hover:text-rose-700 font-bold text-sm py-2 hover:underline"
                  >
                    <Trash2 className="size-4" />
                    <span>Delete account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal Dialog */}
        {showDeleteModal && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-6 z-60">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full shadow-2xl border border-rose-200 dark:border-rose-900 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="size-6 shrink-0" />
                <h4 className="font-bold text-lg">Confirm Account Deletion</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Please enter your current password to confirm permanent account deletion. All progress and certificates will be irrevocably erased.
              </p>
              <input
                type="password"
                placeholder="Enter password"
                value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                className="h-[44px] px-3.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
              />
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {isSaving ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
