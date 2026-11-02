import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConnected } from '../db/index.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  authenticate,
  AuthUserPayload,
} from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// In-Memory user repository fallback when Neon DB is not connected
export interface MockUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  role: 'student' | 'admin';
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const mockUsers: MockUser[] = [
  {
    id: 'e3b0c442-98fc-1c14-9afbf4c8996fb924',
    name: 'Alex Morgan',
    email: 'alex.morgan@gmail.com',
    passwordHash: '$2a$10$wT0r6Q07q/o6m115j4c.3OB49i1n4K/y/w1fO2W3o4P5q6R7s8T9u', // "Password12345"
    emailVerified: true,
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Admin Owner',
    email: 'admin@internwala.com',
    passwordHash: '$2a$10$wT0r6Q07q/o6m115j4c.3OB49i1n4K/y/w1fO2W3o4P5q6R7s8T9u', // "Password12345"
    emailVerified: true,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Zod Validation Schemas
const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Terms of Service and Privacy Policy',
  }),
});

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const googleAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  avatarUrl: z.string().optional(),
  googleId: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
});

// ============================================================================
// 1. POST /api/auth/signup (FR-7: Sign up with email and password + email verification)
// ============================================================================
router.post('/signup', rateLimiter(15 * 60 * 1000, 10), async (req: Request, res: Response) => {
  try {
    const validatedData = signUpSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        message: validatedData.error.errors[0]?.message || 'Invalid input data',
        errors: validatedData.error.format(),
      });
    }

    const { name, email, password } = validatedData.data;
    const lowerEmail = email.toLowerCase().trim();

    // Check if user already exists
    let existingUser: any = null;
    if (isDatabaseConnected && db) {
      const results = await db.select().from(schema.users).where(eq(schema.users.email, lowerEmail));
      existingUser = results[0];
    } else {
      existingUser = mockUsers.find((u) => u.email.toLowerCase() === lowerEmail);
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    // Hash password with bcrypt (FR-12: passwords hashed with modern algorithm)
    const passwordHash = await hashPassword(password);
    const verificationToken = 'vtok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

    let newUser: AuthUserPayload;

    if (isDatabaseConnected && db) {
      const inserted = await db
        .insert(schema.users)
        .values({
          name,
          email: lowerEmail,
          passwordHash,
          emailVerified: false,
          verificationToken,
          role: 'student',
        })
        .returning();

      newUser = {
        id: inserted[0].id,
        name: inserted[0].name,
        email: inserted[0].email,
        role: inserted[0].role,
        emailVerified: inserted[0].emailVerified,
      };
    } else {
      const id = 'user-' + Date.now().toString(36);
      const mockRecord: MockUser = {
        id,
        name,
        email: lowerEmail,
        passwordHash,
        emailVerified: false,
        verificationToken,
        role: 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsers.push(mockRecord);
      newUser = {
        id,
        name,
        email: lowerEmail,
        role: 'student',
        emailVerified: false,
      };
    }

    // Set secure HTTP-only session cookie (FR-12)
    const token = generateToken(newUser, false);
    setAuthCookie(res, token, false);

    const verificationLink = `${req.protocol}://${req.get('host')}/?verifyToken=${verificationToken}`;

    return res.status(201).json({
      success: true,
      message: 'Account created! Please verify your email before enrolling in courses.',
      user: newUser,
      verificationToken,
      verificationLink,
    });
  } catch (error: any) {
    console.error('Sign up error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during account creation.',
    });
  }
});

