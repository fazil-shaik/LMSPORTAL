import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { db, schema, isDatabaseConnected } from '../db/index.js';
import { initialCourses, mockEnrollments, mockPurchases, getUserCourseProgress, enrollUserInCourse } from './courses.js';
import {
  createCashfreeOrder,
  verifyCashfreeOrder,
  verifyCashfreeWebhookSignature,
  mockCashfreeOrders,
} from '../services/cashfree.js';
import { sendPurchaseReceiptEmail } from '../services/email.js';

const router = Router();

// In-memory coupons table for promo codes (PRD Section 4.5 FR-31)
export interface Coupon {
  code: string;
  discountPercent: number;
  discountAmountCents: number;
  description: string;
  validUntil: string;
  active: boolean;
}

export const activeCoupons: Coupon[] = [
  {
    code: 'WELCOME20',
    discountPercent: 20,
    discountAmountCents: 0,
    description: '20% Off Welcome Discount',
    validUntil: '2026-12-31',
    active: true,
  },
  {
    code: 'INTERN50',
    discountPercent: 50,
    discountAmountCents: 0,
    description: '50% Off Early Career Pass',
    validUntil: '2026-12-31',
    active: true,
  },
  {
    code: 'SPECIAL100',
    discountPercent: 0,
    discountAmountCents: 10000, // $100 off
    description: '$100 Off Masterclass Voucher',
    validUntil: '2026-12-31',
    active: true,
  },
];

// Helper to calculate pricing with coupon and tax (PRD Section 4.5 FR-31, FR-32)
export function calculateOrderPricing(basePriceCents: number, couponCode?: string) {
  let discountCents = 0;
  let appliedCoupon: Coupon | null = null;

  if (couponCode) {
    const cleanCode = couponCode.trim().toUpperCase();
    const found = activeCoupons.find((c) => c.code === cleanCode && c.active);
    if (found) {
      appliedCoupon = found;
      if (found.discountPercent > 0) {
        discountCents = Math.round((basePriceCents * found.discountPercent) / 100);
      } else if (found.discountAmountCents > 0) {
        discountCents = Math.min(basePriceCents, found.discountAmountCents);
      }
    }
  }

  const subtotalCents = Math.max(0, basePriceCents - discountCents);
  // International digital service tax (FR-32: e.g. 18% GST or local sales tax)
  const taxCents = Math.round(subtotalCents * 0.18);
  const totalCents = subtotalCents + taxCents;

  return {
    basePriceCents,
    discountCents,
    subtotalCents,
    taxCents,
    totalCents,
    appliedCoupon,
  };
}

/**
 * 1. POST /api/payments/apply-coupon (PRD Section 4.5 FR-31, FR-32)
 * Validates promo coupon codes and computes live tax and pricing
 */
