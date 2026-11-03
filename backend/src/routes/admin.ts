import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import {
  initialCourses,
  CourseData,
  ModuleData,
  LessonData,
  QuizData,
  QuizQuestionData,
  mockEnrollments,
  mockProgressMap,
  mockPurchases,
  MockPurchase,
  persistCourses,
  persistProgress,
  syncCourseToDb,
  isValidUUID,
} from './courses.js';
import { mockUsers } from './auth.js';
import {
  uploadToCloudinary,
  generateUploadSignature,
  getCloudinaryConfig,
} from '../services/cloudinary.js';
import { db, schema, isDatabaseConnected } from '../db/index.js';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// Middleware: STRICT ADMIN ONLY. Unauthenticated visitors or students are strictly blocked.
const verifyAdminAccess = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in with an administrator account.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_ADMIN_ONLY',
      message: 'Access Denied: This is a restricted administrative studio. Students are not permitted.',
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

// Helper to recalculate course totals (Section 3: never typed by hand)
function recalculateCourseDerivedFields(course: CourseData): void {
  let totalSec = 0;
  let totalLessons = 0;
  let activeMods = 0;

  for (const m of course.modules) {
    if (m.archived) continue;
    activeMods++;
    let modSec = 0;
    for (const l of m.lessons) {
      if (l.archived) continue;
      totalLessons++;
      modSec += l.durationSeconds || 900;
    }
    const quizSec = m.quiz ? (m.quiz.timeLimitMinutes > 0 ? m.quiz.timeLimitMinutes * 60 : 600) : 0;
    const bufSec = (m.timeline?.bufferMinutes || 0) * 60;
    if (m.timeline) {
      m.timeline.estimatedStudyTimeMinutes = Math.max(15, Math.round((modSec + quizSec + bufSec) / 60));
    }
    totalSec += modSec + quizSec;
  }

  course.moduleCount = activeMods;
  course.lessonCount = totalLessons;
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.round((totalSec % 3600) / 60);
  course.durationHours = Math.max(1, Math.round(totalSec / 3600));
  course.totalDuration = hours > 0 ? `${hours} hr ${minutes > 0 ? minutes + ' min' : ''} · ${totalLessons} lessons` : `${minutes} min · ${totalLessons} lessons`;
}

// -------------------------------------------------------------
// 1. CLOUDINARY UPLOAD FLOW (PDF Section 10.1 & 12.2)
// -------------------------------------------------------------

// POST /api/admin/media/signature: Returns signed Cloudinary upload request
router.post('/media/signature', authenticate, verifyAdminAccess, (req: Request, res: Response) => {
  try {
    const { folder, publicId, resourceType } = req.body;
    const signatureData = generateUploadSignature({
      folder: folder || 'lms/courses',
      publicId,
      resourceType: resourceType || 'auto',
    });
    return res.status(200).json({ success: true, ...signatureData });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to generate upload signature.' });
  }
});

// POST /api/admin/upload: Direct fallback Cloudinary upload handler
router.post('/upload', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const { fileData, resourceType, folder, filename, duration } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, message: 'fileData is required.' });
    }

    const uploadResult = await uploadToCloudinary(fileData, {
      folder: folder || 'lms/courses',
      resourceType: resourceType || 'auto',
      filename,
      duration,
    });

    return res.status(200).json({
      success: true,
      message: 'Media successfully uploaded to Cloudinary.',
      media: uploadResult,
    });
  } catch (err: any) {
    console.error('Admin upload error:', err);
    return res.status(500).json({ success: false, message: 'Upload failed.' });
  }
});

