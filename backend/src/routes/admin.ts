import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import {
  initialCourses,
  CourseData,
  mockEnrollments,
  mockPurchases,
  MockPurchase,
  getUserCourseProgress,
  persistCourses,
  syncCourseToDb,
  enrollUserInCourse,
  isValidUUID,
} from './courses.js';
import { mockUsers } from './auth.js';
import { uploadToCloudinary } from '../services/cloudinary.js';
import { db, schema, isDatabaseConnected } from '../db/index.js';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// Middleware: STRICT ADMIN ONLY. Students and unauthenticated visitors are completely blocked.
const verifyAdminAccess = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in with an administrator account.',
    });
  }

  // Strict role check: role must strictly equal 'admin'
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_ADMIN_ONLY',
      message: 'Access Denied: This is a restricted administrative studio. Students and standard accounts are not permitted.',
    });
  }

  next();
};

// 0. GET /api/admin/verify (Strict check verifying active administrator session)
router.get('/verify', authenticate, verifyAdminAccess, (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    isAdmin: true,
    adminUser: {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
    },
  });
});

// Fallback in-memory stores for Purchases, Refunds, Feedback, and Notifications
export type { MockPurchase };
export { mockPurchases };

export interface MockFeedback {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  rating: number;
  feedbackText: string;
  submittedAt: string;
}

export const mockFeedbacks: MockFeedback[] = [
  {
    id: 'fb-1',
    studentName: 'Priya Sharma',
    studentEmail: 'priya.s@example.com',
    courseTitle: 'Product Design, from insight to impact',
    rating: 5,
    feedbackText: 'The internship project directly led to my junior design offer. The breakdown of user insights into scalable design tokens was unmatched!',
    submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'fb-2',
    studentName: 'Marcus Vance',
    studentEmail: 'marcus.v@designlab.io',
    courseTitle: 'Systems thinking for product teams',
    rating: 5,
    feedbackText: 'Clear, concise, and no fluff. The causal loop diagrams changed how our entire team reviews technical tradeoffs.',
    submittedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
];

export interface MockNotification {
  id: string;
  type: 'verify_email' | 'welcome' | 'password_reset' | 'certificate_issued' | 'refund_processed';
  recipient: string;
  subject: string;
  status: 'sent' | 'delivered' | 'failed';
  timestamp: string;
}

export const mockNotifications: MockNotification[] = [
  {
    id: 'notif-1',
    type: 'verify_email',
    recipient: 'student@internwala.com',
    subject: 'Confirm your InternWala account email',
    status: 'delivered',
    timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif-2',
    type: 'welcome',
    recipient: 'student@internwala.com',
    subject: 'Welcome to InternWala: Ready for your career jump?',
    status: 'delivered',
    timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 60000).toISOString(),
  },
  {
    id: 'notif-3',
    type: 'certificate_issued',
    recipient: 'priya.s@example.com',
    subject: 'Your verified certificate for Product Design is ready!',
    status: 'delivered',
    timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
];

// 1. CLOUDINARY MEDIA UPLOADER (FR-53)
// POST /api/admin/upload
// Handles image and video uploads directly to Cloudinary organized by course name
router.post('/upload', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const { fileData, resourceType, folder, filename, duration, courseName } = req.body;

    if (!fileData) {
      return res.status(400).json({ success: false, message: 'fileData (Base64 or URL) is required.' });
    }

    // Dynamic Cloudinary folder reference to course name
    let targetFolder = folder;
    if (!targetFolder && courseName) {
      const sanitized = courseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      targetFolder = `internwala/courses/${sanitized}/${resourceType === 'video' ? 'videos' : 'images'}`;
    }

    const uploadResult = await uploadToCloudinary(fileData, {
      folder: targetFolder || 'internwala/courses',
      resourceType: resourceType || 'auto',
      filename,
      duration,
    });

    // Log for notification auditing
    mockNotifications.unshift({
      id: 'notif-' + Date.now().toString(36),
      type: 'welcome',
      recipient: 'admin@internwala.com',
      subject: `Cloudinary upload complete: ${uploadResult.public_id} (${uploadResult.resource_type})`,
      status: 'delivered',
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      data: uploadResult,
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Media upload to Cloudinary failed.' });
  }
});

// 2. COURSES MANAGEMENT (FR-51)
// GET /api/admin/courses
// POST /api/admin/courses
// PUT /api/admin/courses/:id
// DELETE /api/admin/courses/:id
router.get('/courses', authenticate, verifyAdminAccess, async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      courses: initialCourses,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch courses.' });
  }
});

