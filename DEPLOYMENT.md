# 🚀 Deployment Guide

## DailyMotion Downloader API - Production Deployment

### Prerequisites

- Node.js 18+ installed
- Git repository
- Paystack account (for payments)
- Neon PostgreSQL database

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in ALL required values:

```bash
cp .env.example .env
```

**Required variables:**
- ✅ `DATABASE_URL` - Your Neon connection string (already filled)
- ✅ `JWT_SECRET` - Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- ✅ `API_BASE_URL` - Your Railway/Koyeb URL
- ✅ `SUPER_ADMIN_EMAIL` - fredokcee1@gmail.com (already set)
- ✅ `PAYSTACK_SECRET_KEY` - From Paystack Dashboard
- ✅ `PAYSTACK_PUBLIC_KEY` - From Paystack Dashboard

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed super admin
npm run db:seed
```

### 3. Paystack Configuration

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to Settings → API Keys & Webhooks
3. Copy Test Secret Key and Test Public Key
4. Add to environment variables
5. Set webhook URL: `https://your-domain.com/api/v1/payments/webhook`

---

## 🚂 Railway Deployment

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login

```bash
railway login
```

### Step 3: Initialize Project

```bash
# Navigate to project directory
cd dailymotion-downloader-api

# Initialize Railway project
railway init
# Select "Create a New Project"
# Name it: dailymotion-downloader-api
```

### Step 4: Add Environment Variables

```bash
# Add variables one by one
railway variables set DATABASE_URL="your_neon_connection_string"
railway variables set JWT_SECRET="your_generated_secret"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"
railway variables set API_BASE_URL="https://your-app-name.up.railway.app"
railway variables set SUPER_ADMIN_EMAIL="fredokcee1@gmail.com"
railway variables set PAYSTACK_SECRET_KEY="sk_test_..."
railway variables set PAYSTACK_PUBLIC_KEY="pk_test_..."
```

### Step 5: Deploy

```bash
railway up
```

### Step 6: Add Custom Domain (Optional)

```bash
railway domain
```

### Step 7: View Logs

```bash
railway logs
```

---

## 🌐 Koyeb Deployment

### Step 1: Install Koyeb CLI

Follow instructions at [Koyeb Docs](https://www.koyeb.com/docs/quickstart)

### Step 2: Login

```bash
koyeb login
```

### Step 3: Create App

```bash
koyeb app create dailymotion-api
```

### Step 4: Deploy with Git

```bash
koyeb service create   --app dailymotion-api   --git github.com/yourusername/dailymotion-downloader-api   --git-branch main   --ports 3000:http   --env PORT=3000   --env NODE_ENV=production   --env DATABASE_URL=your_neon_connection_string   --env JWT_SECRET=your_generated_secret   --env API_BASE_URL=https://your-app-name.koyeb.app   --env SUPER_ADMIN_EMAIL=fredokcee1@gmail.com
```

### Step 5: Add Paystack Variables

```bash
koyeb service update dailymotion-api/dailymotion-api   --env "PAYSTACK_SECRET_KEY=sk_test_..."   --env "PAYSTACK_PUBLIC_KEY=pk_test_..."
```

---

## 🐳 Docker Deployment (Alternative)

### Build and Run

```bash
# Build image
docker build -t dailymotion-api .

# Run container
docker run -p 3000:3000   -e DATABASE_URL=your_neon_connection_string   -e JWT_SECRET=your_generated_secret   -e NODE_ENV=production   -e API_BASE_URL=http://localhost:3000   -e SUPER_ADMIN_EMAIL=fredokcee1@gmail.com   dailymotion-api
```

---

## ✅ Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-03T10:50:00.000Z",
  "version": "1.0.0"
}
```

### 2. Documentation Page

Visit: `https://your-domain.com/`

Should show full API documentation.

### 3. Test Authentication

```bash
# Register
curl -X POST https://your-domain.com/api/v1/auth/register   -H "Content-Type: application/json"   -d '{"email":"test@example.com","password":"password123","name":"Test"}'

# Login
curl -X POST https://your-domain.com/api/v1/auth/login   -H "Content-Type: application/json"   -d '{"email":"test@example.com","password":"password123"}'
```

### 4. Test Download

```bash
curl -X POST https://your-domain.com/api/v1/download/info   -H "Authorization: Bearer YOUR_JWT_TOKEN"   -H "Content-Type: application/json"   -d '{"url":"https://www.dailymotion.com/video/x8q3exq"}'
```

---

## 🔒 Security Checklist

- [ ] JWT_SECRET is 64+ characters and random
- [ ] Paystack keys are from LIVE environment (not test)
- [ ] API_BASE_URL uses HTTPS
- [ ] Rate limiting is enabled
- [ ] Helmet security headers are active
- [ ] CORS is configured for production
- [ ] Database SSL is enabled
- [ ] Super admin password is changed from default

---

## 📞 Support

- Email: fredokcee1@gmail.com
- Twitter: @CryptoPhoenixz
- Issues: GitHub Issues

---

Built with ❤️ by Phoenix