// GET /api/admin/media/assets: Browse Cloudinary assets used in courses (Section 8.1)
router.get('/media/assets', authenticate, verifyAdminAccess, (req: Request, res: Response) => {
  try {
    const assets: Array<{
      id: string;
      url: string;
      type: 'image' | 'video' | 'audio' | 'resource' | 'article';
      usedInCourse: string;
      usedInModule?: string;
      usedInLesson?: string;
    }> = [];

    for (const c of initialCourses) {
      if (c.thumbnail) {
        assets.push({ id: 'thumb-' + c.id, url: c.thumbnail, type: 'image', usedInCourse: c.title });
      }
      if (c.banner) {
        assets.push({ id: 'banner-' + c.id, url: c.banner, type: 'image', usedInCourse: c.title });
      }
      if (c.previewVideo) {
        assets.push({ id: 'preview-' + c.id, url: c.previewVideo, type: 'video', usedInCourse: c.title });
      }
      for (const m of c.modules) {
        for (const l of m.lessons) {
          if (l.videoUrl || l.mediaUrl) {
            assets.push({
              id: 'les-media-' + l.id,
              url: l.videoUrl || l.mediaUrl || '',
              type: l.type,
              usedInCourse: c.title,
              usedInModule: m.title,
              usedInLesson: l.title,
            });
          }
          if (l.resources) {
            for (const r of l.resources) {
              assets.push({
                id: 'res-' + l.id + '-' + r.name,
                url: r.url,
                type: 'resource',
                usedInCourse: c.title,
                usedInModule: m.title,
                usedInLesson: l.title + ` (${r.name})`,
              });
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true, assets });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load media assets.' });
  }
});

// -------------------------------------------------------------
// 2. COURSE BUILDER CRUD (PDF Section 8.1 & 12.2)
// -------------------------------------------------------------

// GET /api/admin/courses: List all courses with full hierarchy
router.get('/courses', authenticate, verifyAdminAccess, (_req: Request, res: Response) => {
  return res.status(200).json({ success: true, courses: initialCourses });
});

// POST /api/admin/courses: Create a new course with initial module & timeline
router.post('/courses', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const { title, slug, subtitle, description, category, level, priceCents, currency, thumbnail } = req.body;

    const courseId = crypto.randomUUID();
    const moduleId = crypto.randomUUID();
    const timelineId = crypto.randomUUID();
    const lessonId = crypto.randomUUID();

    const newCourse: CourseData = {
      id: courseId,
      slug: slug || `course-${Date.now().toString(36)}`,
      title: title || 'Untitled Masterclass',
      subtitle: subtitle || 'Practical mastery with industry standards.',
      description: description || 'Comprehensive course syllabus.',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80',
      banner: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      priceCents: priceCents || 20000,
      currency: currency || 'USD',
      category: category || 'Engineering',
      tags: ['Masterclass'],
      level: level || 'Beginner',
      language: 'English',
      status: 'draft',
      contentVersion: 1,
      series: 'THE CAREER SERIES',
      tagline: 'Build practical mastery.',
      instructor: req.user!.name || 'Lead Instructor',
      instructorTitle: 'Principal Mentor',
      instructorBio: 'Experienced industry practitioner.',
      instructorAvatar: req.user!.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      lastUpdatedDate: 'November 2026',
      badge: 'New',
      rating: 5.0,
      reviewCount: 0,
      outcomes: ['Build production-grade skills', 'Complete verified portfolio review'],
      requirements: ['Computer with modern web browser', 'Desire to learn'],
      whoIsItFor: ['Aspiring professionals and builders'],
      totalDuration: '15 min · 1 lesson',
      durationHours: 1,
      lessonCount: 1,
      moduleCount: 1,
      gradientFrom: '#1e1b4b',
      gradientTo: '#4338ca',
      accentColor: '#4f46e5',
      modules: [
        {
          id: moduleId,
          courseId,
          title: 'Module 1: Foundations & Architecture',
          description: 'Introduction to foundational concepts and workflows.',
          objectives: ['Understand core terminology', 'Set up initial development tools'],
          position: 1,
          completionRule: 'all_lessons',
          unlockRule: 'open',
          status: 'published',
          archived: false,
          timeline: {
            id: timelineId,
            moduleId,
            label: 'Week 1',
            suggestedDuration: '3 days',
            startOffsetDays: 1,
            releaseMode: 'self_paced',
            releaseAfterDays: 0,
            bufferMinutes: 20,
            estimatedStudyTimeMinutes: 45,
          },
          lessons: [
            {
              id: lessonId,
              moduleId,
              title: 'Welcome & Course Orientation',
              description: 'Course overview and learning path.',
              type: 'video',
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              duration: '15 min',
              durationSeconds: 900,
              position: 1,
              isFreePreview: true,
              isRequired: true,
              status: 'published',
              archived: false,
            },
          ],
        },
      ],
    };

    recalculateCourseDerivedFields(newCourse);
    initialCourses.unshift(newCourse);
    persistCourses();
    await syncCourseToDb(newCourse);

    return res.status(201).json({ success: true, message: 'Course created.', course: newCourse });
  } catch (error: any) {
    console.error('Create course error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create course.' });
  }
});

// PUT /api/admin/courses/:id: Update course overview details (Section 3 & 8.1)
router.put('/courses/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    const courseIndex = initialCourses.findIndex((c) => c.id === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const existing = initialCourses[courseIndex];
    const updateData = req.body;

    const updatedCourse: CourseData = {
      ...existing,
      ...updateData,
      id: existing.id,
      modules: existing.modules, // Modules preserved
    };

    recalculateCourseDerivedFields(updatedCourse);
    initialCourses[courseIndex] = updatedCourse;
    persistCourses();
    await syncCourseToDb(updatedCourse);

    return res.status(200).json({ success: true, message: 'Course details updated.', course: updatedCourse });
  } catch (error: any) {
    console.error('Update course error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update course details.' });
  }
});