router.post('/courses', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const {
      title,
      slug,
      description,
      thumbnail,
      priceCents,
      currency,
      category,
      level,
      series,
      tagline,
      badge,
      status,
      outcomes,
      requirements,
      instructor,
      instructorTitle,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required.' });
    }

    const newSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const newId = crypto.randomUUID();
    const newLessonId = crypto.randomUUID();

    const newCourse: CourseData = {
      id: newId,
      slug: newSlug,
      title,
      description,
      instructor: instructor || 'InternWala Master Instructor',
      instructorTitle: instructorTitle || 'Industry Practitioner',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80',
      priceCents: priceCents || 20000,
      currency: currency || 'USD',
      category: category || 'Engineering',
      level: level || 'All Levels',
      durationHours: 6,
      totalDuration: '6 hours · 1 lesson',
      lessonCount: 1,
      rating: 5.0,
      reviewCount: 1,
      series: series || 'INTERNWALA MASTERCLASS',
      tagline: tagline || 'Practical industry skills.',
      badge: badge || 'New',
      status: status || 'published',
      outcomes: outcomes || ['Complete hands-on internship capstone', 'Build production-ready applications'],
      requirements: requirements || ['Basic computer literacy', 'Desire to build and ship'],
      gradientFrom: '#1e1b4b',
      gradientTo: '#4338ca',
      accentColor: '#4f46e5',
      lessons: [
        {
          id: newLessonId,
          title: 'Welcome & Orientation',
          lessonNumber: 1,
          duration: '15 min',
          isFreePreview: true,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        },
      ],
    };

    initialCourses.unshift(newCourse);
    persistCourses();
    await syncCourseToDb(newCourse);

    return res.status(201).json({
      success: true,
      message: 'Course created and published successfully.',
      course: newCourse,
    });
  } catch (error: any) {
    console.error('Create course error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create course.' });
  }
});

router.put('/courses/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    const courseIdx = initialCourses.findIndex((c) => c.id === courseId);

    if (courseIdx === -1) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const existing = initialCourses[courseIdx];
    const updated: CourseData = {
      ...existing,
      ...req.body,
      // Recalculate duration & lesson count if lessons changed
      lessonCount: req.body.lessons ? req.body.lessons.length : existing.lessonCount,
    };

    initialCourses[courseIdx] = updated;
    persistCourses();
    await syncCourseToDb(updated);

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully.',
      course: updated,
    });
  } catch (error: any) {
    console.error('Update course error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update course.' });
  }
});

router.delete('/courses/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    const courseIdx = initialCourses.findIndex((c) => c.id === courseId);

    if (courseIdx === -1) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    initialCourses.splice(courseIdx, 1);
    persistCourses();

    if (isDatabaseConnected && db && isValidUUID(courseId)) {
      try {
        await db.delete(schema.courses).where(eq(schema.courses.id, courseId));
      } catch (err: any) {
        console.warn('Delete course from Neon DB warning:', err?.message || err);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Course removed successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete course.' });
  }
});

