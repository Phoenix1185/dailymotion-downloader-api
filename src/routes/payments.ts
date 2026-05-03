import { Router } from 'express';
import { PrismaClient, PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { authenticateToken, requireAuth } from '../utils/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { paystackService, PRICING_TIERS } from '../services/paystack';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Get pricing plans
router.get('/plans', asyncHandler(async (req, res) => {
  const tiers = PRICING_TIERS.map(tier => ({
    ...tier,
    priceFormatted: `₦${tier.price.toLocaleString()}`,
    paystackEnabled: paystackService.isConfigured() && tier.price > 0,
  }));

  res.json({
    success: true,
    data: tiers,
    currency: 'NGN',
    paymentProvider: paystackService.isConfigured() ? 'paystack' : null,
    publicKey: paystackService.getPublicKey(),
  });
}));

// Initialize payment
router.post('/initialize', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const { planId } = req.body;
  const user = req.user!;

  if (!paystackService.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Payment processing is not configured. Please contact support.',
    });
  }

  const plan = PRICING_TIERS.find(p => p.id === planId);
  if (!plan) {
    return res.status(400).json({
      success: false,
      error: 'Invalid plan ID',
      availablePlans: PRICING_TIERS.map(p => p.id),
    });
  }

  if (plan.price === 0) {
    // Free plan - just update subscription
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tier: plan.id,
        downloadLimit: plan.downloadLimit,
        apiKeyLimit: plan.apiKeys,
        quality: plan.quality,
      },
      update: {
        tier: plan.id,
        status: SubscriptionStatus.ACTIVE,
        downloadLimit: plan.downloadLimit,
        apiKeyLimit: plan.apiKeys,
        quality: plan.quality,
        currentPeriodEnd: null,
      },
    });

    return res.json({
      success: true,
      message: `Subscribed to ${plan.name} plan`,
      data: { plan, activated: true },
    });
  }

  // Create or get Paystack customer
  let subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  let customerCode = subscription?.paystackCustomerCode;

  if (!customerCode) {
    try {
      const customer = await paystackService.createCustomer(
        user.email,
        user.name?.split(' ')[0],
        user.name?.split(' ').slice(1).join(' ')
      );
      customerCode = customer.data.customer_code;
    } catch (error: any) {
      logger.error('Paystack customer creation failed:', error);
    }
  }

  // Create payment record
  const reference = `dm_${Date.now()}_${user.id.slice(0, 8)}`;

  await prisma.payment.create({
    data: {
      userId: user.id,
      amount: plan.price * 100, // Convert to kobo
      currency: 'NGN',
      status: PaymentStatus.PENDING,
      paystackReference: reference,
      metadata: {
        planId: plan.id,
        planName: plan.name,
        customerCode,
      },
    },
  });

  // Initialize Paystack transaction
  const transaction = await paystackService.initializeTransaction({
    amount: plan.price * 100,
    email: user.email,
    reference,
    metadata: {
      userId: user.id,
      planId: plan.id,
      customerCode,
    },
  });

  res.json({
    success: true,
    message: 'Payment initialized',
    data: {
      authorizationUrl: transaction.data.authorization_url,
      reference: transaction.data.reference,
      accessCode: transaction.data.access_code,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        priceFormatted: `₦${plan.price.toLocaleString()}`,
      },
    },
  });
}));