// POST /api/admin/courses/:id/publish: Publish course changes (Section 8.3 & 9.1)
// Bumps contentVersion, applies drafts, stamps publishedTime, returns change summary
router.post('/courses/:id/publish', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    const course = initialCourses.find((c) => c.id === courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const previousVersion = course.contentVersion || 1;
    course.contentVersion = previousVersion + 1;
    course.status = 'published';
    course.publishedTime = new Date().toISOString();

    // Mark all draft modules and lessons to published if requested
    for (const m of course.modules) {
      if (m.status === 'draft') m.status = 'published';
      for (const l of m.lessons) {
        if (l.status === 'draft') l.status = 'published';
      }
      if (m.quiz && m.quiz.status === 'draft') m.quiz.status = 'published';
    }

    recalculateCourseDerivedFields(course);
    persistCourses();
    await syncCourseToDb(course);

    return res.status(200).json({
      success: true,
      message: `Course published successfully. Content version bumped to v${course.contentVersion}.`,
      changeSummary: {
        version: course.contentVersion,
        publishedTime: course.publishedTime,
        moduleCount: course.moduleCount,
        lessonCount: course.lessonCount,
      },
      course,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to publish course.' });
  }
});

// POST /api/admin/courses/:id/unpublish & archive
router.post('/courses/:id/unpublish', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  const course = initialCourses.find((c) => c.id === req.params.id);
  if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
  course.status = 'draft';
  persistCourses();
  await syncCourseToDb(course);
  return res.status(200).json({ success: true, message: 'Course moved to draft mode.', course });
});

router.post('/courses/:id/archive', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  const course = initialCourses.find((c) => c.id === req.params.id);
  if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
  course.status = 'archived';
  persistCourses();
  await syncCourseToDb(course);
  return res.status(200).json({ success: true, message: 'Course archived.', course });
});

// DELETE /api/admin/courses/:id
router.delete('/courses/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  const courseIndex = initialCourses.findIndex((c) => c.id === req.params.id);
  if (courseIndex === -1) return res.status(404).json({ success: false, message: 'Course not found.' });
  initialCourses.splice(courseIndex, 1);
  persistCourses();
  return res.status(200).json({ success: true, message: 'Course deleted.' });
});

// -------------------------------------------------------------
// 3. MODULE CRUD (PDF Section 4, 8.1 & 12.2)
// -------------------------------------------------------------

// POST /api/admin/courses/:id/modules: Add Module
router.post('/courses/:id/modules', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    const course = initialCourses.find((c) => c.id === courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const { title, description, objectives, completionRule, unlockRule, suggestedDuration, label } = req.body;
    const moduleId = crypto.randomUUID();
    const timelineId = crypto.randomUUID();
    const nextPosition = course.modules.length + 1;

    const newModule: ModuleData = {
      id: moduleId,
      courseId,
      title: title || `Module ${nextPosition}: New Section`,
      description: description || '',
      objectives: objectives || ['Understand key module concepts'],
      position: nextPosition,
      completionRule: completionRule || 'all_lessons',
      unlockRule: unlockRule || 'open',
      status: 'published',
      archived: false,
      timeline: {
        id: timelineId,
        moduleId,
        label: label || `Week ${nextPosition}`,
        suggestedDuration: suggestedDuration || '4 days',
        startOffsetDays: (nextPosition - 1) * 7 + 1,
        releaseMode: 'self_paced',
        releaseAfterDays: 0,
        bufferMinutes: 20,
        estimatedStudyTimeMinutes: 60,
      },
      lessons: [],
    };

    course.modules.push(newModule);
    recalculateCourseDerivedFields(course);
    persistCourses();
    await syncCourseToDb(course);

    return res.status(201).json({ success: true, message: 'Module added.', module: newModule, course });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to add module.' });
  }
});

// PUT /api/admin/modules/:id: Update Module
router.put('/modules/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const moduleId = req.params.id;
    let targetModule: ModuleData | null = null;
    let targetCourse: CourseData | null = null;

    for (const c of initialCourses) {
      const found = c.modules.find((m) => m.id === moduleId);
      if (found) {
        targetModule = found;
        targetCourse = c;
        break;
      }
    }

    if (!targetModule || !targetCourse) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const { title, description, objectives, completionRule, unlockRule, status } = req.body;
    if (title !== undefined) targetModule.title = title;
    if (description !== undefined) targetModule.description = description;
    if (objectives !== undefined) targetModule.objectives = objectives;
    if (completionRule !== undefined) targetModule.completionRule = completionRule;
    if (unlockRule !== undefined) targetModule.unlockRule = unlockRule;
    if (status !== undefined) targetModule.status = status;

    recalculateCourseDerivedFields(targetCourse);
    persistCourses();
    await syncCourseToDb(targetCourse);

    return res.status(200).json({ success: true, message: 'Module updated.', module: targetModule, course: targetCourse });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update module.' });
  }
});

