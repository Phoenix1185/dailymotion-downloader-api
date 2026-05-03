# 🎬 DailyMotion Downloader API

A production-ready REST API for downloading DailyMotion videos with OAuth authentication, API key management, subscription tiers, and Paystack payment integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue)](https://neon.tech/)

## ✨ Features

- 🔐 **OAuth 2.0** - Google & GitHub login support
- 🔑 **API Key Management** - Generate, revoke, and monitor API keys
- 💎 **Subscription Tiers** - Free, Starter (₦5k), Pro (₦15k), Enterprise (₦50k)
- 💳 **Paystack Payments** - Secure NGN payments with cards, bank transfer, USSD
- 📊 **Analytics Dashboard** - Track downloads and usage
- 🛡️ **Rate Limiting** - Configurable per-key limits
- 👑 **Admin Panel** - Manage users, view stats, monitor payments
- 📚 **Auto Documentation** - Built-in docs page at root `/`

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (Neon recommended)
- Paystack account (for payments)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dailymotion-downloader-api.git
cd dailymotion-downloader-api

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed super admin
npm run db:seed

# Start development server
npm run dev
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| GET | `/api/v1/auth/me` | Get current user |
| PATCH | `/api/v1/auth/profile` | Update profile |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/keys` | List API keys |
| POST | `/api/v1/keys` | Create new API key |
| DELETE | `/api/v1/keys/:id` | Revoke API key |

### Downloads
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/download/info` | Get video info |
| POST | `/api/v1/download/url` | Get download URL |
| GET | `/api/v1/download/history` | Download history |
| GET | `/api/v1/download/usage` | Usage stats |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/payments/plans` | List pricing plans |
| POST | `/api/v1/payments/initialize` | Initialize payment |
| GET | `/api/v1/payments/verify` | Verify payment |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/dashboard` | Dashboard stats |
| GET | `/api/v1/admin/users` | List all users |
| GET | `/api/v1/admin/downloads` | All downloads |
| GET | `/api/v1/admin/payments` | All payments |

## 💎 Pricing Plans

| Plan | Price | Downloads | Quality | API Keys |
|------|-------|-----------|---------|----------|
| Free | ₦0 | 5/day | 480p | 1 |
| Starter | ₦5,000/mo | 50/day | 720p | 3 |
| Pro | ₦15,000/mo | 200/day | 1080p | 10 |
| Enterprise | ₦50,000/mo | Unlimited | 4K | Unlimited |

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for JWT signing (64+ chars) |
| `NODE_ENV` | ✅ | production or development |
| `API_BASE_URL` | ✅ | Your deployed URL |
| `SUPER_ADMIN_EMAIL` | ✅ | Super admin email |
| `PAYSTACK_SECRET_KEY` | ❌ | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | ❌ | Paystack public key |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | ❌ | GitHub OAuth app ID |
| `GITHUB_CLIENT_SECRET` | ❌ | GitHub OAuth app secret |

## 🚂 Deployment

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Koyeb
```bash
# Install Koyeb CLI
# https://www.koyeb.com/docs/quickstart

koyeb login
koyeb app create dailymotion-api
koyeb service create   --app dailymotion-api   --git github.com/yourusername/repo   --git-branch main   --ports 3000:http
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👤 Author

**Phoenix** - [@CryptoPhoenixz](https://twitter.com/CryptoPhoenixz)

---

Built with ❤️ for the community
