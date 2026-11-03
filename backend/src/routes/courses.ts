import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, schema, isDatabaseConnected } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

export interface CourseData {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructor: string;
  instructorTitle: string;
  thumbnail: string;
  priceCents: number;
  currency: string;
  category: string;
  level: string;
  durationHours: number;
  totalDuration: string;
  lessonCount: number;
  rating: number;
  reviewCount: number;
  series: string;
  tagline: string;
  badge?: string;
  status?: 'published' | 'draft';
  outcomes?: string[];
  requirements?: string[];
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  lessons: Array<{
    id: string;
    title: string;
    lessonNumber: number;
    duration: string;
    videoAssetId?: string;
    videoUrl?: string;
    isFreePreview?: boolean;
    sectionTitle?: string;
    resources?: Array<{ name: string; url: string; size?: string }>;
  }>;
}

// Initial seed courses as defined in Figma (Frames 3:117751, 3:118064) and PRD
export const initialCourses: CourseData[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    slug: 'product-design-insight-to-impact',
    title: 'Product Design, from insight to impact',
    description: 'A comprehensive, hands-on journey through product design, research, interaction, and design systems.',
    instructor: 'Maya Chen',
    instructorTitle: 'Design Partner & Lead Researcher',
    thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=700&q=80',
    priceCents: 20000, // $200 USD / ₹499 INR
    currency: 'USD',
    category: 'Product design',
    level: 'Beginner',
    durationHours: 6,
    totalDuration: '6 hours · 12 lessons',
    lessonCount: 12,
    rating: 4.9,
    reviewCount: 128,
    series: 'THE PRODUCT SERIES',
    tagline: 'Design with intent.',
    badge: 'Bestseller',
    gradientFrom: '#312e81',
    gradientTo: '#6d28d9',
    accentColor: '#4f46e5',
    lessons: [
      { id: 'l1', title: 'Research foundations & active listening', lessonNumber: 1, duration: '28 min' },
      { id: 'l2', title: 'Synthesizing qualitative customer interviews', lessonNumber: 2, duration: '32 min' },
      { id: 'l3', title: 'Framing opportunity problem statements', lessonNumber: 3, duration: '25 min' },
      { id: 'l4', title: 'Information architecture & wireframing', lessonNumber: 4, duration: '35 min' },
      { id: 'l5', title: 'Figma components & scalable design tokens', lessonNumber: 5, duration: '40 min' },
      { id: 'l6', title: 'Turning insights into opportunities', lessonNumber: 6, duration: '34 min' },
      { id: 'l7', title: 'Interactive prototyping & micro-interactions', lessonNumber: 7, duration: '30 min' },
      { id: 'l8', title: 'Usability testing & cognitive walkthroughs', lessonNumber: 8, duration: '26 min' },
      { id: 'l9', title: 'Design system governance & handoff', lessonNumber: 9, duration: '36 min' },
      { id: 'l10', title: 'Accessibility (WCAG 2.1 AA) in practice', lessonNumber: 10, duration: '29 min' },
      { id: 'l11', title: 'Building your portfolio case study', lessonNumber: 11, duration: '35 min' },
      { id: 'l12', title: 'Internship readiness & live capstone review', lessonNumber: 12, duration: '40 min' },
    ],
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
    category: 'Product strategy',
    level: 'Intermediate',
    durationHours: 6,
    totalDuration: '6 hours · 12 lessons',
    lessonCount: 12,
    rating: 4.9,
    reviewCount: 128,
    series: 'THE STRATEGY SERIES',
    tagline: 'Think in systems.',
    badge: 'Highest Rated',
    gradientFrom: '#0f766e',
    gradientTo: '#115e59',
    accentColor: '#0f766e',
    lessons: [
      { id: 'l2-1', title: 'Foundations of systems thinking', lessonNumber: 1, duration: '25 min' },
      { id: 'l2-2', title: 'Mapping causal loops and stock-flow diagrams', lessonNumber: 2, duration: '30 min' },
      { id: 'l2-3', title: 'Identifying leverage points in product ecosystems', lessonNumber: 3, duration: '35 min' },
      { id: 'l2-4', title: 'Managing technical and organizational debt', lessonNumber: 4, duration: '28 min' },
      { id: 'l2-5', title: 'Resilience engineering & fault-tolerant architectures', lessonNumber: 5, duration: '40 min' },
      { id: 'l2-6', title: 'Designing feedback loops for continuous learning', lessonNumber: 6, duration: '32 min' },
      { id: 'l2-7', title: 'System dynamics modeling with real-world cases', lessonNumber: 7, duration: '38 min' },
      { id: 'l2-8', title: 'Strategic roadmapping and trade-off analysis', lessonNumber: 8, duration: '27 min' },
      { id: 'l2-9', title: 'Scaling distributed teams and autonomous pods', lessonNumber: 9, duration: '33 min' },
      { id: 'l2-10', title: 'Platform thinking vs feature factories', lessonNumber: 10, duration: '31 min' },
      { id: 'l2-11', title: 'Measuring systemic health and vitality metrics', lessonNumber: 11, duration: '29 min' },
      { id: 'l2-12', title: 'Capstone strategy presentation & defense', lessonNumber: 12, duration: '45 min' },
    ],
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
    category: 'Brand design',
    level: 'All Levels',
    durationHours: 6,
    totalDuration: '6 hours · 12 lessons',
    lessonCount: 12,
    rating: 4.9,
    reviewCount: 128,
    series: 'THE CREATIVE SERIES',
    tagline: 'Make it meaningful.',
    badge: 'Bestseller',
    gradientFrom: '#7c2d12',
    gradientTo: '#b45309',
    accentColor: '#b45309',
    lessons: [
      { id: 'l3-1', title: 'The anatomy of enduring brands', lessonNumber: 1, duration: '24 min' },
      { id: 'l3-2', title: 'Defining brand purpose, vision, and core values', lessonNumber: 2, duration: '30 min' },
      { id: 'l3-3', title: 'Audience psychology & emotional connection', lessonNumber: 3, duration: '33 min' },
      { id: 'l3-4', title: 'Visual identity: typography, color, and form', lessonNumber: 4, duration: '38 min' },
      { id: 'l3-5', title: 'Brand voice, tone, and editorial guidelines', lessonNumber: 5, duration: '29 min' },
      { id: 'l3-6', title: 'Designing cohesive brand collateral & assets', lessonNumber: 6, duration: '35 min' },
      { id: 'l3-7', title: 'Storytelling across multi-channel customer journeys', lessonNumber: 7, duration: '32 min' },
      { id: 'l3-8', title: 'Brand guidelines & design system synchronization', lessonNumber: 8, duration: '40 min' },
      { id: 'l3-9', title: 'Executing memorable brand launch campaigns', lessonNumber: 9, duration: '28 min' },
      { id: 'l3-10', title: 'Brand equity monitoring & reputation management', lessonNumber: 10, duration: '26 min' },
      { id: 'l3-11', title: 'Rebranding strategies: evolution vs revolution', lessonNumber: 11, duration: '34 min' },
      { id: 'l3-12', title: 'Comprehensive brand book portfolio project', lessonNumber: 12, duration: '42 min' },
    ],
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    slug: 'full-stack-web-development-bootcamp',
    title: 'Full-Stack Web Development Bootcamp',
    description: 'Master modern React, Node.js, Express, PostgreSQL, Drizzle ORM, and cloud deployments from scratch to production.',
    instructor: 'Aman Sharma',
    instructorTitle: 'Principal Full-Stack Engineer',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=700&q=80',
    priceCents: 20000,
    currency: 'USD',
    category: 'Web development',
    level: 'Advanced',
    durationHours: 14,
    totalDuration: '14 hours · 24 lessons',
    lessonCount: 24,
    rating: 5.0,
    reviewCount: 210,
    series: 'THE ENGINEERING SERIES',
    tagline: 'Code with precision.',
    badge: 'Popular',
    gradientFrom: '#1e1b4b',
    gradientTo: '#4338ca',
    accentColor: '#4f46e5',
    lessons: [
      { id: 'l4-1', title: 'Modern JavaScript (ESNext) & TypeScript essentials', lessonNumber: 1, duration: '45 min' },
      { id: 'l4-2', title: 'React 19 architecture: Hooks, context, and state', lessonNumber: 2, duration: '50 min' },
      { id: 'l4-3', title: 'Node.js runtime, EventLoop, and Express REST APIs', lessonNumber: 3, duration: '48 min' },
      { id: 'l4-4', title: 'Relational data modeling with PostgreSQL & Drizzle', lessonNumber: 4, duration: '55 min' },
      { id: 'l4-5', title: 'JWT Authentication, secure cookies & rate limiting', lessonNumber: 5, duration: '40 min' },
    ],
  },
];

