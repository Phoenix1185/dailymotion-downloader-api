import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authenticateToken, requireAuth, requireRole } from '../utils/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Middleware - Admin only
router.use(authenticateToken, requireAuth, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN));

// Dashboard stats
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalDownloads,
    totalApiKeys,
    totalRevenue,
    recentUsers,
    recentDownloads,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.downloadLog.count(),
    prisma.apiKey.count(),
    prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.downloadLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        videoId: true,
        title: true,
        status: true,
        createdAt: true,
        user: {
          select: { email: true },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalDownloads,
        totalApiKeys,
        totalRevenue: totalRevenue._sum.amount 
          ? `₦${(totalRevenue._sum.amount / 100).toLocaleString()}` 
          : '₦0',
      },
      recentUsers,
      recentDownloads,
    },
  });
}));

// List all users
router.get('/users', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search as string;

  const where = search ? {
    OR: [
      { email: { contains: search, mode: 'insensitive' as const } },
      { name: { contains: search, mode: 'insensitive' as const } },
    ],
  } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        subscription: {
          select: {
            tier: true,
            status: true,
            downloadLimit: true,
          },
        },
        _count: {
          select: {
            apiKeys: true,
            downloadLogs: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

// Get user details
router.get('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      apiKeys: {
        select: {
          id: true,
          name: true,
          isActive: true,
          usageCount: true,
          createdAt: true,
        },
      },
      downloadLogs: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          videoId: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
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
    data: user,
  });
}));

// Update user role/status
router.patch('/users/:id', asyncHandler(async (req: any, res) => {
  const { id } = req.params;
  const { role, isActive } = req.body;

  // Prevent self-demotion for super admin
  if (id === req.user!.id && role && role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Cannot change your own role',
    });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  logger.info(`Admin ${req.user!.email} updated user ${user.email}`);

  res.json({
    success: true,
    message: 'User updated',
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
}));

// Delete user
router.delete('/users/:id', asyncHandler(async (req: any, res) => {
  const { id } = req.params;

  if (id === req.user!.id) {
    return res.status(403).json({
      success: false,
      error: 'Cannot delete your own account',
    });
  }

  await prisma.user.delete({
    where: { id },
  });

  logger.info(`Admin ${req.user!.email} deleted user ${id}`);

  res.json({
    success: true,
    message: 'User deleted',
  });
}));

// Get all downloads
router.get('/downloads', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [downloads, total] = await Promise.all([
    prisma.downloadLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    }),
    prisma.downloadLog.count(),
  ]);

  res.json({
    success: true,
    data: downloads,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

// Get all payments
router.get('/payments', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    }),
    prisma.payment.count(),
  ]);

  res.json({
    success: true,
    data: payments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

// System health check
router.get('/health', asyncHandler(async (req, res) => {
  const dbStatus = await prisma.$queryRaw`SELECT 1`.then(() => 'connected').catch(() => 'disconnected');

  res.json({
    success: true,
    data: {
      database: dbStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
  });
}));

export { router as adminRouter };
