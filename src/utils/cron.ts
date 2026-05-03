import cron from 'node-cron';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient();

export function startCronJobs() {
  // Reset daily download counts at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Resetting daily download counts...');

    try {
      await prisma.subscription.updateMany({
        data: {
          downloadsUsed: 0,
        },
      });

      logger.info('Daily download counts reset successfully');
    } catch (error) {
      logger.error('Failed to reset download counts:', error);
    }
  });

  // Check for expired subscriptions daily
  cron.schedule('0 1 * * *', async () => {
    logger.info('Checking for expired subscriptions...');

    try {
      const now = new Date();

      const expired = await prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: {
            lt: now,
          },
        },
      });

      for (const sub of expired) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            tier: 'free',
            status: SubscriptionStatus.CANCELED,
            downloadLimit: 5,
            apiKeyLimit: 1,
            quality: '480p',
          },
        });

        logger.info(`Subscription expired for user ${sub.userId}, downgraded to free`);
      }

      logger.info(`Processed ${expired.length} expired subscriptions`);
    } catch (error) {
      logger.error('Failed to process expired subscriptions:', error);
    }
  });

  // Clean up old download logs (keep 30 days)
  cron.schedule('0 2 * * *', async () => {
    logger.info('Cleaning up old download logs...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.downloadLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      logger.info(`Deleted ${result.count} old download logs`);
    } catch (error) {
      logger.error('Failed to clean up download logs:', error);
    }
  });

  logger.info('Cron jobs started successfully');
}