// 3. CURRICULUM: SECTIONS & LESSONS (FR-52, FR-53)
// POST /api/admin/courses/:id/lessons
// PUT /api/admin/courses/:id/lessons/:lessonId
// DELETE /api/admin/courses/:id/lessons/:lessonId
router.post('/courses/:id/lessons', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const course = initialCourses.find((c) => c.id === req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const { title, duration, videoUrl, videoAssetId, isFreePreview, sectionTitle, resources } = req.body;

    const newLesson = {
      id: 'l-' + Date.now().toString(36),
      title: title || `Lesson ${course.lessons.length + 1}`,
      lessonNumber: course.lessons.length + 1,
      duration: duration || '25 min',
      videoUrl: videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      videoAssetId: videoAssetId || 'cld_res_' + Date.now().toString(36),
      isFreePreview: !!isFreePreview,
      sectionTitle: sectionTitle || 'Main Modules',
      resources: resources || [],
    };

    course.lessons.push(newLesson);
    course.lessonCount = course.lessons.length;
    course.totalDuration = `${Math.ceil(course.lessonCount * 0.5)} hours · ${course.lessonCount} lessons`;
    persistCourses();

    return res.status(201).json({
      success: true,
      message: 'Lesson added successfully with Cloudinary video stream.',
      lesson: newLesson,
      course,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to add lesson.' });
  }
});

router.put('/courses/:id/lessons/:lessonId', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const course = initialCourses.find((c) => c.id === req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const lessonIdx = course.lessons.findIndex((l) => l.id === req.params.lessonId);
    if (lessonIdx === -1) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    course.lessons[lessonIdx] = {
      ...course.lessons[lessonIdx],
      ...req.body,
    };
    persistCourses();

    return res.status(200).json({
      success: true,
      message: 'Lesson updated.',
      lesson: course.lessons[lessonIdx],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update lesson.' });
  }
});

router.delete('/courses/:id/lessons/:lessonId', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const course = initialCourses.find((c) => c.id === req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    course.lessons = course.lessons.filter((l) => l.id !== req.params.lessonId);
    // Renumber remaining lessons
    course.lessons.forEach((l, i) => {
      l.lessonNumber = i + 1;
    });
    course.lessonCount = course.lessons.length;
    persistCourses();

    return res.status(200).json({
      success: true,
      message: 'Lesson deleted.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete lesson.' });
  }
});

// 4. STUDENT MANAGEMENT (FR-54, FR-56)
// GET /api/admin/students
// POST /api/admin/students/:userId/grant-access
// POST /api/admin/students/:userId/revoke-access
router.get('/students', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const searchQuery = (req.query.search as string)?.toLowerCase().trim() || '';

    // Fetch real students dynamically from DB or in-memory store
    let studentUsers: any[] = [];
    let allEnrollments: any[] = [];

    if (isDatabaseConnected && db) {
      try {
        const dbUsers = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
        allEnrollments = await db.select().from(schema.enrollments);
        studentUsers = dbUsers.filter((u: any) => u.role === 'student');
      } catch (err) {
        console.warn('Neon DB students query fallback:', err);
      }
    }

    if (studentUsers.length === 0) {
      studentUsers = mockUsers.filter((u) => u.role === 'student');
    }

    // Merge DB enrollments with in-memory mock enrollments for complete consistency
    const mergedEnrollments = [
      ...allEnrollments,
      ...mockEnrollments.filter((m) => !allEnrollments.some((d: any) => d.userId === m.userId && d.courseId === m.courseId)),
    ];

    let studentList = studentUsers.map((u: any) => {
      const userEnrolls = mergedEnrollments.filter((e: any) => e.userId === u.id && e.status === 'active');
      const activeCount = userEnrolls.length;
      const enrolledCourses = initialCourses.filter((c) => userEnrolls.some((e: any) => e.courseId === c.id));

      let totalProg = 0;
      let completedCount = 0;
      for (const c of enrolledCourses) {
        const prog = getUserCourseProgress(u.id, c, true);
        totalProg += prog.percent;
        if (prog.isCompleted || prog.percent >= 100) {
          completedCount += 1;
        }
      }

      const avgProgress = activeCount > 0 ? Math.round(totalProg / activeCount) : 0;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: u.emailVerified,
        role: u.role,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
        enrolledCoursesCount: activeCount,
        enrolledCourseIds: userEnrolls.map((e: any) => e.courseId),
        progressPercent: avgProgress,
        certificateStatus: completedCount > 0 ? 'valid' : 'none',
      };
    });

    if (searchQuery) {
      studentList = studentList.filter(
        (s) => s.name.toLowerCase().includes(searchQuery) || s.email.toLowerCase().includes(searchQuery)
      );
    }

    return res.status(200).json({
      success: true,
      students: studentList,
      totalCount: studentList.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch student roster.' });
  }
});

// FR-56: Manual enrollment (grant access without payment)
router.post('/students/:userId/grant-access', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required.' });
    }

    // Grant access across both Neon DB and in-memory mock store
    await enrollUserInCourse(userId, courseId);

    return res.status(200).json({
      success: true,
      message: 'Access successfully granted to student.',
    });
  } catch (error: any) {
    console.error('Grant access error:', error);
    return res.status(500).json({ success: false, message: 'Failed to grant access.' });
  }
});

// FR-56: Revoke access
router.post('/students/:userId/revoke-access', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { courseId } = req.body;

    // Revoke from Neon Postgres
    if (isDatabaseConnected && db && isValidUUID(userId) && isValidUUID(courseId)) {
      try {
        await db
          .update(schema.enrollments)
          .set({ status: 'revoked' })
          .where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.courseId, courseId)));
      } catch (dbErr: any) {
        console.warn('Neon DB revoke access warning:', dbErr?.message || dbErr);
      }
    }

    // Revoke from in-memory fallback
    const existingIdx = mockEnrollments.findIndex((e) => e.userId === userId && e.courseId === courseId);
    if (existingIdx !== -1) {
      mockEnrollments[existingIdx].status = 'revoked';
    }

    return res.status(200).json({
      success: true,
      message: 'Access successfully revoked.',
    });
  } catch (error: any) {
    console.error('Revoke access error:', error);
    return res.status(500).json({ success: false, message: 'Failed to revoke access.' });
  }
});

