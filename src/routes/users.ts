import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAuth, requireRole } from '../utils/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/profile', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      subscription: true,
      _count: {
        select: {
          apiKeys: true,
          downloadLogs: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      avatar: user!.avatar,
      role: user!.role,
      createdAt: user!.createdAt,
      lastLoginAt: user!.lastLoginAt,
      subscription: user!.subscription,
      stats: {
        totalApiKeys: user!._count.apiKeys,
        totalDownloads: user!._count.downloadLogs,
      },
    },
  });
}));

// Update user profile
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

// Delete account
router.delete('/account', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  await prisma.user.delete({
    where: { id: req.user!.id },
  });

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
}));

export { router as userRouter };
