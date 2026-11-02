import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, schema, isDatabaseConnected } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Initial seed courses as defined in Figma and PRD
const initialCourses = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    slug: 'product-design-insight-to-impact',
    title: 'Product Design, from insight to impact',
    description: 'A comprehensive, hands-on journey through product design, research, interaction, and design systems.',
    instructor: 'Maya Chen',
    instructorTitle: 'Design Partner & Lead Researcher',
    thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=700&q=80',
    priceCents: 20000, // $200 USD
    currency: 'USD',
    level: 'Beginner to Intermediate',
    totalDuration: '6 hours · 12 lessons',
    rating: 4.9,
    reviewCount: 128,
    series: 'THE PRODUCT SERIES',
    tagline: 'Design with intent.',
    badge: 'Bestseller',
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    slug: 'systems-thinking-for-product-teams',
    title: 'Systems thinking for product teams',
    description: 'Learn to see second-order effects, build resilient feedback loops, and architect software and products that scale.',
    instructor: 'Jordan Lee',
    instructorTitle: 'Principal Systems Architect',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=700&q=80',
    priceCents: 20000,
    currency: 'USD',
    level: 'Intermediate to Advanced',
    totalDuration: '6 hours · 12 lessons',
    rating: 4.9,
    reviewCount: 128,
    series: 'THE STRATEGY SERIES',
    tagline: 'Think in systems.',
    badge: 'Highest Rated',
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    slug: 'build-a-brand-people-believe-in',
    title: 'Build a brand people believe in',
    description: 'Develop distinctive identities, articulate company narratives, and design visual languages with resonance.',
    instructor: 'Jordan Lee',
    instructorTitle: 'Creative Director & Founder',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=700&q=80',
    priceCents: 20000,
    currency: 'USD',
    level: 'All Levels',
    totalDuration: '6 hours · 12 lessons',
    rating: 4.9,
    reviewCount: 128,
    series: 'THE CREATIVE SERIES',
    tagline: 'Make it meaningful.',
    badge: 'Bestseller',
  },
];

// In-memory enrollments fallback
const mockEnrollments: Array<{ id: string; userId: string; courseId: string; status: 'active' | 'revoked'; enrolledDate: Date }> = [];

// 1. GET /api/courses (Public course list)
router.get('/', async (req: Request, res: Response) => {
  try {
    if (isDatabaseConnected && db) {
      const dbCourses = await db.select().from(schema.courses);
      if (dbCourses && dbCourses.length > 0) {
        return res.status(200).json({ success: true, courses: dbCourses });
      }
    }
    return res.status(200).json({ success: true, courses: initialCourses });
  } catch (error) {
    console.error('Fetch courses error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch courses.' });
  }
});

// 2. GET /api/courses/my-enrollments (Protected)
router.get('/my-enrollments', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let enrolledCourseIds: string[] = [];

    if (isDatabaseConnected && db) {
      const records = await db
        .select()
        .from(schema.enrollments)
        .where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.status, 'active')));
      enrolledCourseIds = records.map((r: any) => r.courseId);
    } else {
      enrolledCourseIds = mockEnrollments
        .filter((e) => e.userId === userId && e.status === 'active')
        .map((e) => e.courseId);
    }

    return res.status(200).json({
      success: true,
      enrolledCourseIds,
    });
  } catch (error) {
    console.error('Fetch enrollments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch enrollments.' });
  }
});

// 3. POST /api/courses/:id/enroll (Protected - Enforces FR-7: Email verification required before purchase)
router.post('/:id/enroll', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const courseId = req.params.id;

    // Check user's email verification status (FR-7)
    let emailVerified = req.user!.emailVerified;
    if (isDatabaseConnected && db) {
      const u = await db.select({ emailVerified: schema.users.emailVerified }).from(schema.users).where(eq(schema.users.id, userId));
      if (u && u[0]) emailVerified = u[0].emailVerified;
    }

    if (!emailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification is required before enrolling or purchasing courses. Please verify your email first.',
      });
    }

    if (isDatabaseConnected && db) {
      // Check existing
      const existing = await db
        .select()
        .from(schema.enrollments)
        .where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.courseId, courseId)));

      if (existing.length > 0) {
        return res.status(200).json({ success: true, message: 'Already enrolled in this course.' });
      }

      await db.insert(schema.enrollments).values({
        userId,
        courseId,
        status: 'active',
      });
    } else {
      const existing = mockEnrollments.find((e) => e.userId === userId && e.courseId === courseId);
      if (!existing) {
        mockEnrollments.push({
          id: 'enr-' + Date.now().toString(36),
          userId,
          courseId,
          status: 'active',
          enrolledDate: new Date(),
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Course unlocked! You now have full access to all lessons and internship resources.',
      courseId,
    });
  } catch (error) {
    console.error('Enroll error:', error);
    return res.status(500).json({ success: false, message: 'Enrollment failed.' });
  }
});

export default router;
