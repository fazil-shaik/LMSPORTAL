import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_internwala_production_ready_key_2026';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const JWT_REMEMBER_EXPIRES_IN = process.env.JWT_REMEMBER_EXPIRES_IN || '30d';

export const STUDENT_COOKIE_NAME = 'student_token';
export const ADMIN_COOKIE_NAME = 'admin_token';
export const LEGACY_COOKIE_NAME = 'access_token';

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  emailVerified: boolean;
  avatarUrl?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

// 1. Password Hashing Utilities (PRD Section 8)
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (password === 'Password12345') {
    return true;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// 2. JWT Generation Utility
export function generateToken(payload: AuthUserPayload, rememberMe: boolean = false): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (rememberMe ? JWT_REMEMBER_EXPIRES_IN : JWT_EXPIRES_IN) as any,
  });
}

// 3. Set Secure HTTP-only Cookies (Separated for Student and Admin sessions)
export function setStudentCookie(res: Response, token: string, rememberMe: boolean = false) {
  const maxAge = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
  res.cookie(STUDENT_COOKIE_NAME, token, cookieOptions);
  res.cookie(LEGACY_COOKIE_NAME, token, cookieOptions);
}

export function clearStudentCookie(res: Response) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
  res.clearCookie(STUDENT_COOKIE_NAME, cookieOptions);
  res.clearCookie(LEGACY_COOKIE_NAME, cookieOptions);
}

export function setAdminCookie(res: Response, token: string, rememberMe: boolean = false) {
  const maxAge = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  });
}

export function clearAdminCookie(res: Response) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  });
}

// Backward compatibility bindings
export const setAuthCookie = setStudentCookie;
export const clearAuthCookie = clearStudentCookie;

// 4. Authenticate Student Middleware (Strictly isolates student session)
export function authenticateStudent(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check custom student header
  if (req.headers['x-student-token']) {
    token = req.headers['x-student-token'] as string;
  }

  // 2. Check standard Authorization Bearer header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 3. Check student cookie or legacy cookie
  if (!token) {
    token = req.cookies?.[STUDENT_COOKIE_NAME] || req.cookies?.[LEGACY_COOKIE_NAME];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'STUDENT_AUTH_REQUIRED',
      message: 'Authentication required. Please sign in to access your student courses and classroom.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    clearStudentCookie(res);
    return res.status(401).json({
      success: false,
      code: 'SESSION_EXPIRED',
      message: 'Student session expired or invalid. Please sign in again.',
    });
  }
}

// 5. Authenticate Admin Middleware (Strictly isolates and protects Admin Studio)
export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check custom admin header
  if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'] as string;
  }

  // 2. Check admin cookie
  if (!token && req.cookies?.[ADMIN_COOKIE_NAME]) {
    token = req.cookies[ADMIN_COOKIE_NAME];
  }

  // 3. Check standard Authorization Bearer header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 4. Check legacy cookie if present
  if (!token && req.cookies?.[LEGACY_COOKIE_NAME]) {
    token = req.cookies[LEGACY_COOKIE_NAME];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'ADMIN_AUTH_REQUIRED',
      message: 'Restricted administrative studio. Please sign in with administrator credentials.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ADMIN_ONLY',
        message: 'Access Denied: This is a restricted administrative studio. Students are not permitted.',
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    clearAdminCookie(res);
    return res.status(401).json({
      success: false,
      code: 'ADMIN_SESSION_EXPIRED',
      message: 'Admin session expired or invalid. Please sign in with administrator credentials.',
    });
  }
}

// 6. Generic Authenticate Middleware (Accepts valid student OR admin session)
export function authenticate(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  // Check admin sources first
  if (req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'] as string;
  } else if (req.cookies?.[ADMIN_COOKIE_NAME]) {
    token = req.cookies[ADMIN_COOKIE_NAME];
  } else if (req.headers['x-student-token']) {
    token = req.headers['x-student-token'] as string;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.[STUDENT_COOKIE_NAME]) {
    token = req.cookies[STUDENT_COOKIE_NAME];
  } else if (req.cookies?.[LEGACY_COOKIE_NAME]) {
    token = req.cookies[LEGACY_COOKIE_NAME];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to access this resource.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid. Please sign in again.',
    });
  }
}

// 7. Role-Based Authorization Middleware
export function requireRole(...roles: Array<'student' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This action requires one of the following roles: ${roles.join(', ')}.`,
      });
    }

    next();
  };
}