// Fallback in-memory enrollments and purchases storage
export const mockEnrollments: Array<{
  id: string;
  userId: string;
  courseId: string;
  status: 'active' | 'revoked';
  enrolledDate: Date;
}> = [];

export interface MockPurchase {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  amountCents: number;
  currency: string;
  provider: 'stripe' | 'paypal';
  status: 'paid' | 'refunded' | 'pending';
  createdAt: string;
}

export const mockPurchases: MockPurchase[] = [];

// In-memory course progress map: key: `${userId}:${courseId}`
export interface ProgressState {
  completedLessons: number;
  totalLessons: number;
  percent: number;
  isCompleted: boolean;
  lastOpenedLessonNumber: number;
  lastOpenedLessonTitle: string;
  totalTimeMinutes: number;
  updatedAt: Date;
}

export const mockProgressMap = new Map<string, ProgressState>();

// Helper to get or initialize progress dynamically for user + course
export function getUserCourseProgress(userId: string, course: CourseData, isEnrolled: boolean): ProgressState {
  const key = `${userId}:${course.id}`;
  if (mockProgressMap.has(key)) {
    return mockProgressMap.get(key)!;
  }

  const totalLessons = course.lessons?.length || course.lessonCount || 1;
  const defaultState: ProgressState = {
    completedLessons: 0,
    totalLessons,
    percent: 0,
    isCompleted: false,
    lastOpenedLessonNumber: 1,
    lastOpenedLessonTitle: course.lessons && course.lessons[0] ? course.lessons[0].title : 'Introduction',
    totalTimeMinutes: 0,
    updatedAt: new Date(),
  };

  if (isEnrolled) {
    mockProgressMap.set(key, defaultState);
  }
  return defaultState;
}

