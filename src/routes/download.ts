import { Router } from 'express';
import { PrismaClient, DownloadStatus } from '@prisma/client';
import { authenticateToken, requireAuth, AuthenticatedRequest } from '../utils/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { dailyMotionService } from '../services/dailymotion';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Check subscription and usage
async function checkDownloadPermission(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return {
      allowed: false,
      reason: 'No subscription found',
    };
  }

  if (subscription.status === 'CANCELED' && subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
    return {
      allowed: false,
      reason: 'Subscription has expired. Please renew your plan.',
      upgradeUrl: '/api/v1/payments/plans',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayDownloads = await prisma.downloadLog.count({
    where: {
      userId,
      createdAt: { gte: today },
      status: { in: ['COMPLETED', 'PROCESSING'] },
    },
  });

  const limit = subscription.downloadLimit;

  if (limit !== -1 && todayDownloads >= limit) {
    return {
      allowed: false,
      reason: `Daily download limit reached (${todayDownloads}/${limit}). Upgrade your plan for more downloads.`,
      current: todayDownloads,
      limit,
      upgradeUrl: '/api/v1/payments/plans',
    };
  }

  return {
    allowed: true,
    subscription,
    todayDownloads,
    remaining: limit === -1 ? 'unlimited' : limit - todayDownloads,
  };
}

// Extract video info
router.post('/info', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Video URL is required',
    });
  }

  // Validate URL format
  if (!url.includes('dailymotion.com') && !url.includes('dai.ly')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL. Only DailyMotion URLs are supported.',
      examples: [
        'https://www.dailymotion.com/video/VIDEO_ID',
        'https://dai.ly/VIDEO_ID',
      ],
    });
  }

  try {
    const info = await dailyMotionService.getVideoInfo(url);

    // Log the request
    if (req.user) {
      await prisma.downloadLog.create({
        data: {
          userId: req.user.id,
          apiKeyId: req.apiKey?.id,
          videoUrl: url,
          videoId: info.id,
          title: info.title,
          duration: info.duration,
          status: DownloadStatus.COMPLETED,
          metadata: {
            type: 'info_request',
            formats: info.formats.length,
          },
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: info.id,
        title: info.title,
        description: info.description,
        duration: info.duration,
        thumbnail: info.thumbnail,
        uploader: info.uploader,
        uploadDate: info.uploadDate,
        viewCount: info.viewCount,
        webpageUrl: info.webpageUrl,
        formats: info.formats.map(f => ({
          formatId: f.formatId,
          ext: f.ext,
          resolution: f.resolution,
          quality: f.quality,
          filesize: f.filesize,
          filesizeApprox: f.filesizeApprox,
          hasVideo: f.hasVideo,
          hasAudio: f.hasAudio,
        })),
        bestFormat: info.bestFormat ? {
          formatId: info.bestFormat.formatId,
          ext: info.bestFormat.ext,
          resolution: info.bestFormat.resolution,
          quality: info.bestFormat.quality,
          filesize: info.bestFormat.filesize,
        } : null,
      },
    });
  } catch (error: any) {
    logger.error('Info extraction failed:', error);

    if (req.user) {
      await prisma.downloadLog.create({
        data: {
          userId: req.user.id,
          apiKeyId: req.apiKey?.id,
          videoUrl: url,
          videoId: 'unknown',
          status: DownloadStatus.FAILED,
          errorMessage: error.message,
        },
      });
    }

    throw error;
  }
}));

// Get download URL
router.post('/url', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { url, quality } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Video URL is required',
    });
  }

  // Check permissions for authenticated users
  if (req.user) {
    const permission = await checkDownloadPermission(req.user.id);

    if (!permission.allowed) {
      return res.status(403).json({
        success: false,
        error: permission.reason,
        ...(permission.upgradeUrl && { upgradeUrl: permission.upgradeUrl }),
        ...(permission.current !== undefined && {
          usage: {
            current: permission.current,
            limit: permission.limit,
            remaining: permission.remaining,
          },
        }),
      });
    }
  }

  try {
    const result = await dailyMotionService.getDownloadUrl(url, quality);

    // Log successful download
    if (req.user) {
      await prisma.downloadLog.create({
        data: {
          userId: req.user.id,
          apiKeyId: req.apiKey?.id,
          videoUrl: url,
          videoId: result.info.id,
          title: result.info.title,
          duration: result.info.duration,
          quality: result.format.quality,
          format: result.format.ext,
          status: DownloadStatus.COMPLETED,
          downloadUrl: result.url,
          metadata: {
            formatId: result.format.formatId,
            resolution: result.format.resolution,
            filesize: result.format.filesize,
          },
        },
      });

      // Update subscription usage
      await prisma.subscription.update({
        where: { userId: req.user.id },
        data: { downloadsUsed: { increment: 1 } },
      });
    }

    res.json({
      success: true,
      data: {
        video: {
          id: result.info.id,
          title: result.info.title,
          thumbnail: result.info.thumbnail,
          duration: result.info.duration,
        },
        download: {
          url: result.url,
          format: {
            formatId: result.format.formatId,
            ext: result.format.ext,
            resolution: result.format.resolution,
            quality: result.format.quality,
            filesize: result.format.filesize,
            filesizeApprox: result.format.filesizeApprox,
          },
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // URL expires in 1 hour
        },
        usage: req.user ? {
          message: 'Download counted against your daily limit',
        } : {
          message: 'Anonymous download - consider signing up for higher limits',
        },
      },
    });
  } catch (error: any) {
    logger.error('Download URL generation failed:', error);

    if (req.user) {
      await prisma.downloadLog.create({
        data: {
          userId: req.user.id,
          apiKeyId: req.apiKey?.id,
          videoUrl: url,
          videoId: 'unknown',
          status: DownloadStatus.FAILED,
          errorMessage: error.message,
        },
      });
    }

    throw error;
  }
}));

// Get download history
router.get('/history', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.downloadLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        videoUrl: true,
        videoId: true,
        title: true,
        duration: true,
        quality: true,
        format: true,
        status: true,
        errorMessage: true,
        fileSize: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.downloadLog.count({
      where: { userId: req.user!.id },
    }),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

// Get usage stats
router.get('/usage', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const userId = req.user!.id;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayDownloads, totalDownloads, last7Days] = await Promise.all([
    prisma.downloadLog.count({
      where: {
        userId,
        createdAt: { gte: today },
        status: { in: ['COMPLETED', 'PROCESSING'] },
      },
    }),
    prisma.downloadLog.count({
      where: {
        userId,
        status: { in: ['COMPLETED', 'PROCESSING'] },
      },
    }),
    prisma.downloadLog.groupBy({
      by: ['status'],
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      _count: { status: true },
    }),
  ]);

  const limit = subscription?.downloadLimit || 5;
  const remaining = limit === -1 ? 'unlimited' : Math.max(0, limit - todayDownloads);

  res.json({
    success: true,
    data: {
      subscription: {
        tier: subscription?.tier || 'free',
        status: subscription?.status || 'ACTIVE',
        downloadLimit: limit,
        quality: subscription?.quality || '480p',
        apiKeyLimit: subscription?.apiKeyLimit || 1,
        currentPeriodEnd: subscription?.currentPeriodEnd,
      },
      usage: {
        today: todayDownloads,
        total: totalDownloads,
        remaining,
        last7Days: last7Days.reduce((acc, curr) => {
          acc[curr.status] = curr._count.status;
          return acc;
        }, {} as Record<string, number>),
      },
    },
  });
}));

export { router as downloadRouter };