// DELETE /api/admin/modules/:id: Archive Module (Section 9.2: Item is archived, not erased; excluded from percent)
router.delete('/modules/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const moduleId = req.params.id;
    for (const c of initialCourses) {
      const idx = c.modules.findIndex((m) => m.id === moduleId);
      if (idx !== -1) {
        c.modules[idx].archived = true;
        recalculateCourseDerivedFields(c);
        persistCourses();
        await syncCourseToDb(c);
        return res.status(200).json({ success: true, message: 'Module archived.', course: c });
      }
    }
    return res.status(404).json({ success: false, message: 'Module not found.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete module.' });
  }
});

// POST /api/admin/courses/:id/modules/reorder
router.post('/courses/:id/modules/reorder', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    const { moduleIds } = req.body; // Array of module IDs in new order
    const course = initialCourses.find((c) => c.id === courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    if (Array.isArray(moduleIds)) {
      const ordered: ModuleData[] = [];
      moduleIds.forEach((id: string, idx: number) => {
        const mod = course.modules.find((m) => m.id === id);
        if (mod) {
          mod.position = idx + 1;
          ordered.push(mod);
        }
      });
      // Append any remaining
      course.modules.forEach((m) => {
        if (!ordered.find((o) => o.id === m.id)) {
          ordered.push(m);
        }
      });
      course.modules = ordered;
      recalculateCourseDerivedFields(course);
      persistCourses();
      await syncCourseToDb(course);
    }

    return res.status(200).json({ success: true, message: 'Modules reordered.', course });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reorder modules.' });
  }
});

// -------------------------------------------------------------
// 4. MODULE TIMELINE CRUD (PDF Section 5 & 12.2)
// -------------------------------------------------------------

// PUT /api/admin/modules/:id/timeline: Update Module Timeline
router.put('/modules/:id/timeline', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const moduleId = req.params.id;
    let targetModule: ModuleData | null = null;
    let targetCourse: CourseData | null = null;

    for (const c of initialCourses) {
      const found = c.modules.find((m) => m.id === moduleId);
      if (found) {
        targetModule = found;
        targetCourse = c;
        break;
      }
    }

    if (!targetModule || !targetCourse) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const { label, suggestedDuration, startOffsetDays, releaseMode, releaseAfterDays, bufferMinutes } = req.body;
    if (!targetModule.timeline) {
      targetModule.timeline = {
        id: crypto.randomUUID(),
        moduleId,
        label: 'Week 1',
        suggestedDuration: '3 days',
        startOffsetDays: 1,
        releaseMode: 'self_paced',
        releaseAfterDays: 0,
        bufferMinutes: 0,
        estimatedStudyTimeMinutes: 60,
      };
    }

    if (label !== undefined) targetModule.timeline.label = label;
    if (suggestedDuration !== undefined) targetModule.timeline.suggestedDuration = suggestedDuration;
    if (startOffsetDays !== undefined) targetModule.timeline.startOffsetDays = Number(startOffsetDays);
    if (releaseMode !== undefined) targetModule.timeline.releaseMode = releaseMode;
    if (releaseAfterDays !== undefined) targetModule.timeline.releaseAfterDays = Number(releaseAfterDays);
    if (bufferMinutes !== undefined) targetModule.timeline.bufferMinutes = Number(bufferMinutes);

    recalculateCourseDerivedFields(targetCourse);
    persistCourses();
    await syncCourseToDb(targetCourse);

    return res.status(200).json({ success: true, message: 'Timeline updated.', timeline: targetModule.timeline, course: targetCourse });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update timeline.' });
  }
});

// -------------------------------------------------------------
// 5. LESSON CRUD (PDF Section 4.1 & 12.2)
// -------------------------------------------------------------

// POST /api/admin/modules/:id/lessons: Add Lesson
router.post('/modules/:id/lessons', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const moduleId = req.params.id;
    let targetModule: ModuleData | null = null;
    let targetCourse: CourseData | null = null;

    for (const c of initialCourses) {
      const found = c.modules.find((m) => m.id === moduleId);
      if (found) {
        targetModule = found;
        targetCourse = c;
        break;
      }
    }

    if (!targetModule || !targetCourse) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const { title, description, type, articleBody, mediaUrl, videoUrl, mediaAssetId, durationSeconds, duration, isFreePreview, isRequired, resources } = req.body;
    const lessonId = crypto.randomUUID();
    const nextPos = targetModule.lessons.length + 1;

    const newLesson: LessonData = {
      id: lessonId,
      moduleId,
      title: title || `Lesson ${nextPos}`,
      description: description || '',
      type: type || 'video',
      articleBody: articleBody || '',
      mediaUrl: mediaUrl || videoUrl || '',
      videoUrl: videoUrl || mediaUrl || '',
      mediaAssetId: mediaAssetId || null,
      duration: duration || '15 min',
      durationSeconds: durationSeconds || 900,
      position: nextPos,
      isFreePreview: isFreePreview || false,
      isRequired: isRequired !== false,
      status: 'published',
      archived: false,
      resources: resources || [],
    };

    targetModule.lessons.push(newLesson);
    recalculateCourseDerivedFields(targetCourse);
    persistCourses();
    await syncCourseToDb(targetCourse);

    return res.status(201).json({ success: true, message: 'Lesson added.', lesson: newLesson, course: targetCourse });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to add lesson.' });
  }
});