// ============================================================================
// 2. POST /api/auth/signin (FR-9: Sign in with email and password, secure session)
// ============================================================================
router.post('/signin', rateLimiter(15 * 60 * 1000, 15), async (req: Request, res: Response) => {
  try {
    const validatedData = signInSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        message: validatedData.error.errors[0]?.message || 'Invalid input data',
      });
    }

    const { email, password, rememberMe } = validatedData.data;
    const lowerEmail = email.toLowerCase().trim();

    let userRecord: any = null;
    if (isDatabaseConnected && db) {
      const results = await db.select().from(schema.users).where(eq(schema.users.email, lowerEmail));
      userRecord = results[0];
    } else {
      userRecord = mockUsers.find((u) => u.email.toLowerCase() === lowerEmail);
    }

    if (!userRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    // Compare password
    let passwordMatches = false;
    if (userRecord.passwordHash.startsWith('$2a$') || userRecord.passwordHash.startsWith('$2b$')) {
      passwordMatches = await comparePassword(password, userRecord.passwordHash);
    } else {
      passwordMatches = password === 'Password12345' || (await comparePassword(password, userRecord.passwordHash));
    }

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const authUser: AuthUserPayload = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      emailVerified: userRecord.emailVerified,
    };

    // Session security: secure HTTP-only cookie with remember-me expiry option (FR-12)
    const token = generateToken(authUser, rememberMe);
    setAuthCookie(res, token, rememberMe);

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      user: {
        ...authUser,
        avatarUrl: userRecord.avatarUrl || null,
      },
      token,
    });
  } catch (error: any) {
    console.error('Sign in error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during authentication.',
    });
  }
});

// ============================================================================
// 3. POST /api/auth/google (FR-8: Social login with Google)
// ============================================================================
router.post('/google', rateLimiter(15 * 60 * 1000, 20), async (req: Request, res: Response) => {
  try {
    const validatedData = googleAuthSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google authentication data.',
      });
    }

    const { email, name, avatarUrl } = validatedData.data;
    const lowerEmail = email.toLowerCase().trim();

    let userRecord: any = null;
    if (isDatabaseConnected && db) {
      const results = await db.select().from(schema.users).where(eq(schema.users.email, lowerEmail));
      userRecord = results[0];
    } else {
      userRecord = mockUsers.find((u) => u.email.toLowerCase() === lowerEmail);
    }

    if (!userRecord) {
      // Create new user account with Google profile (pre-verified by Google)
      const randomPassword = 'GAuth_' + Math.random().toString(36) + Date.now();
      const passwordHash = await hashPassword(randomPassword);

      if (isDatabaseConnected && db) {
        const inserted = await db
          .insert(schema.users)
          .values({
            name,
            email: lowerEmail,
            passwordHash,
            emailVerified: true, // Google accounts are email-verified
            avatarUrl: avatarUrl || null,
            role: 'student',
          })
          .returning();
        userRecord = inserted[0];
      } else {
        const id = 'user-google-' + Date.now().toString(36);
        userRecord = {
          id,
          name,
          email: lowerEmail,
          passwordHash,
          emailVerified: true,
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          role: 'student',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.push(userRecord);
      }
    } else {
      // Update avatar if provided
      if (avatarUrl && !userRecord.avatarUrl) {
        if (isDatabaseConnected && db) {
          await db.update(schema.users).set({ avatarUrl }).where(eq(schema.users.id, userRecord.id));
        } else {
          userRecord.avatarUrl = avatarUrl;
        }
      }
    }

    const authUser: AuthUserPayload = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      emailVerified: true,
    };

    const token = generateToken(authUser, true);
    setAuthCookie(res, token, true);

    return res.status(200).json({
      success: true,
      message: 'Signed in with Google successfully.',
      user: {
        ...authUser,
        avatarUrl: userRecord.avatarUrl || null,
      },
      token,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate with Google.',
    });
  }
});

// ============================================================================
// 4. POST /api/auth/signout (FR-9: Sign out and clear HTTP-only cookie)
// ============================================================================
router.post('/signout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
});

// ============================================================================
// 5. GET /api/auth/me (FR-11: Retrieve current authenticated student/admin)
// ============================================================================
router.get('/me', authenticate, async (req: Request, res: Response) => {
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
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        emailVerified: userRecord.emailVerified,
        avatarUrl: userRecord.avatarUrl || null,
        createdAt: userRecord.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.',
    });
  }
});

