import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  X,
  CreditCard,
  Building2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CashfreeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    slug: string;
    priceCents: number;
    thumbnail?: string;
    instructor?: string;
  };
  initialCouponCode?: string;
  onPaymentSuccess: (orderId: string, courseSlug: string) => void;
}

export default function CashfreeCheckoutModal({
  isOpen,
  onClose,
  course,
  initialCouponCode = '',
  onPaymentSuccess,
}: CashfreeCheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState(initialCouponCode);
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountUSD: string;
    taxUSD: string;
    totalUSD: string;
    description?: string;
  } | null>(null);

  const [paymentSession, setPaymentSession] = useState<{
    orderId: string;
    paymentSessionId: string;
    orderAmount: number;
    environment: string;
  } | null>(null);

  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');
  const [upiId, setUpiId] = useState('learner@okhdfcbank');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Initialize or fetch pricing with coupon
  useEffect(() => {
    if (isOpen && course) {
      setError(null);
      setPaymentSession(null);
      if (initialCouponCode) {
        handleApplyCoupon(initialCouponCode);
      } else {
        createOrder();
      }
    }
  }, [isOpen, course]);

  const handleApplyCoupon = async (codeToApply: string) => {
    if (!codeToApply.trim()) return;
    setCouponLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/apply-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          couponCode: codeToApply.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedCoupon({
          code: data.pricing.couponCode,
          discountUSD: data.pricing.discountUSD,
          taxUSD: data.pricing.taxUSD,
          totalUSD: data.pricing.totalUSD,
          description: data.pricing.description,
        });
        // Re-create order with new amount
        createOrder(data.pricing.couponCode);
      } else {
        setError(data.message || 'Invalid coupon code. Try WELCOME20 or INTERN50.');
      }
    } catch {
      setError('Failed to apply coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const createOrder = async (coupon?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId: course.id,
          couponCode: coupon || couponCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentSession({
          orderId: data.orderId,
          paymentSessionId: data.paymentSessionId,
          orderAmount: data.orderAmount,
          environment: data.environment,
        });
        if (data.pricing?.couponCode) {
          setAppliedCoupon({
            code: data.pricing.couponCode,
            discountUSD: data.pricing.discountUSD,
            taxUSD: data.pricing.taxUSD,
            totalUSD: data.pricing.totalUSD,
          });
        }
      } else {
        if (data.code === 'ALREADY_ENROLLED') {
          setError(data.message);
        } else {
          setError(data.message || 'Could not initialize Cashfree checkout session.');
        }
      }
    } catch (err: any) {
      setError('Network error initializing payment gateway.');
    } finally {
      setLoading(false);
    }
  };

  // Safe payment execution (Cashfree sandbox/live or simulated callback)
  const handlePayNow = async () => {
    if (!paymentSession) return;
    setProcessingPayment(true);
    setError(null);

    try {
      // Execute payment callback simulation or Cashfree verification
      const res = await fetch('/api/payments/cashfree/simulate-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: paymentSession.orderId,
          paymentMethod: selectedMethod,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onPaymentSuccess(paymentSession.orderId, course.slug);
      } else {
        setError(data.message || 'Payment processing failed. Please try again.');
      }
    } catch (err: any) {
      setError('Payment verification error.');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (!isOpen) return null;

  const basePrice = (course.priceCents / 100).toFixed(2);
  const totalDisplay = appliedCoupon ? appliedCoupon.totalUSD : (Number(basePrice) * 1.18).toFixed(2);
  const taxDisplay = appliedCoupon ? appliedCoupon.taxUSD : (Number(basePrice) * 0.18).toFixed(2);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col relative my-auto"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center font-extrabold text-sm">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Cashfree Payments
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                  256-Bit SSL
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Secure Instant Checkout & Activation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
          {/* Course Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[#4f46e5] uppercase tracking-wider">
                Order Item
              </span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {course.title}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Lifetime access &bull; Verifiable Certificate included
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-slate-400 line-through mr-1.5">${basePrice}</span>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white">
                ${totalDisplay}
              </span>
            </div>
          </div>

          {/* Coupon Code Section (FR-31) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="size-3.5 text-[#4f46e5]" />
              <span>Apply Coupon or Voucher Code</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. WELCOME20, INTERN50"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 text-xs font-mono font-bold tracking-wider px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
              />
              <button
                type="button"
                onClick={() => handleApplyCoupon(couponCode)}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                {couponLoading ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {appliedCoupon && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg">
                <CheckCircle2 className="size-3.5" />
                <span>
                  Coupon <strong>{appliedCoupon.code}</strong> applied! You saved ${appliedCoupon.discountUSD}
                </span>
              </div>
            )}
          </div>

          {/* Transparent Price & Tax Breakdown (FR-32) */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>Course Base Tuition:</span>
              <span>${basePrice} USD</span>
            </div>
            {appliedCoupon && Number(appliedCoupon.discountUSD) > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Promotional Discount:</span>
                <span>-${appliedCoupon.discountUSD} USD</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-500">
              <span>Estimated Tax / GST (18% Digital Services):</span>
              <span>+${taxDisplay} USD</span>
            </div>
            <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Total Payable via Cashfree:</span>
              <span className="text-emerald-600 dark:text-emerald-400">${totalDisplay} USD</span>
            </div>
          </div>

          {/* Payment Method Selector (FR-25, FR-26) */}
          <div className="flex flex-col gap-2.5 pt-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Cashfree Payment Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedMethod === 'upi'
                    ? 'border-[#4f46e5] bg-indigo-50/70 dark:bg-indigo-950/70 text-[#4f46e5] dark:text-[#a5b4fc]'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sparkles className="size-4" />
                <span>Instant UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedMethod === 'card'
                    ? 'border-[#4f46e5] bg-indigo-50/70 dark:bg-indigo-950/70 text-[#4f46e5] dark:text-[#a5b4fc]'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                }`}
              >
                <CreditCard className="size-4" />
                <span>Card (Visa/MC)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('netbanking')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedMethod === 'netbanking'
                    ? 'border-[#4f46e5] bg-indigo-50/70 dark:bg-indigo-950/70 text-[#4f46e5] dark:text-[#a5b4fc]'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Building2 className="size-4" />
                <span>NetBanking</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('wallet')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedMethod === 'wallet'
                    ? 'border-[#4f46e5] bg-indigo-50/70 dark:bg-indigo-950/70 text-[#4f46e5] dark:text-[#a5b4fc]'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Wallet className="size-4" />
                <span>Wallets/PayPal</span>
              </button>
            </div>

            {selectedMethod === 'upi' && (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Virtual Payment Address (VPA / UPI ID)
                </span>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                  placeholder="e.g. mobile@upi or yourname@okaxis"
                />
                <span className="text-[10px] text-slate-400">
                  Supports Google Pay, PhonePe, Paytm, BHIM, and Cred UPI.
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Refund Notice (FR-24) */}
          <div className="bg-indigo-50/50 dark:bg-slate-950 border border-indigo-100 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <strong>30-Day Money-Back Guarantee:</strong> If this course is not a fit, email support within 30 days for a full refund processed back to your original payment method.
            </p>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayNow}
            disabled={loading || processingPayment || !paymentSession}
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-extrabold transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Lock className="size-4" />
            <span>
              {processingPayment
                ? 'Connecting to Cashfree Gateway...'
                : `Pay $${totalDisplay} USD with Cashfree`}
            </span>
            <ArrowRight className="size-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