// PUT /api/admin/lessons/:id: Update Lesson
router.put('/lessons/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;
    let targetLesson: LessonData | null = null;
    let targetCourse: CourseData | null = null;

    for (const c of initialCourses) {
      for (const m of c.modules) {
        const found = m.lessons.find((l) => l.id === lessonId);
        if (found) {
          targetLesson = found;
          targetCourse = c;
          break;
        }
      }
      if (targetLesson) break;
    }

    if (!targetLesson || !targetCourse) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const update = req.body;
    Object.assign(targetLesson, update);

    recalculateCourseDerivedFields(targetCourse);
    persistCourses();
    await syncCourseToDb(targetCourse);

    return res.status(200).json({ success: true, message: 'Lesson updated.', lesson: targetLesson, course: targetCourse });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update lesson.' });
  }
});

// DELETE /api/admin/lessons/:id: Archive Lesson (Section 9.2)
router.delete('/lessons/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const lessonId = req.params.id;
    for (const c of initialCourses) {
      for (const m of c.modules) {
        const idx = m.lessons.findIndex((l) => l.id === lessonId);
        if (idx !== -1) {
          m.lessons[idx].archived = true;
          recalculateCourseDerivedFields(c);
          persistCourses();
          await syncCourseToDb(c);
          return res.status(200).json({ success: true, message: 'Lesson archived.', course: c });
        }
      }
    }
    return res.status(404).json({ success: false, message: 'Lesson not found.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete lesson.' });
  }
});

// POST /api/admin/lessons/move: Move lesson between modules
router.post('/lessons/move', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const { lessonId, targetModuleId } = req.body;
    let targetLesson: LessonData | null = null;
    let sourceModule: ModuleData | null = null;
    let destinationModule: ModuleData | null = null;
    let targetCourse: CourseData | null = null;

    for (const c of initialCourses) {
      for (const m of c.modules) {
        if (m.id === targetModuleId) destinationModule = m;
        const lIdx = m.lessons.findIndex((l) => l.id === lessonId);
        if (lIdx !== -1) {
          targetLesson = m.lessons[lIdx];
          sourceModule = m;
          targetCourse = c;
        }
      }
    }

    if (!targetLesson || !sourceModule || !destinationModule || !targetCourse) {
      return res.status(404).json({ success: false, message: 'Lesson or target module not found.' });
    }

    // Remove from source
    sourceModule.lessons = sourceModule.lessons.filter((l) => l.id !== lessonId);
    // Add to destination
    targetLesson.moduleId = destinationModule.id;
    targetLesson.position = destinationModule.lessons.length + 1;
    destinationModule.lessons.push(targetLesson);

    recalculateCourseDerivedFields(targetCourse);
    persistCourses();
    await syncCourseToDb(targetCourse);

    return res.status(200).json({ success: true, message: 'Lesson moved successfully.', course: targetCourse });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to move lesson.' });
  }
});

// -------------------------------------------------------------
// 6. QUIZ CRUD & CSV IMPORT (PDF Section 6, 8.1 & 12.2)
// -------------------------------------------------------------

// PUT /api/admin/modules/:id/quiz: Create or update module quiz settings
router.put('/modules/:id/quiz', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const moduleId = req.params.id;
    let targetModule: ModuleData | null = null;
    let targetCourse: CourseData | null = null;

    for (const c of initialCourses) {
      const found = c.modules.find((m) => m.id === moduleId);
      if (found) {
        targetModule = found;
        targetCourse = c;
        break;
      }
    }

    if (!targetModule || !targetCourse) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const {
      title,
      instructions,
      isRequired,
      passingPercent,
      timeLimitMinutes,
      attemptsAllowed,
      shuffleQuestions,
      shuffleOptions,
      showResultsMode,
      unlockNext,
    } = req.body;

    if (!targetModule.quiz) {
      targetModule.quiz = {
        id: crypto.randomUUID(),
        moduleId,
        title: title || `${targetModule.title} Assessment`,
        instructions: instructions || 'Test your knowledge on this module.',
        isRequired: isRequired || false,
        passingPercent: passingPercent || 70,
        timeLimitMinutes: timeLimitMinutes || 0,
        attemptsAllowed: attemptsAllowed || 0,
        shuffleQuestions: shuffleQuestions || false,
        shuffleOptions: shuffleOptions || false,
        showResultsMode: showResultsMode || 'score_and_correct',
        unlockNext: unlockNext || false,
        poolSize: 0,
        status: 'published',
        questions: [],
      };
    } else {
      if (title !== undefined) targetModule.quiz.title = title;
      if (instructions !== undefined) targetModule.quiz.instructions = instructions;
      if (isRequired !== undefined) targetModule.quiz.isRequired = isRequired;
      if (passingPercent !== undefined) targetModule.quiz.passingPercent = Number(passingPercent);
      if (timeLimitMinutes !== undefined) targetModule.quiz.timeLimitMinutes = Number(timeLimitMinutes);
      if (attemptsAllowed !== undefined) targetModule.quiz.attemptsAllowed = Number(attemptsAllowed);
      if (shuffleQuestions !== undefined) targetModule.quiz.shuffleQuestions = shuffleQuestions;
      if (shuffleOptions !== undefined) targetModule.quiz.shuffleOptions = shuffleOptions;
      if (showResultsMode !== undefined) targetModule.quiz.showResultsMode = showResultsMode;
      if (unlockNext !== undefined) targetModule.quiz.unlockNext = unlockNext;
    }

    recalculateCourseDerivedFields(targetCourse);
    persistCourses();
    await syncCourseToDb(targetCourse);

    return res.status(200).json({ success: true, message: 'Quiz settings updated.', quiz: targetModule.quiz, course: targetCourse });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update quiz.' });
  }
});

