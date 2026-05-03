import { Router } from 'express';
import { PrismaClient, AuthProvider, UserRole } from '@prisma/client';
import { generateToken } from '../utils/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// GOOGLE OAUTH
// ============================================

router.post('/google', asyncHandler(async (req, res) => {
  const { accessToken, idToken } = req.body;

  if (!accessToken && !idToken) {
    return res.status(400).json({
      success: false,
      error: 'Access token or ID token is required',
      code: 'MISSING_TOKEN',
    });
  }

  try {
    // Verify with Google
    const googleResponse = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken || idToken}`
    );

    if (!googleResponse.ok) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Google token',
        code: 'INVALID_TOKEN',
      });
    }

    const googleData = await googleResponse.json();
    const email = googleData.email;
    const googleId = googleData.sub;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email not provided by Google',
        code: 'NO_EMAIL',
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: googleData.name || email.split('@')[0],
          avatar: googleData.picture,
          authProvider: AuthProvider.GOOGLE,
          providerId: googleId,
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

      logger.info(`New user registered via Google: ${email}`);
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    const token = await generateToken(user);

    res.json({
      success: true,
      message: 'Google login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
        token,
        isNewUser: !user.lastLoginAt,
      },
    });
  } catch (error: any) {
    logger.error('Google OAuth error:', error);
    throw new Error('Google authentication failed');
  }
}));

// ============================================
// GITHUB OAUTH
// ============================================

router.post('/github', asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'GitHub authorization code is required',
      code: 'MISSING_CODE',
    });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(401).json({
        success: false,
        error: tokenData.error_description || 'GitHub authentication failed',
        code: 'GITHUB_ERROR',
      });
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const githubUser = await userResponse.json();

    // Get primary email
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const emails = await emailResponse.json();
    const primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email;

    if (!primaryEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email not available from GitHub',
        code: 'NO_EMAIL',
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: primaryEmail,
          name: githubUser.name || githubUser.login,
          avatar: githubUser.avatar_url,
          authProvider: AuthProvider.GITHUB,
          providerId: githubUser.id.toString(),
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

      logger.info(`New user registered via GitHub: ${primaryEmail}`);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    const token = await generateToken(user);

    res.json({
      success: true,
      message: 'GitHub login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
        token,
        isNewUser: !user.lastLoginAt,
      },
    });
  } catch (error: any) {
    logger.error('GitHub OAuth error:', error);
    throw new Error('GitHub authentication failed');
  }
}));

export { router as oauthRouter };
