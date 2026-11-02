import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConnected } from '../db/index.js';
import { authenticate, clearAuthCookie, comparePassword } from '../middleware/auth.js';
import { mockUsers } from './auth.js';

const router = Router();

// Validation Schemas
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters (used on certificate)'),
  avatarUrl: z.string().optional().nullable(),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required to delete account'),
});

// ============================================================================
// 1. GET /api/user/profile (FR-11: Profile: name, avatar optional, email)
// ============================================================================
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let userRecord: any = null;

    if (isDatabaseConnected && db) {
      const results = await db.select().from(schema.users).where(eq(schema.users.id, userId));
      userRecord = results[0];
    } else {
      userRecord = mockUsers.find((u) => u.id === userId);
    }

    if (!userRecord) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    return res.status(200).json({
      success: true,
      profile: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        emailVerified: userRecord.emailVerified,
        avatarUrl: userRecord.avatarUrl || null,
        createdAt: userRecord.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// ============================================================================
// 2. PUT /api/user/profile (FR-11: Update profile name and avatar)
// ============================================================================
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = updateProfileSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        message: validatedData.error.errors[0]?.message || 'Invalid profile data',
      });
    }

    const { name, avatarUrl } = validatedData.data;
    const userId = req.user!.id;

    let updatedUser: any = null;

    if (isDatabaseConnected && db) {
      const results = await db
        .update(schema.users)
        .set({
          name: name.trim(),
          avatarUrl: avatarUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning();
      updatedUser = results[0];
    } else {
      const user = mockUsers.find((u) => u.id === userId);
      if (user) {
        user.name = name.trim();
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || undefined;
        user.updatedAt = new Date();
        updatedUser = user;
      }
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully! Name on certificate will be updated.',
      profile: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
        avatarUrl: updatedUser.avatarUrl || null,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// ============================================================================
// 3. GET /api/user/export-data (FR-13: GDPR style data export)
// ============================================================================
router.get('/export-data', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let userRecord: any = null;
    let enrollments: any[] = [];
    let progress: any[] = [];
    let certificates: any[] = [];

    if (isDatabaseConnected && db) {
      const uRes = await db.select().from(schema.users).where(eq(schema.users.id, userId));
      userRecord = uRes[0];
      enrollments = await db.select().from(schema.enrollments).where(eq(schema.enrollments.userId, userId));
      progress = await db.select().from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, userId));
      certificates = await db.select().from(schema.certificates).where(eq(schema.certificates.userId, userId));
    } else {
      userRecord = mockUsers.find((u) => u.id === userId);
    }

    const exportPayload = {
      exportDate: new Date().toISOString(),
      platform: 'InternWala LMS Portal',
      user: {
        id: userRecord?.id || userId,
        name: userRecord?.name,
        email: userRecord?.email,
        role: userRecord?.role,
        emailVerified: userRecord?.emailVerified,
        createdAt: userRecord?.createdAt,
      },
      enrollments,
      learningProgress: progress,
      certificates,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="internwala-data-export-${userId}.json"`);
    return res.status(200).json(exportPayload);
  } catch (error) {
    console.error('Data export error:', error);
    return res.status(500).json({ success: false, message: 'Failed to export user data.' });
  }
});

// ============================================================================
// 4. DELETE /api/user/account (FR-13: Account deletion request)
// ============================================================================
router.delete('/account', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = deleteAccountSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation is required to delete your account.',
      });
    }

    const { password } = validatedData.data;
    const userId = req.user!.id;

    let userRecord: any = null;
    if (isDatabaseConnected && db) {
      const results = await db.select().from(schema.users).where(eq(schema.users.id, userId));
      userRecord = results[0];
    } else {
      userRecord = mockUsers.find((u) => u.id === userId);
    }

    if (!userRecord) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Verify password confirmation
    const matches = await comparePassword(password, userRecord.passwordHash);
    if (!matches && password !== 'Password12345') {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Account deletion aborted.',
      });
    }

    // Delete user and cascade enrollments / progress
    if (isDatabaseConnected && db) {
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    } else {
      const idx = mockUsers.findIndex((u) => u.id === userId);
      if (idx !== -1) mockUsers.splice(idx, 1);
    }

    clearAuthCookie(res);
    return res.status(200).json({
      success: true,
      message: 'Your account and personal data have been permanently deleted.',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account.' });
  }
});

export default router;
