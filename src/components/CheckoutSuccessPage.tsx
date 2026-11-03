import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Mail,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CheckoutSuccessPageProps {
  onNavigate: (path: string) => void;
}

export default function CheckoutSuccessPage({ onNavigate }: CheckoutSuccessPageProps) {
  const { enrollInCourse } = useAuth();
  const [orderId, setOrderId] = useState<string>('');
  const [courseSlug, setCourseSlug] = useState<string>('');
  const [status, setStatus] = useState<'polling' | 'success' | 'failed' | 'timeout'>('polling');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('order_id') || params.get('orderId') || '';
    const slug = params.get('course_slug') || params.get('courseSlug') || '';
    setOrderId(oid);
    setCourseSlug(slug);

    if (!oid) {
      // Fallback: check if mock order exists in localStorage
      const cached = localStorage.getItem('last_cashfree_order');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setOrderId(parsed.orderId || '');
          setCourseSlug(parsed.courseSlug || '');
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!orderId) {
      if (pollCount > 3) setStatus('failed');
      return;
    }

    let timer: any;
    const verifyPurchase = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/payments/cashfree/verify-order/${encodeURIComponent(orderId)}`, {
          headers,
        });
        const data = await res.json();

        if (res.ok && data.success && data.order) {
          if (data.order.status === 'PAID') {
            setStatus('success');
            setOrderDetails(data.order);
            if (data.order.courseId) {
              enrollInCourse(data.order.courseId);
            }
            return;
          } else if (data.order.status === 'FAILED') {
            setStatus('failed');
            setOrderDetails(data.order);
            return;
          }
        }

        // Continue polling if pending
        if (pollCount < 10) {
          timer = setTimeout(() => {
            setPollCount((prev) => prev + 1);
          }, 1500);
        } else {
          setStatus('timeout');
        }
      } catch (err) {
        console.error('Verify poll error:', err);
        if (pollCount < 10) {
          timer = setTimeout(() => setPollCount((prev) => prev + 1), 2000);
        } else {
          setStatus('timeout');
        }
      }
    };

    verifyPurchase();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [orderId, pollCount]);

  return (
    <div className="flex-1 bg-white dark:bg-[#0a0d16] text-slate-800 dark:text-slate-100 flex items-center justify-center py-16 px-4">
      <div className="max-w-xl w-full border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-none text-center">
        {status === 'polling' && (
          <div className="flex flex-col items-center py-6">
            <div className="size-16 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-[#a435f0] mb-4">
              <Loader2 className="size-8 animate-spin" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
              Verifying Cashfree Payment
            </h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Please wait while we confirm your transaction securely via Cashfree webhook. Do not refresh.
            </p>
            <div className="mt-6 text-xs text-slate-400">
              Order ID: <span className="font-mono font-semibold">{orderId || 'CF_ORDER_PENDING'}</span>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-4">
            <div className="size-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 mb-5 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="size-10" />
            </div>

            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 rounded-full mb-3">
              Payment Confirmed (FR-27, FR-29)
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
              Welcome to the Course!
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
              Your Cashfree purchase was confirmed and your course has been permanently unlocked in your student dashboard.
            </p>

            {/* Receipt & Order summary box (FR-30) */}
            <div className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 text-left text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500">Course</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 capitalize truncate max-w-[220px]">
                  {orderDetails?.courseTitle || courseSlug.replace(/-/g, ' ') || 'Career Course'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{orderId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500">Payment Gateway</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Cashfree Payments</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ${((orderDetails?.orderAmount || 20000) / 100).toFixed(2)} USD
                </span>
              </div>
              <div className="flex items-center gap-2 pt-3 text-slate-500 text-xs">
                <Mail className="size-4 text-purple-500 shrink-0" />
                <span>Tax invoice and access receipt sent to your registered email (FR-30).</span>
              </div>
            </div>

            {/* Call to action */}
            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onNavigate('/dashboard')}
                className="flex-1 py-3.5 bg-[#a435f0] hover:bg-[#8710d8] text-white rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
              >
                <BookOpen className="size-4" />
                <span>Start Learning Now</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {(status === 'failed' || status === 'timeout') && (
          <div className="flex flex-col items-center py-4">
            <div className="size-16 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-400 flex items-center justify-center text-rose-500 mb-4">
              <AlertCircle className="size-8" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
              {status === 'timeout' ? 'Verification In Progress' : 'Payment Verification Unsuccessful'}
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
              {status === 'timeout'
                ? 'Your payment was submitted but confirmation from Cashfree is taking longer than usual. Please check your dashboard or email in a moment.'
                : 'The payment could not be confirmed. If funds were debited, they will be automatically refunded.'}
            </p>

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onNavigate('/dashboard')}
                className="flex-1 py-3 bg-[#2d2f31] dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm transition cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => onNavigate('/')}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-sm transition cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