// 0. GET /api/courses/public (Open Catalog for Landing Page & Visitors)
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const published = initialCourses.filter((c) => c.status !== 'draft');
    return res.status(200).json({
      success: true,
      courses: published,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch public course catalog.' });
  }
});

// 1. GET /api/courses/dashboard (FR-14, FR-15, FR-16, FR-17, FR-18)
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const tab = (req.query.tab as string) || 'all'; // 'all' | 'my-courses' | 'completed' (FR-16)
    const searchQuery = (req.query.search as string)?.toLowerCase().trim() || ''; // (FR-17)
    const categoryFilter = (req.query.category as string) || ''; // (FR-17)
    const levelFilter = (req.query.level as string) || ''; // (FR-17)
    const durationFilter = (req.query.duration as string) || ''; // (FR-17)
    const sort = (req.query.sort as string) || 'newest';

    // 1. Determine enrolled course IDs for this user
    let enrolledCourseIds: string[] = [];
    if (isDatabaseConnected && db) {
      try {
        const records = await db
          .select()
          .from(schema.enrollments)
          .where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.status, 'active')));
        enrolledCourseIds = records.map((r: any) => r.courseId);
      } catch (dbErr: any) {
        console.warn('Neon enrollments query error, using fallback:', dbErr?.message || dbErr);
        enrolledCourseIds = mockEnrollments
          .filter((e) => e.userId === userId && e.status === 'active')
          .map((e) => e.courseId);
      }
    } else {
      enrolledCourseIds = mockEnrollments
        .filter((e) => e.userId === userId && e.status === 'active')
        .map((e) => e.courseId);
    }

    // 2. Map only published courses (or courses student already has active enrollment in)
    const availableCourses = initialCourses.filter((c) => c.status !== 'draft' || enrolledCourseIds.includes(c.id));

    let processedCourses = availableCourses.map((c) => {
      const isEnrolled = enrolledCourseIds.includes(c.id);
      const progress = getUserCourseProgress(userId, c, isEnrolled);

      return {
        ...c,
        isEnrolled, // FR-15: determines locked vs unlocked progress state
        progress: {
          completedLessons: progress.completedLessons,
          totalLessons: progress.totalLessons,
          percent: progress.percent,
          isCompleted: progress.isCompleted,
          lastOpenedLessonNumber: progress.lastOpenedLessonNumber,
          lastOpenedLessonTitle: progress.lastOpenedLessonTitle,
        },
      };
    });

    // 3. Compute Stats strictly based on actual enrollments
    const enrolledCoursesList = processedCourses.filter((c) => c.isEnrolled);
    const completedCoursesList = enrolledCoursesList.filter((c) => c.progress.isCompleted || c.progress.percent >= 100);
    const totalCompletedLessons = enrolledCoursesList.reduce((acc, cur) => acc + cur.progress.completedLessons, 0);
    const totalMinutesWatched = enrolledCoursesList.reduce((acc, cur) => {
      const prog = getUserCourseProgress(userId, cur, true);
      return acc + (prog.totalTimeMinutes || 0);
    }, 0);

    const hours = Math.floor(totalMinutesWatched / 60);
    const minutes = totalMinutesWatched % 60;
    const learningTimeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const stats = {
      enrolledCount: enrolledCoursesList.length,
      completedLessonsCount: totalCompletedLessons,
      learningTimeFormatted: learningTimeFormatted,
      certificatesCount: completedCoursesList.length,
    };

    // 4. Continue Learning Shortcut (FR-18)
    // Find the most recently active enrolled course that is in progress
    let continueLearning = null;
    if (enrolledCoursesList.length > 0) {
      // Pick first in-progress course, or first enrolled course
      const activeCourse = enrolledCoursesList.find((c) => !c.progress.isCompleted) || enrolledCoursesList[0];
      const prog = activeCourse.progress;
      const remainingMinutes = Math.max(0, (prog.totalLessons - prog.completedLessons) * 35);
      const remHours = Math.floor(remainingMinutes / 60);
      const remMins = remainingMinutes % 60;
      const remainingTimeFormatted = `${remHours}h ${remMins}m remaining`;

      continueLearning = {
        courseId: activeCourse.id,
        courseTitle: activeCourse.title,
        series: activeCourse.series,
        tagline: activeCourse.tagline,
        lessonNumber: prog.lastOpenedLessonNumber,
        lessonTitle: prog.lastOpenedLessonTitle,
        completedLessons: prog.completedLessons,
        totalLessons: prog.totalLessons,
        percent: prog.percent,
        remainingTime: remainingTimeFormatted,
        gradientFrom: activeCourse.gradientFrom,
        gradientTo: activeCourse.gradientTo,
        accentColor: activeCourse.accentColor,
      };
    }

    // 5. Apply Tab Filtering (FR-16: All Courses, My Courses, Completed)
    if (tab === 'my-courses') {
      processedCourses = processedCourses.filter((c) => c.isEnrolled);
    } else if (tab === 'completed') {
      processedCourses = processedCourses.filter((c) => c.isEnrolled && (c.progress.isCompleted || c.progress.percent >= 100));
    }

    // 6. Apply Search and Filters (FR-17)
    if (searchQuery) {
      processedCourses = processedCourses.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery) ||
          c.description.toLowerCase().includes(searchQuery) ||
          c.instructor.toLowerCase().includes(searchQuery) ||
          c.category.toLowerCase().includes(searchQuery) ||
          c.series.toLowerCase().includes(searchQuery)
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      processedCourses = processedCourses.filter((c) => c.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (levelFilter && levelFilter !== 'all') {
      processedCourses = processedCourses.filter((c) => c.level.toLowerCase().includes(levelFilter.toLowerCase()));
    }

    if (durationFilter && durationFilter !== 'all') {
      if (durationFilter === 'short') {
        processedCourses = processedCourses.filter((c) => c.durationHours <= 6);
      } else if (durationFilter === 'long') {
        processedCourses = processedCourses.filter((c) => c.durationHours > 6);
      }
    }

    // 7. Sort
    if (sort === 'rating') {
      processedCourses.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'lessons') {
      processedCourses.sort((a, b) => b.lessonCount - a.lessonCount);
    }

    return res.status(200).json({
      success: true,
      stats,
      continueLearning,
      courses: processedCourses,
      user: {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
        emailVerified: req.user!.emailVerified,
        avatarUrl: req.user!.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
});

// 2. POST /api/courses/:id/progress (Update lesson progress & Continue Learning shortcut)
router.post('/:id/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const courseId = req.params.id;
    const { lessonNumber, lessonTitle, markCompleted } = req.body;

    const course = initialCourses.find((c) => c.id === courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const key = `${userId}:${courseId}`;
    const current = getUserCourseProgress(userId, course, true);

    if (lessonNumber) {
      current.lastOpenedLessonNumber = lessonNumber;
    }
    if (lessonTitle) {
      current.lastOpenedLessonTitle = lessonTitle;
    }
    if (markCompleted) {
      current.completedLessons = Math.min(course.lessonCount, current.completedLessons + 1);
      current.percent = Math.round((current.completedLessons / course.lessonCount) * 100);
      if (current.completedLessons >= course.lessonCount) {
        current.isCompleted = true;
      }
      current.totalTimeMinutes += 30;
    }
    current.updatedAt = new Date();
    mockProgressMap.set(key, current);

    return res.status(200).json({
      success: true,
      message: 'Progress recorded.',
      progress: {
        completedLessons: current.completedLessons,
        totalLessons: current.totalLessons,
        percent: current.percent,
        isCompleted: current.isCompleted,
        lastOpenedLessonNumber: current.lastOpenedLessonNumber,
        lastOpenedLessonTitle: current.lastOpenedLessonTitle,
      },
    });
  } catch (error) {
    console.error('Update progress error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record progress.' });
  }
});