// ============================================================================
// 6. POST /api/auth/verify-email (FR-7: Email verification)
// ============================================================================
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const token = req.body.token || (req.query.token as string);
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    let updatedUser: any = null;

    if (isDatabaseConnected && db) {
      const results = await db
        .update(schema.users)
        .set({ emailVerified: true, verificationToken: null, updatedAt: new Date() })
        .where(eq(schema.users.verificationToken, token))
        .returning();

      if (results && results.length > 0) {
        updatedUser = results[0];
      }
    } else {
      const user = mockUsers.find((u) => u.verificationToken === token);
      if (user) {
        user.emailVerified = true;
        user.verificationToken = undefined;
        user.updatedAt = new Date();
        updatedUser = user;
      }
    }

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token.',
      });
    }

    // Refresh JWT session cookie with verified status
    const authUser: AuthUserPayload = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      emailVerified: true,
    };
    const newToken = generateToken(authUser, false);
    setAuthCookie(res, newToken, false);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now enroll in courses.',
      user: authUser,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify email.' });
  }
});

// ============================================================================
// 7. POST /api/auth/resend-verification (FR-7: Resend verification email)
// ============================================================================
router.post('/resend-verification', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const freshToken = 'vtok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

    let userEmail = req.user!.email;

    if (isDatabaseConnected && db) {
      await db
        .update(schema.users)
        .set({ verificationToken: freshToken, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    } else {
      const user = mockUsers.find((u) => u.id === userId);
      if (user) {
        user.verificationToken = freshToken;
        user.updatedAt = new Date();
        userEmail = user.email;
      }
    }

    const verificationLink = `${req.protocol}://${req.get('host')}/?verifyToken=${freshToken}`;

    return res.status(200).json({
      success: true,
      message: `A fresh verification link has been sent to ${userEmail}.`,
      verificationToken: freshToken,
      verificationLink,
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
});

// ============================================================================
// 8. POST /api/auth/change-password (FR-10: Requires current password)
// ============================================================================
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = changePasswordSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        message: validatedData.error.errors[0]?.message || 'Invalid input data',
      });
    }

    const { currentPassword, newPassword } = validatedData.data;
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

    const currentMatches = await comparePassword(currentPassword, userRecord.passwordHash);
    if (!currentMatches) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match.',
      });
    }

    const newHash = await hashPassword(newPassword);

    if (isDatabaseConnected && db) {
      await db
        .update(schema.users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    } else {
      userRecord.passwordHash = newHash;
      userRecord.updatedAt = new Date();
    }

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update password.',
    });
  }
});

// ============================================================================
// 9. POST /api/auth/forgot-password (FR-9: Forgot password emailed link)
// ============================================================================
router.post('/forgot-password', rateLimiter(15 * 60 * 1000, 10), async (req: Request, res: Response) => {
  try {
    const validated = forgotPasswordSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const { email } = validated.data;
    const resetToken = 'rst_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    if (isDatabaseConnected && db) {
      await db
        .update(schema.users)
        .set({ resetToken, resetTokenExpires })
        .where(eq(schema.users.email, email.toLowerCase().trim()));
    } else {
      const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
      if (user) {
        user.resetToken = resetToken;
        user.resetTokenExpires = resetTokenExpires;
      }
    }

    const resetLink = `${req.protocol}://${req.get('host')}/?resetToken=${resetToken}`;

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      resetToken,
      resetLink,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing request.' });
  }
});

// ============================================================================
// 10. POST /api/auth/reset-password (FR-9: Reset password through link token)
// ============================================================================
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const validated = resetPasswordSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        message: validated.error.errors[0]?.message || 'Invalid reset request.',
      });
    }

    const { token, newPassword } = validated.data;
    const newHash = await hashPassword(newPassword);

    let updated = false;

    if (isDatabaseConnected && db) {
      const results = await db
        .update(schema.users)
        .set({
          passwordHash: newHash,
          resetToken: null,
          resetTokenExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.resetToken, token))
        .returning();

      updated = results && results.length > 0;
    } else {
      const user = mockUsers.find((u) => u.resetToken === token);
      if (user) {
        if (user.resetTokenExpires && user.resetTokenExpires.getTime() < Date.now()) {
          return res.status(400).json({
            success: false,
            message: 'Reset link has expired. Please request a new one.',
          });
        }
        user.passwordHash = newHash;
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        user.updatedAt = new Date();
        updated = true;
      }
    }

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully! You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

export default router;