// POST /api/admin/quizzes/:id/questions: Add Question to Quiz
router.post('/quizzes/:id/questions', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const quizId = req.params.id;
    let targetQuiz: QuizData | null = null;
    let targetCourse: CourseData | null = null;

    for (const c of initialCourses) {
      for (const m of c.modules) {
        if (m.quiz && m.quiz.id === quizId) {
          targetQuiz = m.quiz;
          targetCourse = c;
          break;
        }
      }
      if (targetQuiz) break;
    }

    if (!targetQuiz || !targetCourse) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const { type, questionText, imageUrl, explanation, points, options, acceptedShortAnswers } = req.body;
    const questionId = crypto.randomUUID();
    const nextPos = targetQuiz.questions.length + 1;

    const newQuestion: QuizQuestionData = {
      id: questionId,
      type: type || 'single_choice',
      questionText: questionText || `Question ${nextPos}`,
      imageUrl: imageUrl || undefined,
      explanation: explanation || '',
      points: points || 1,
      position: nextPos,
      options: Array.isArray(options) ? options.map((opt: any, i: number) => ({
        id: opt.id || crypto.randomUUID(),
        optionText: opt.optionText || `Option ${i + 1}`,
        isCorrect: opt.isCorrect || false,
        position: i + 1,
      })) : [
        { id: crypto.randomUUID(), optionText: 'Option A', isCorrect: true, position: 1 },
        { id: crypto.randomUUID(), optionText: 'Option B', isCorrect: false, position: 2 },
      ],
      acceptedShortAnswers: acceptedShortAnswers || [],
    };

    targetQuiz.questions.push(newQuestion);
    recalculateCourseDerivedFields(targetCourse);
    persistCourses();
    await syncCourseToDb(targetCourse);

    return res.status(201).json({ success: true, message: 'Question added.', question: newQuestion, quiz: targetQuiz });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to add question.' });
  }
});

// PUT /api/admin/quiz-questions/:id: Update Question
router.put('/quiz-questions/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const questionId = req.params.id;
    let targetQuestion: QuizQuestionData | null = null;
    let targetQuiz: QuizData | null = null;
    let targetCourse: CourseData | null = null;

    for (const c of initialCourses) {
      for (const m of c.modules) {
        if (m.quiz) {
          const found = m.quiz.questions.find((q) => q.id === questionId);
          if (found) {
            targetQuestion = found;
            targetQuiz = m.quiz;
            targetCourse = c;
            break;
          }
        }
      }
      if (targetQuestion) break;
    }

    if (!targetQuestion || !targetQuiz || !targetCourse) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const update = req.body;
    Object.assign(targetQuestion, update);

    recalculateCourseDerivedFields(targetCourse);
    persistCourses();
    await syncCourseToDb(targetCourse);

    return res.status(200).json({ success: true, message: 'Question updated.', question: targetQuestion, quiz: targetQuiz });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update question.' });
  }
});

// DELETE /api/admin/quiz-questions/:id: Delete Question
router.delete('/quiz-questions/:id', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const questionId = req.params.id;
    for (const c of initialCourses) {
      for (const m of c.modules) {
        if (m.quiz) {
          const idx = m.quiz.questions.findIndex((q) => q.id === questionId);
          if (idx !== -1) {
            m.quiz.questions.splice(idx, 1);
            recalculateCourseDerivedFields(c);
            persistCourses();
            await syncCourseToDb(c);
            return res.status(200).json({ success: true, message: 'Question deleted.', quiz: m.quiz });
          }
        }
      }
    }
    return res.status(404).json({ success: false, message: 'Question not found.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete question.' });
  }
});

