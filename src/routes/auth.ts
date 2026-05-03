import { Router } from 'express';
import argon2 from 'argon2';
import { PrismaClient, AuthProvider, UserRole } from '@prisma/client';
import { generateToken, authenticateToken, requireAuth } from '../utils/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, schemas } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// EMAIL + PASSWORD AUTHENTICATION
// ============================================

// Register with email/password
router.post('/register', validate(schemas.register), asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({
      success: false,
      error: 'Email already registered',
      code: 'EMAIL_EXISTS',
    });
  }

  const hashedPassword = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      password: hashedPassword,
      authProvider: AuthProvider.LOCAL,
      role: UserRole.USER,
    },
  });

  // Create free subscription
  await prisma.subscription.create({
    data: {
      userId: user.id,
      tier: 'free',
      downloadLimit: 5,
      apiKeyLimit: 1,
      quality: '480p',
    },
  });

  const token = await generateToken(user);

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    },
  });
}));

// Login with email/password
router.post('/login', validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.password) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
    });
  }

  const valid = await argon2.verify(user.password, password);
  if (!valid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Account is deactivated. Contact support.',
      code: 'ACCOUNT_DEACTIVATED',
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await generateToken(user);

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    },
  });
}));

// Get current user
router.get('/me', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      subscription: true,
      apiKeys: {
        select: {
          id: true,
          name: true,
          key: true,
          isActive: true,
          usageCount: true,
          lastUsedAt: true,
          createdAt: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      subscription: user.subscription,
      apiKeys: user.apiKeys,
    },
  });
}));

// Update profile
router.patch('/profile', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const { name, avatar } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(name && { name }),
      ...(avatar && { avatar }),
    },
  });

  res.json({
    success: true,
    message: 'Profile updated',
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
  });
}));

// Change password
router.post('/change-password', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password (min 8 chars) required',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user?.password) {
    return res.status(400).json({
      success: false,
      error: 'Password change not available for OAuth accounts',
    });
  }

  const valid = await argon2.verify(user.password, currentPassword);
  if (!valid) {
    return res.status(401).json({
      success: false,
      error: 'Current password is incorrect',
    });
  }

  const hashedPassword = await argon2.hash(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
}));

// Logout
router.post('/logout', authenticateToken, asyncHandler(async (req: any, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully. Delete your token on the client side.',
  });
}));

export { router as authRouter };
