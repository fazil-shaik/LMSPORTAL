import { useState } from 'react';
import { ShieldAlert, Lock, ArrowLeft, KeyRound, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminPanel from './AdminPanel';

interface AdminGuardProps {
  onBackToApp: () => void;
  onCourseModified?: () => void;
}

export default function AdminGuard({ onBackToApp, onCourseModified }: AdminGuardProps) {
  const { user, signIn } = useAuth();

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STRICT CHECK: Is the user signed in AND strictly an admin?
  const isAuthorizedAdmin = user && user.role === 'admin';

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn(adminEmail, adminPassword, false, adminSecretKey.trim() || undefined);
      if (!result.success) {
        setLoginError(result.message || 'Administrative credentials verification failed.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Security verification error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillAdminCredentials = () => {
    setAdminEmail('admin@internwala.com');
    setAdminPassword('Password12345');
    setAdminSecretKey('internwala_admin_2026');
  };

  // If the user is authenticated and verified as admin, render Admin Studio directly!
  if (isAuthorizedAdmin) {
    return <AdminPanel onBackToApp={onBackToApp} onCourseModified={onCourseModified} />;
  }

  // Otherwise, render airtight 403 Forbidden Administrator Gate
  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-rose-600 selection:text-white">
      {/* Background ambient red/dark grid glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e1528_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -right-40 size-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 size-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 flex flex-col gap-6">
        {/* Top Back Action */}
        <button
          onClick={onBackToApp}
          className="self-start flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60"
        >
          <ArrowLeft className="size-3.5" />
          <span>Exit to Main Site</span>
        </button>

        {/* Security Shield Card */}
        <div className="bg-[#0f131f]/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 backdrop-blur-md">
          {/* Header Icon & Alert */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="size-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-inner">
              <ShieldAlert className="size-8 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 bg-rose-950/80 border border-rose-800/80 px-2.5 py-1 rounded-full text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-2">
                <AlertTriangle className="size-3 text-rose-400" />
                <span>Restricted Admin Zone</span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                Administrator Authentication
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                This endpoint contains protected internal curriculum management, financial records, and student PII.
                Strictly authorized administrators only.
              </p>
            </div>
          </div>

          {loginError && (
            <div className="bg-rose-950/70 border border-rose-800 text-rose-200 text-xs px-4 py-3 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Admin Credentials Form */}
          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@internwala.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-rose-500 focus:outline-none text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Admin Security Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-rose-500 focus:outline-none text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>Admin Secret Key (Optional 2FA)</span>
                <span className="text-[10px] text-slate-500 font-normal">Vault passkey</span>
              </label>
              <div className="relative">
                <KeyRound className="size-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Enter vault secret"
                  value={adminSecretKey}
                  onChange={(e) => setAdminSecretKey(e.target.value)}
                  className="w-full text-xs font-mono pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-rose-500 focus:outline-none text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Testing credentials?</span>
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
              >
                Auto-fill Admin Credentials
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-rose-950/50 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="size-3.5" />
              <span>{isSubmitting ? 'Verifying Credentials...' : 'Authenticate & Enter Studio'}</span>
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center flex flex-col gap-1">
            <span className="font-semibold text-slate-400">Strict Enforcement Policy</span>
            <span>All administrative requests are authenticated, IP monitored, and cryptographically verified.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