// Verify payment (webhook + manual)
router.get('/verify', asyncHandler(async (req, res) => {
  const { reference } = req.query;

  if (!reference || typeof reference !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Reference is required',
    });
  }

  const payment = await prisma.payment.findUnique({
    where: { paystackReference: reference },
  });

  if (!payment) {
    return res.status(404).json({
      success: false,
      error: 'Payment not found',
    });
  }

  try {
    const verification = await paystackService.verifyTransaction(reference);
    const status = verification.data.status;

    if (status === 'success') {
      const metadata = verification.data.metadata || payment.metadata || {};
      const planId = metadata.planId;
      const plan = PRICING_TIERS.find(p => p.id === planId);

      if (plan) {
        // Update subscription
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await prisma.subscription.upsert({
          where: { userId: payment.userId },
          create: {
            userId: payment.userId,
            tier: plan.id,
            status: SubscriptionStatus.ACTIVE,
            downloadLimit: plan.downloadLimit,
            apiKeyLimit: plan.apiKeys,
            quality: plan.quality,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            paystackCustomerCode: metadata.customerCode,
          },
          update: {
            tier: plan.id,
            status: SubscriptionStatus.ACTIVE,
            downloadLimit: plan.downloadLimit,
            apiKeyLimit: plan.apiKeys,
            quality: plan.quality,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            paystackCustomerCode: metadata.customerCode || undefined,
          },
        });
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          paystackTransactionId: verification.data.id?.toString(),
          paystackAuthorizationCode: verification.data.authorization?.authorization_code,
        },
      });

      return res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          status: 'success',
          amount: verification.data.amount / 100,
          currency: verification.data.currency,
          plan: plan?.name,
          paidAt: verification.data.paid_at,
        },
      });
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: status === 'abandoned' ? PaymentStatus.ABANDONED : PaymentStatus.FAILED,
        },
      });

      return res.json({
        success: false,
        error: `Payment ${status}`,
        data: { status, gatewayResponse: verification.data.gateway_response },
      });
    }
  } catch (error: any) {
    logger.error('Payment verification failed:', error);
    throw new Error('Failed to verify payment. Please contact support.');
  }
}));

// Paystack webhook
router.post('/webhook', asyncHandler(async (req, res) => {
  // Verify webhook signature
  const hash = req.headers['x-paystack-signature'];

  // In production, verify the signature against your secret
  // const secret = process.env.PAYSTACK_SECRET_KEY;
  // const expectedHash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  // if (hash !== expectedHash) return res.status(401).send();

  const event = req.body;
  logger.info('Paystack webhook received:', event.event);

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;

    const payment = await prisma.payment.findUnique({
      where: { paystackReference: reference },
    });

    if (payment && payment.status !== PaymentStatus.SUCCESS) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          paystackTransactionId: event.data.id?.toString(),
          paystackAuthorizationCode: event.data.authorization?.authorization_code,
        },
      });

      // Update subscription if metadata contains plan info
      if (metadata?.planId) {
        const plan = PRICING_TIERS.find(p => p.id === metadata.planId);
        if (plan) {
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          await prisma.subscription.upsert({
            where: { userId: payment.userId },
            create: {
              userId: payment.userId,
              tier: plan.id,
              status: SubscriptionStatus.ACTIVE,
              downloadLimit: plan.downloadLimit,
              apiKeyLimit: plan.apiKeys,
              quality: plan.quality,
              currentPeriodEnd: periodEnd,
            },
            update: {
              tier: plan.id,
              status: SubscriptionStatus.ACTIVE,
              downloadLimit: plan.downloadLimit,
              apiKeyLimit: plan.apiKeys,
              quality: plan.quality,
              currentPeriodEnd: periodEnd,
            },
          });
        }
      }
    }
  }

  res.sendStatus(200);
}));

// Get payment history
router.get('/history', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const payments = await prisma.payment.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      paystackReference: true,
      metadata: true,
      createdAt: true,
    },
  });

  res.json({
    success: true,
    data: payments.map(p => ({
      ...p,
      amountFormatted: `₦${(p.amount / 100).toLocaleString()}`,
    })),
  });
}));

// Cancel subscription
router.post('/cancel', authenticateToken, requireAuth, asyncHandler(async (req: any, res) => {
  const userId = req.user!.id;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || subscription.tier === 'free') {
    return res.status(400).json({
      success: false,
      error: 'No active paid subscription to cancel',
    });
  }

  // Cancel on Paystack if subscription exists
  if (subscription.paystackSubscriptionCode) {
    try {
      // Note: You'd need the email token to cancel, which should be stored
      // This is a simplified version
      logger.info(`Canceling Paystack subscription: ${subscription.paystackSubscriptionCode}`);
    } catch (error) {
      logger.error('Failed to cancel Paystack subscription:', error);
    }
  }

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: SubscriptionStatus.CANCELED,
      canceledAt: new Date(),
    },
  });

  res.json({
    success: true,
    message: 'Subscription canceled. You will keep access until the end of your billing period.',
    data: {
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
  });
}));

export { router as paymentRouter };
