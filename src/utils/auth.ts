import { SignJWT, jwtVerify } from 'jose';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, User, UserRole } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-me'
);

export interface AuthenticatedRequest extends Request {
  user?: User;
  apiKey?: {
    id: string;
    userId: string;
    rateLimit: number;
  };
}

export async function generateToken(user: User): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setIssuer('dailymotion-api')
    .setAudience('dailymotion-api')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      clockTolerance: 60,
      issuer: 'dailymotion-api',
      audience: 'dailymotion-api',
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    // Check API Key first
    if (apiKeyHeader && typeof apiKeyHeader === 'string') {
      const apiKey = await prisma.apiKey.findUnique({
        where: { key: apiKeyHeader },
        include: { user: true },
      });

      if (!apiKey || !apiKey.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or inactive API key',
        });
      }

      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return res.status(401).json({
          success: false,
          error: 'API key has expired',
        });
      }

      // Update usage
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
        },
      });

      req.apiKey = {
        id: apiKey.id,
        userId: apiKey.userId,
        rateLimit: apiKey.rateLimit,
      };
      req.user = apiKey.user;
      return next();
    }

    // Check JWT Bearer token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token);

      if (!payload || !payload.userId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId as string },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'User not found or inactive',
        });
      }

      req.user = user;
      return next();
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide Bearer token or API key.',
      hint: 'Use Authorization: Bearer <token> or X-API-Key: <key>',
    });
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }
  next();
}
