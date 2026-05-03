import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAuth } from '../utils/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Generate new API key
router.post('/', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const { name } = req.body;
  const userId = req.user!.id;

  // Check subscription limits
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const currentKeyCount = await prisma.apiKey.count({
    where: { userId, isActive: true },
  });

  const keyLimit = subscription?.apiKeyLimit || 1;

  if (keyLimit !== -1 && currentKeyCount >= keyLimit) {
    return res.status(403).json({
      success: false,
      error: `API key limit reached (${keyLimit}). Upgrade your plan to create more keys.`,
      current: currentKeyCount,
      limit: keyLimit,
      upgradeUrl: '/api/v1/payments/plans',
    });
  }

  const apiKey = `dm_${uuidv4().replace(/-/g, '')}`;

  const key = await prisma.apiKey.create({
    data: {
      name: name || 'Default Key',
      key: apiKey,
      userId,
      rateLimit: subscription?.downloadLimit || 100,
    },
  });

  logger.info(`API key created for user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'API key created successfully',
    data: {
      id: key.id,
      name: key.name,
      key: key.key, // Only shown once!
      rateLimit: key.rateLimit,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    },
    warning: 'This key will only be shown once. Save it securely!',
  });
}));

// List all API keys
router.get('/', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      key: true,
      isActive: true,
      usageCount: true,
      lastUsedAt: true,
      rateLimit: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  res.json({
    success: true,
    data: keys,
    count: keys.length,
  });
}));

// Revoke API key
router.delete('/:id', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const { id } = req.params;

  const key = await prisma.apiKey.findFirst({
    where: { id, userId: req.user!.id },
  });

  if (!key) {
    return res.status(404).json({
      success: false,
      error: 'API key not found',
    });
  }

  await prisma.apiKey.update({
    where: { id },
    data: { isActive: false },
  });

  logger.info(`API key ${id} revoked`);

  res.json({
    success: true,
    message: 'API key revoked successfully',
  });
}));

// Regenerate API key
router.post('/:id/regenerate', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const { id } = req.params;

  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: req.user!.id },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'API key not found',
    });
  }

  const newKey = `dm_${uuidv4().replace(/-/g, '')}`;

  await prisma.apiKey.update({
    where: { id },
    data: {
      key: newKey,
      usageCount: 0,
      lastUsedAt: null,
    },
  });

  res.json({
    success: true,
    message: 'API key regenerated',
    data: {
      id: existing.id,
      name: existing.name,
      key: newKey,
      warning: 'This key will only be shown once. Save it securely!',
    },
  });
}));

export { router as apiKeyRouter };