// 3. GET /api/courses (Public course list)
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

// 4. GET /api/courses/my-enrollments (Protected)
router.get('/my-enrollments', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let enrolledCourseIds: string[] = [];

    if (isDatabaseConnected && db) {
      try {
        const records = await db
          .select()
          .from(schema.enrollments)
          .where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.status, 'active')));
        enrolledCourseIds = records.map((r: any) => r.courseId);
      } catch (dbErr: any) {
        console.warn('Neon enrollments query error, using fallback:', dbErr?.message || dbErr);
        enrolledCourseIds = mockEnrollments
          .filter((e) => e.userId === userId && e.status === 'active')
          .map((e) => e.courseId);
      }
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

// 5. POST /api/courses/:id/enroll (Protected - Enforces FR-7)
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

    // Initialize course progress
    const course = initialCourses.find((c) => c.id === courseId);
    if (course) {
      getUserCourseProgress(userId, course, true);

      // Record purchase dynamically for Admin Studio sales & analytics
      const alreadyHasPurchase = mockPurchases.some((p) => p.userId === userId && p.courseId === courseId && p.status === 'paid');
      if (!alreadyHasPurchase) {
        mockPurchases.unshift({
          id: 'pur-' + Date.now().toString(36),
          userId,
          studentName: req.user!.name,
          studentEmail: req.user!.email,
          courseId: course.id,
          courseTitle: course.title,
          amountCents: course.priceCents,
          currency: course.currency || 'USD',
          provider: 'stripe',
          status: 'paid',
          createdAt: new Date().toISOString(),
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