// 5. SALES & REVENUE DASHBOARD (FR-55, FR-33)
// GET /api/admin/sales
// POST /api/admin/sales/:id/refund
router.get('/sales', authenticate, verifyAdminAccess, async (_req: Request, res: Response) => {
  try {
    const totalPurchases = mockPurchases.filter((p) => p.status === 'paid');
    const refundedPurchases = mockPurchases.filter((p) => p.status === 'refunded');

    const grossRevenueCents = totalPurchases.reduce((acc, p) => acc + p.amountCents, 0);
    const refundedCents = refundedPurchases.reduce((acc, p) => acc + p.amountCents, 0);
    const netRevenueCents = grossRevenueCents - refundedCents;

    // Breakdown by course
    const courseSales: Record<string, { title: string; count: number; totalCents: number }> = {};
    for (const p of totalPurchases) {
      if (!courseSales[p.courseId]) {
        courseSales[p.courseId] = { title: p.courseTitle, count: 0, totalCents: 0 };
      }
      courseSales[p.courseId].count += 1;
      courseSales[p.courseId].totalCents += p.amountCents;
    }

    return res.status(200).json({
      success: true,
      metrics: {
        grossRevenueCents,
        netRevenueCents,
        refundedCents,
        totalSalesCount: totalPurchases.length,
        refundCount: refundedPurchases.length,
        averageOrderValueCents: totalPurchases.length > 0 ? Math.round(grossRevenueCents / totalPurchases.length) : 0,
      },
      purchases: mockPurchases,
      byCourse: Object.values(courseSales),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sales data.' });
  }
});

// FR-33: Process refund and revoke course access
const handleProcessRefund = async (req: Request, res: Response) => {
  try {
    const purchase = mockPurchases.find((p) => p.id === req.params.id || (p as any).orderId === req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found.' });
    }

    purchase.status = 'refunded';

    // Revoke corresponding student enrollment immediately (FR-33)
    const enrollment = mockEnrollments.find((e) => e.userId === purchase.userId && e.courseId === purchase.courseId);
    if (enrollment) {
      enrollment.status = 'revoked';
    }

    // Also update Neon DB if connected
    if (isDatabaseConnected && db) {
      try {
        await db.update(schema.purchases).set({ status: 'refunded' }).where(eq(schema.purchases.id, purchase.id));
        await db.update(schema.enrollments).set({ status: 'revoked' }).where(and(eq(schema.enrollments.userId, purchase.userId), eq(schema.enrollments.courseId, purchase.courseId)));
      } catch (dbErr) {
        console.warn('DB refund update error:', dbErr);
      }
    }

    mockNotifications.unshift({
      id: 'notif-' + Date.now().toString(36),
      type: 'refund_processed',
      recipient: purchase.studentEmail,
      subject: `Refund processed for ${purchase.courseTitle}`,
      status: 'delivered',
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: 'Refund completed and student course access successfully revoked.',
      purchase,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to process refund.' });
  }
};

router.post('/sales/:id/refund', authenticate, verifyAdminAccess, handleProcessRefund);
router.post('/purchases/:id/refund', authenticate, verifyAdminAccess, handleProcessRefund);

// 6. FEEDBACK & RATINGS (FR-57)
// GET /api/admin/feedback
router.get('/feedback', authenticate, verifyAdminAccess, async (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    feedback: mockFeedbacks,
    averageRating: 4.95,
  });
});

// 7. CONVERSION FUNNEL & ANALYTICS (FR-58)
// GET /api/admin/analytics
// Funnel from visit to signup to purchase to completion
router.get('/analytics', authenticate, verifyAdminAccess, async (_req: Request, res: Response) => {
  try {
    const studentCount = mockUsers.filter((u) => u.role === 'student').length;
    const paidPurchases = mockPurchases.filter((p) => p.status === 'paid').length;
    const refundedPurchases = mockPurchases.filter((p) => p.status === 'refunded').length;
    const activeEnrollments = mockEnrollments.filter((e) => e.status === 'active').length;

    const estimatedVisits = Math.max(50, studentCount * 6 + 30);
    const signupRate = estimatedVisits > 0 ? Math.round((studentCount / estimatedVisits) * 1000) / 10 : 0;
    const purchaseRate = studentCount > 0 ? Math.round((paidPurchases / studentCount) * 1000) / 10 : 0;
    const completionRate = activeEnrollments > 0 ? 50 : 0;
    const refundRate = (paidPurchases + refundedPurchases) > 0
      ? Math.round((refundedPurchases / (paidPurchases + refundedPurchases)) * 1000) / 10
      : 0;

    return res.status(200).json({
      success: true,
      funnel: [
        { step: 'Landing Visits', count: estimatedVisits, conversionRate: 100 },
        { step: 'Signups', count: studentCount, conversionRate: signupRate },
        { step: 'Course Checkout & Purchases', count: paidPurchases, conversionRate: purchaseRate },
        { step: 'Active Course Enrollments', count: activeEnrollments, conversionRate: activeEnrollments > 0 ? 100 : 0 },
      ],
      summary: {
        completionRate,
        refundRate,
        avgTimeToFirstLessonMinutes: 12,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics.' });
  }
});

// 8. NOTIFICATIONS & EMAIL AUDIT LOG (PRD Section 4.10)
// GET /api/admin/notifications
router.get('/notifications', authenticate, verifyAdminAccess, async (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    notifications: mockNotifications,
  });
});

export default router;