router.post('/apply-coupon', async (req: Request, res: Response) => {
  try {
    const { courseId, couponCode } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required.' });
    }

    const course = initialCourses.find((c) => c.id === courseId || c.slug === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const pricing = calculateOrderPricing(course.priceCents || 20000, couponCode);

    if (couponCode && !pricing.appliedCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired coupon code. Try WELCOME20 or INTERN50.',
      });
    }

    return res.status(200).json({
      success: true,
      pricing: {
        basePriceUSD: (pricing.basePriceCents / 100).toFixed(2),
        discountUSD: (pricing.discountCents / 100).toFixed(2),
        subtotalUSD: (pricing.subtotalCents / 100).toFixed(2),
        taxUSD: (pricing.taxCents / 100).toFixed(2),
        totalUSD: (pricing.totalCents / 100).toFixed(2),
        discountCents: pricing.discountCents,
        taxCents: pricing.taxCents,
        totalCents: pricing.totalCents,
        couponCode: pricing.appliedCoupon?.code,
        description: pricing.appliedCoupon?.description,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to apply coupon.' });
  }
});

/**
 * 2. POST /api/payments/cashfree/create-order (PRD Section 4.5 FR-25)
 * Creates a server-side Cashfree Checkout session per purchase with course & user metadata
 */
router.post('/cashfree/create-order', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { courseId, couponCode } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required.' });
    }

    const course = initialCourses.find((c) => c.id === courseId || c.slug === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Check if user is already enrolled
    const alreadyEnrolled = mockEnrollments.some((e) => e.userId === userId && e.courseId === course.id && e.status === 'active');
    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_ENROLLED',
        message: 'You are already enrolled in this course! Open your Student Dashboard to access it.',
      });
    }

    // Compute pricing and taxes (FR-31, FR-32)
    const pricing = calculateOrderPricing(course.priceCents || 20000, couponCode);
    const orderId = `iw_ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const orderAmount = Number((pricing.totalCents / 100).toFixed(2));

    // Call Cashfree PG Orders API (FR-25) with merchant account supported currency (defaults to INR)
    const cfCurrency = (process.env.CASHFREE_CURRENCY || 'INR').trim().toUpperCase();
    const cashfreeRes = await createCashfreeOrder({
      orderId,
      orderAmount,
      orderCurrency: cfCurrency,
      customerId: userId,
      customerEmail: req.user!.email,
      customerName: req.user!.name,
      customerPhone: '9876543210',
      courseId: course.id,
      userId,
    });

    if (!cashfreeRes.success) {
      return res.status(500).json({ success: false, message: cashfreeRes.error || 'Failed to initialize Cashfree checkout session.' });
    }

    // Record initial pending purchase in database (FR-25)
    const purchaseRecord = {
      id: 'pur_' + orderId,
      userId,
      studentName: req.user!.name,
      studentEmail: req.user!.email,
      courseId: course.id,
      courseTitle: course.title,
      amountCents: pricing.totalCents,
      currency: 'USD',
      provider: 'cashfree' as const,
      status: 'pending' as const,
      orderId,
      createdAt: new Date().toISOString(),
    };
    mockPurchases.unshift(purchaseRecord as any);

    return res.status(200).json({
      success: true,
      orderId,
      paymentSessionId: cashfreeRes.paymentSessionId,
      orderAmount,
      currency: 'USD',
      courseTitle: course.title,
      courseId: course.id,
      pricing: {
        basePriceUSD: (pricing.basePriceCents / 100).toFixed(2),
        discountUSD: (pricing.discountCents / 100).toFixed(2),
        taxUSD: (pricing.taxCents / 100).toFixed(2),
        totalUSD: orderAmount.toFixed(2),
        couponCode: pricing.appliedCoupon?.code,
      },
      environment: cashfreeRes.environment,
      mode: cashfreeRes.mode,
    });
  } catch (error: any) {
    console.error('Cashfree create-order error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating Cashfree checkout session.' });
  }
});

/**
 * 3. POST /api/payments/cashfree/webhook (PRD Section 4.5 FR-27, FR-28)
 * Idempotent Cashfree webhook listener that verifies signature and confirms purchase
 */
router.post('/cashfree/webhook', async (req: Request, res: Response) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = (req.headers['x-webhook-signature'] as string) || '';
    const timestamp = (req.headers['x-webhook-timestamp'] as string) || '';

    // Verify webhook signature (FR-27)
    const isValid = verifyCashfreeWebhookSignature(rawBody, signature, timestamp);
    if (!isValid && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, message: 'Invalid Cashfree webhook signature.' });
    }

    const event = req.body;
    const orderData = event.data?.order || event.order || {};
    const orderId = orderData.order_id || event.orderId;
    const eventType = event.type || event.event || 'PAYMENT_SUCCESS';

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Missing order_id in webhook.' });
    }

    // Idempotency check: Has this order already been confirmed? (FR-28)
    const existingPurchase = mockPurchases.find((p) => p.orderId === orderId);
    if (existingPurchase && existingPurchase.status === 'paid') {
      return res.status(200).json({ success: true, message: 'Order already processed idempotently.' });
    }

    // Confirm Payment & Unlock Course
    if (eventType === 'PAYMENT_SUCCESS' || eventType === 'ORDER_PAID' || orderData.order_status === 'PAID') {
      const mockOrder = mockCashfreeOrders.get(orderId);
      const courseId = mockOrder?.courseId || orderData.order_tags?.course_id || existingPurchase?.courseId;
      const userId = mockOrder?.userId || orderData.order_tags?.user_id || existingPurchase?.userId;

      if (existingPurchase) {
        existingPurchase.status = 'paid';
      }

      if (courseId && userId) {
        // Create active enrollment in Neon database & mock store (idempotent check)
        await enrollUserInCourse(userId, courseId, existingPurchase?.id);

        // Initialize course progress
        const course = initialCourses.find((c) => c.id === courseId);
        if (course) {
          getUserCourseProgress(userId, course, true);

          // Send welcome & tax receipt email (FR-30)
          const studentEmail = mockOrder?.customerEmail || existingPurchase?.studentEmail;
          const studentName = existingPurchase?.studentName || 'Student';
          if (studentEmail) {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            sendPurchaseReceiptEmail(studentEmail, studentName, {
              orderId,
              courseTitle: course.title,
              amountFormatted: `$${((existingPurchase?.amountCents || course.priceCents || 20000) / 100).toFixed(2)} USD`,
              courseUrl: `${clientUrl}/dashboard`,
            }).catch((e) => console.warn('Email receipt error:', e));
          }
        }
      }

      if (mockOrder) {
        mockOrder.orderStatus = 'PAID';
      }
    }

    return res.status(200).json({ success: true, message: 'Cashfree webhook verified and processed.' });
  } catch (error: any) {
    console.error('Cashfree webhook error:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing error.' });
  }
});

/**
 * 4. GET /api/payments/cashfree/verify-order/:orderId (PRD Section 4.5 FR-29)
 * Order status polling endpoint used by the Success Page to confirm enrollment
 */
router.get('/cashfree/verify-order/:orderId', authenticate, async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user!.id;

    // Verify order on Cashfree server (FR-27)
    const verification = await verifyCashfreeOrder(orderId);

    const purchase = mockPurchases.find((p) => p.orderId === orderId);
    const courseId = verification.courseId || purchase?.courseId;

    if (!courseId) {
      return res.status(404).json({ success: false, message: 'Order course reference not found.' });
    }

    const course = initialCourses.find((c) => c.id === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // If order is confirmed PAID, ensure enrollment exists (FR-28, FR-29)
    if (verification.orderStatus === 'PAID' || purchase?.status === 'paid') {
      if (purchase) purchase.status = 'paid';

      await enrollUserInCourse(userId, course.id, purchase?.id);

      // Initialize progress
      getUserCourseProgress(userId, course, true);

      return res.status(200).json({
        success: true,
        verified: true,
        orderStatus: 'PAID',
        orderId,
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
          thumbnail: course.thumbnail,
          instructor: course.instructor,
          lessonCount: course.lessonCount,
        },
      });
    }

    return res.status(200).json({
      success: true,
      verified: false,
      orderStatus: verification.orderStatus,
      orderId,
      message: 'Payment verification pending. Polling...',
    });
  } catch (error: any) {
    console.error('Verify order error:', error);
    return res.status(500).json({ success: false, message: 'Error verifying order status.' });
  }
});

/**
 * 5. POST /api/payments/cashfree/simulate-pay (Safe Sandbox Payment Simulation)
 * Allows testing the full Cashfree payment lifecycle without needing a live credit card
 */
router.post('/cashfree/simulate-pay', authenticate, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const userId = req.user!.id;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required.' });
    }

    const mockOrder = mockCashfreeOrders.get(orderId);
    const purchase = mockPurchases.find((p) => p.orderId === orderId);

    const courseId = mockOrder?.courseId || purchase?.courseId;
    if (!courseId) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const course = initialCourses.find((c) => c.id === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Mark paid
    if (mockOrder) mockOrder.orderStatus = 'PAID';
    if (purchase) purchase.status = 'paid';

    // Idempotent enrollment across Neon DB & mock store (FR-28)
    await enrollUserInCourse(userId, course.id, purchase?.id);

    getUserCourseProgress(userId, course, true);

    // Send receipt email (FR-30)
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    sendPurchaseReceiptEmail(req.user!.email, req.user!.name, {
      orderId,
      courseTitle: course.title,
      amountFormatted: `$${((purchase?.amountCents || course.priceCents || 20000) / 100).toFixed(2)} USD`,
      courseUrl: `${clientUrl}/dashboard`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      orderStatus: 'PAID',
      message: 'Payment simulation completed successfully! Course unlocked.',
      courseSlug: course.slug,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Simulation error.' });
  }
});

export default router;