// POST /api/admin/quizzes/:id/import-csv: Import questions from CSV text (Section 8.1)
router.post('/quizzes/:id/import-csv', authenticate, verifyAdminAccess, async (req: Request, res: Response) => {
  try {
    const quizId = req.params.id;
    const { csvText } = req.body;
    if (!csvText) return res.status(400).json({ success: false, message: 'csvText is required.' });

    let targetQuiz: QuizData | null = null;
    let targetCourse: CourseData | null = null;

    for (const c of initialCourses) {
      for (const m of c.modules) {
        if (m.quiz && m.quiz.id === quizId) {
          targetQuiz = m.quiz;
          targetCourse = c;
          break;
        }
      }
      if (targetQuiz) break;
    }

    if (!targetQuiz || !targetCourse) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    // CSV format: Question,Type,Option1,Option2,Option3,Option4,CorrectOptionIndex(1-based),Explanation,Points
    const lines = csvText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const addedQuestions: QuizQuestionData[] = [];

    // Skip header line if present
    const startIndex = lines[0].toLowerCase().includes('question') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p: string) => p.trim());
      if (parts.length < 4) continue;

      const qText = parts[0];
      const qType = (parts[1] || 'single_choice') as any;
      const opt1 = parts[2] || 'Option 1';
      const opt2 = parts[3] || 'Option 2';
      const opt3 = parts[4] || '';
      const opt4 = parts[5] || '';
      const correctIdx = parseInt(parts[6] || '1', 10);
      const explanation = parts[7] || '';
      const points = parseInt(parts[8] || '1', 10);

      const optionsList = [
        { id: crypto.randomUUID(), optionText: opt1, isCorrect: correctIdx === 1, position: 1 },
        { id: crypto.randomUUID(), optionText: opt2, isCorrect: correctIdx === 2, position: 2 },
      ];
      if (opt3) optionsList.push({ id: crypto.randomUUID(), optionText: opt3, isCorrect: correctIdx === 3, position: 3 });
      if (opt4) optionsList.push({ id: crypto.randomUUID(), optionText: opt4, isCorrect: correctIdx === 4, position: 4 });

      const newQ: QuizQuestionData = {
        id: crypto.randomUUID(),
        type: qType,
        questionText: qText,
        explanation,
        points: isNaN(points) ? 1 : points,
        position: targetQuiz.questions.length + addedQuestions.length + 1,
        options: optionsList,
      };
      addedQuestions.push(newQ);
    }

    targetQuiz.questions.push(...addedQuestions);
    recalculateCourseDerivedFields(targetCourse);
    persistCourses();
    await syncCourseToDb(targetCourse);

    return res.status(200).json({
      success: true,
      message: `Imported ${addedQuestions.length} questions from CSV.`,
      addedCount: addedQuestions.length,
      quiz: targetQuiz,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to import CSV.' });
  }
});

// -------------------------------------------------------------
// 7. STUDIO ANALYTICS (PDF Section 8.2 & 12.2)
// -------------------------------------------------------------

router.get('/analytics', authenticate, verifyAdminAccess, (req: Request, res: Response) => {
  try {
    // 1. Per course metrics
    const courseStats = initialCourses.map((c) => {
      const enrollments = mockEnrollments.filter((e) => e.courseId === c.id && e.status === 'active');
      const enrolledCount = enrollments.length;
      let totalProgressSum = 0;
      let completedCount = 0;

      for (const e of enrollments) {
        const prog = mockProgressMap.get(`${e.userId}:${c.id}`);
        if (prog) {
          if (prog.isCompleted) completedCount++;
          // Rough percent based on completed lessons
          const pct = c.lessonCount > 0 ? Math.min(100, Math.round((prog.completedLessonIds.length / c.lessonCount) * 100)) : 0;
          totalProgressSum += pct;
        }
      }

      const avgProgress = enrolledCount > 0 ? Math.round(totalProgressSum / enrolledCount) : 0;
      const completionRate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

      // Module drop-off stats
      const moduleStats = c.modules.map((m) => {
        let started = 0;
        let completed = 0;
        for (const e of enrollments) {
          const prog = mockProgressMap.get(`${e.userId}:${c.id}`);
          if (prog) {
            const hasStarted = m.lessons.some((l) => prog.completedLessonIds.includes(l.id) || (prog.lessonProgress[l.id]?.secondsWatched || 0) > 0);
            const isModComplete = m.lessons.every((l) => prog.completedLessonIds.includes(l.id));
            if (hasStarted) started++;
            if (isModComplete) completed++;
          }
        }
        return {
          moduleId: m.id,
          title: m.title,
          started,
          completed,
          dropOffRate: started > 0 ? Math.round(((started - completed) / started) * 100) : 0,
        };
      });

      // Quiz statistics
      const quizStats: any[] = [];
      for (const m of c.modules) {
        if (m.quiz) {
          let totalAttempts = 0;
          let passCount = 0;
          let totalScore = 0;
          for (const e of enrollments) {
            const prog = mockProgressMap.get(`${e.userId}:${c.id}`);
            if (prog && prog.quizAttempts[m.quiz.id]) {
              const attempts = prog.quizAttempts[m.quiz.id];
              totalAttempts += attempts.length;
              attempts.forEach((a) => {
                totalScore += a.scorePercent;
                if (a.passed) passCount++;
              });
            }
          }
          quizStats.push({
            quizId: m.quiz.id,
            moduleTitle: m.title,
            title: m.quiz.title,
            attempts: totalAttempts,
            passRate: totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0,
            averageScore: totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0,
          });
        }
      }

      return {
        courseId: c.id,
        title: c.title,
        status: c.status,
        contentVersion: c.contentVersion,
        enrolledStudents: enrolledCount,
        averageProgress: avgProgress,
        completionRate,
        averageTimeToComplete: `${c.durationHours || 6} hours`,
        modules: moduleStats,
        quizzes: quizStats,
      };
    });

    // 2. Student list with module progress and quiz attempts (Section 8.2)
    const studentStats = mockUsers.map((u) => {
      const enrollments = mockEnrollments.filter((e) => e.userId === u.id && e.status === 'active');
      const coursesProgress = enrollments.map((e) => {
        const c = initialCourses.find((course) => course.id === e.courseId);
        const prog = mockProgressMap.get(`${u.id}:${e.courseId}`);
        return {
          courseId: e.courseId,
          courseTitle: c?.title || 'Unknown Course',
          completedLessons: prog?.completedLessonIds.length || 0,
          totalLessons: c?.lessonCount || 0,
          percent: c?.lessonCount ? Math.min(100, Math.round(((prog?.completedLessonIds.length || 0) / c.lessonCount) * 100)) : 0,
          isCompleted: prog?.isCompleted || false,
          quizScores: prog?.quizAttempts || {},
        };
      });

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        enrolledCount: enrollments.length,
        courses: coursesProgress,
      };
    });

    return res.status(200).json({
      success: true,
      analytics: {
        courses: courseStats,
        students: studentStats,
      },
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load studio analytics.' });
  }
});

// -------------------------------------------------------------
// 8. PROGRESS RESET (PDF Section 8.2 & 12.2)
// -------------------------------------------------------------

// POST /api/admin/reset-progress: Reset a lesson, quiz, or entire course for a student
router.post('/reset-progress', authenticate, verifyAdminAccess, (req: Request, res: Response) => {
  try {
    const { userId, courseId, type, targetId } = req.body;
    // type: 'lesson' | 'quiz' | 'course'

    const key = `${userId}:${courseId}`;
    const prog = mockProgressMap.get(key);
    if (!prog) {
      return res.status(404).json({ success: false, message: 'No progress found for student on this course.' });
    }

    if (type === 'lesson' && targetId) {
      prog.completedLessonIds = prog.completedLessonIds.filter((id) => id !== targetId);
      delete prog.lessonProgress[targetId];
      prog.isCompleted = false;
    } else if (type === 'quiz' && targetId) {
      prog.passedQuizIds = prog.passedQuizIds.filter((id) => id !== targetId);
      delete prog.quizAttempts[targetId];
      delete prog.savedQuizAnswers[targetId];
      prog.isCompleted = false;
    } else if (type === 'course') {
      prog.completedLessonIds = [];
      prog.lessonProgress = {};
      prog.passedQuizIds = [];
      prog.quizAttempts = {};
      prog.savedQuizAnswers = {};
      prog.isCompleted = false;
      prog.completedDate = undefined;
    }

    prog.updatedAt = new Date().toISOString();
    persistProgress();

    return res.status(200).json({
      success: true,
      message: `Progress reset (${type}) for student.`,
      updatedProgress: prog,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to reset student progress.' });
  }
});

// -------------------------------------------------------------
// Legacy endpoints compatibility for purchases & notifications
// -------------------------------------------------------------

export { mockPurchases };
export type { MockPurchase };

router.get('/sales', authenticate, verifyAdminAccess, (_req: Request, res: Response) => {
  const gross = mockPurchases.reduce((acc, p) => p.status === 'paid' ? acc + p.amountCents : acc, 0);
  return res.status(200).json({
    success: true,
    purchases: mockPurchases,
    metrics: {
      grossRevenueCents: gross,
      netRevenueCents: gross,
      totalPurchasesCount: mockPurchases.length,
      refundsCount: 0,
      refundRatePercent: 0,
    },
  });
});

router.get('/notifications', authenticate, verifyAdminAccess, (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    notifications: [
      { id: 'notif-1', recipient: 'priya.s@example.com', subject: 'Course Enrollment Confirmation', status: 'delivered', timestamp: new Date().toISOString() },
    ],
  });
});

export default router;
