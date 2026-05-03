import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DailyMotion Downloader API - Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f7fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 20px;
            text-align: center;
            margin-bottom: 40px;
        }
        header h1 { font-size: 2.5em; margin-bottom: 10px; }
        header p { font-size: 1.2em; opacity: 0.9; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            margin: 5px;
        }
        .badge-green { background: #10b981; color: white; }
        .badge-blue { background: #3b82f6; color: white; }
        .badge-purple { background: #8b5cf6; color: white; }
        .section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #1f2937;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }
        .endpoint {
            background: #f9fafb;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
        }
        .method {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.85em;
            margin-right: 10px;
        }
        .method-get { background: #dbeafe; color: #1e40af; }
        .method-post { background: #dcfce7; color: #166534; }
        .method-patch { background: #fef3c7; color: #92400e; }
        .method-delete { background: #fee2e2; color: #991b1b; }
        .url { font-family: monospace; font-size: 1.1em; color: #2563eb; }
        pre {
            background: #1f2937;
            color: #e5e7eb;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
        }
        code { font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9em; }
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .pricing-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .pricing-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .pricing-card.featured {
            border-color: #667eea;
            position: relative;
        }
        .pricing-card.featured::before {
            content: "POPULAR";
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: #667eea;
            color: white;
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 0.75em;
            font-weight: bold;
        }
        .price { font-size: 2.5em; font-weight: bold; color: #1f2937; margin: 15px 0; }
        .price span { font-size: 0.4em; color: #6b7280; }
        .features { list-style: none; text-align: left; margin: 20px 0; }
        .features li { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .features li::before { content: "✓"; color: #10b981; margin-right: 8px; font-weight: bold; }
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.2s;
        }
        .btn:hover { background: #5a67d8; }
        .env-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .env-table th, .env-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .env-table th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        .env-table code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.85em;
        }
        .required { color: #ef4444; font-weight: bold; }
        .optional { color: #6b7280; }
        footer {
            text-align: center;
            padding: 40px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            margin-top: 40px;
        }
        .toc {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .toc a {
            color: #667eea;
            text-decoration: none;
            display: block;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .toc a:hover { color: #5a67d8; }
        @media (max-width: 768px) {
            header h1 { font-size: 1.8em; }
            .pricing-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <header>
        <h1>🎬 DailyMotion Downloader API</h1>
        <p>Production-ready API for downloading DailyMotion videos with OAuth, API Keys & Paystack Payments</p>
        <div style="margin-top: 20px;">
            <span class="badge badge-green">v1.0.0</span>
            <span class="badge badge-blue">Node.js 18+</span>
            <span class="badge badge-purple">Open Source</span>
        </div>
    </header>

    <div class="container">
        <div class="toc">
            <h3>📑 Table of Contents</h3>
            <a href="#overview">Overview</a>
            <a href="#auth">Authentication</a>
            <a href="#endpoints">API Endpoints</a>
            <a href="#pricing">Pricing Plans</a>
            <a href="#payments">Payments (Paystack)</a>
            <a href="#env">Environment Variables</a>
            <a href="#deploy">Deployment</a>
            <a href="#examples">Code Examples</a>
        </div>

        <div class="section" id="overview">
            <h2>🚀 Overview</h2>
            <p>A complete REST API for extracting and downloading DailyMotion videos. Features include:</p>
            <ul style="margin: 15px 0 15px 20px;">
                <li><strong>OAuth 2.0</strong> - Google & GitHub login</li>
                <li><strong>API Key Management</strong> - Generate, revoke, and monitor API keys</li>
                <li><strong>Subscription Tiers</strong> - Free, Starter, Pro, and Enterprise plans</li>
                <li><strong>Paystack Integration</strong> - Nigerian Naira (NGN) payments</li>
                <li><strong>Rate Limiting</strong> - Configurable per-key limits</li>
                <li><strong>Download Analytics</strong> - Track usage and history</li>
                <li><strong>Admin Dashboard</strong> - Manage users and view stats</li>
            </ul>
            <p><strong>Base URL:</strong> <code>${baseUrl}/api/v1</code></p>
        </div>

        <div class="section" id="auth">
            <h2>🔐 Authentication</h2>
            <p>The API supports two authentication methods:</p>

            <h3 style="margin-top: 20px;">1. Bearer Token (JWT)</h3>
            <p>Used after login. Include in the Authorization header:</p>
            <pre><code>Authorization: Bearer &lt;your_jwt_token&gt;</code></pre>

            <h3 style="margin-top: 20px;">2. API Key</h3>
            <p>Used for programmatic access. Include in the X-API-Key header:</p>
            <pre><code>X-API-Key: dm_abc123xyz789</code></pre>

            <h3 style="margin-top: 20px;">Registration</h3>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/auth/register</span>
                <p style="margin-top: 10px;">Create a new account</p>
                <pre><code>{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}</code></pre>
            </div>

            <h3>Login</h3>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/auth/login</span>
                <pre><code>{
  "email": "user@example.com",
  "password": "securepassword123"
}</code></pre>
            </div>
        </div>

        <div class="section" id="endpoints">
            <h2>📡 API Endpoints</h2>

            <h3>Authentication</h3>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/auth/register</span> - Register new user
            </div>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/auth/login</span> - Login
            </div>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/auth/me</span> - Get current user
            </div>
            <div class="endpoint">
                <span class="method method-patch">PATCH</span>
                <span class="url">/api/v1/auth/profile</span> - Update profile
            </div>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/auth/change-password</span> - Change password
            </div>

            <h3 style="margin-top: 30px;">API Keys</h3>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/keys</span> - List API keys
            </div>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/keys</span> - Create new API key
            </div>
            <div class="endpoint">
                <span class="method method-delete">DELETE</span>
                <span class="url">/api/v1/keys/:id</span> - Revoke API key
            </div>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/keys/:id/regenerate</span> - Regenerate key
            </div>

            <h3 style="margin-top: 30px;">Downloads</h3>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/download/info</span> - Get video info
                <pre><code>// Request
{
  "url": "https://www.dailymotion.com/video/x8q3exq"
}

// Response
{
  "success": true,
  "data": {
    "id": "x8q3exq",
    "title": "Video Title",
    "duration": 120,
    "thumbnail": "https://...",
    "formats": [...]
  }
}</code></pre>
            </div>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/download/url</span> - Get download URL
                <pre><code>// Request
{
  "url": "https://www.dailymotion.com/video/x8q3exq",
  "quality": "720p" // optional
}

// Response
{
  "success": true,
  "data": {
    "video": { "id", "title", "thumbnail" },
    "download": {
      "url": "https://...",
      "format": { "resolution", "quality", "ext" },
      "expiresAt": "2024-01-01T00:00:00Z"
    }
  }
}</code></pre>
            </div>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/download/history</span> - Download history
            </div>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/download/usage</span> - Usage stats
            </div>

            <h3 style="margin-top: 30px;">Payments</h3>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/payments/plans</span> - List pricing plans
            </div>
            <div class="endpoint">
                <span class="method method-post">POST</span>
                <span class="url">/api/v1/payments/initialize</span> - Initialize payment
            </div>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/payments/verify?reference=xxx</span> - Verify payment
            </div>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/payments/history</span> - Payment history
            </div>

            <h3 style="margin-top: 30px;">Admin (Requires ADMIN/SUPER_ADMIN)</h3>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/admin/dashboard</span> - Dashboard stats
            </div>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/admin/users</span> - List all users
            </div>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/admin/users/:id</span> - User details
            </div>
            <div class="endpoint">
                <span class="method method-patch">PATCH</span>
                <span class="url">/api/v1/admin/users/:id</span> - Update user
            </div>
            <div class="endpoint">
                <span class="method method-delete">DELETE</span>
                <span class="url">/api/v1/admin/users/:id</span> - Delete user
            </div>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/admin/downloads</span> - All downloads
            </div>
            <div class="endpoint">
                <span class="method method-get">GET</span>
                <span class="url">/api/v1/admin/payments</span> - All payments
            </div>
        </div>

        <div class="section" id="pricing">
            <h2>💎 Pricing Plans</h2>
            <div class="pricing-grid">
                <div class="pricing-card">
                    <h3>Free</h3>
                    <div class="price">₦0<span>/month</span></div>
                    <ul class="features">
                        <li>5 downloads/day</li>
                        <li>480p quality</li>
                        <li>1 API key</li>
                        <li>Community support</li>
                    </ul>
                </div>
                <div class="pricing-card featured">
                    <h3>Starter</h3>
                    <div class="price">₦5,000<span>/month</span></div>
                    <ul class="features">
                        <li>50 downloads/day</li>
                        <li>720p quality</li>
                        <li>3 API keys</li>
                        <li>Email support</li>
                        <li>Analytics dashboard</li>
                    </ul>
                </div>
                <div class="pricing-card">
                    <h3>Pro</h3>
                    <div class="price">₦15,000<span>/month</span></div>
                    <ul class="features">
                        <li>200 downloads/day</li>
                        <li>1080p quality</li>
                        <li>10 API keys</li>
                        <li>Priority support</li>
                        <li>Advanced analytics</li>
                        <li>Webhook notifications</li>
                    </ul>
                </div>
                <div class="pricing-card">
                    <h3>Enterprise</h3>
                    <div class="price">₦50,000<span>/month</span></div>
                    <ul class="features">
                        <li>Unlimited downloads</li>
                        <li>4K quality</li>
                        <li>Unlimited API keys</li>
                        <li>24/7 dedicated support</li>
                        <li>Custom integrations</li>
                        <li>SLA guarantee</li>
                        <li>White-label option</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="section" id="payments">
            <h2>💳 Paystack Payments</h2>
            <p>Payments are processed securely via <strong>Paystack</strong> (supports cards, bank transfer, USSD, etc.).</p>

            <h3 style="margin-top: 20px;">Payment Flow</h3>
            <ol style="margin: 15px 0 15px 20px;">
                <li>Call <code>POST /api/v1/payments/initialize</code> with your desired plan</li>
                <li>Redirect user to the <code>authorizationUrl</code> from the response</li>
                <li>User completes payment on Paystack</li>
                <li>Paystack redirects back to your callback URL</li>
                <li>Call <code>GET /api/v1/payments/verify?reference=xxx</code> to confirm</li>
                <li>Subscription is automatically activated!</li>
            </ol>

            <h3>Webhook</h3>
            <p>Set your Paystack webhook URL to:</p>
            <pre><code>${baseUrl}/api/v1/payments/webhook</code></pre>
        </div>

        <div class="section" id="env">
            <h2>⚙️ Environment Variables</h2>
            <table class="env-table">
                <thead>
                    <tr>
                        <th>Variable</th>
                        <th>Required</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>DATABASE_URL</code></td>
                        <td class="required">YES</td>
                        <td>Neon PostgreSQL connection string</td>
                    </tr>
                    <tr>
                        <td><code>JWT_SECRET</code></td>
                        <td class="required">YES</td>
                        <td>Secret for signing JWT tokens (64+ chars)</td>
                    </tr>
                    <tr>
                        <td><code>NODE_ENV</code></td>
                        <td class="required">YES</td>
                        <td>production or development</td>
                    </tr>
                    <tr>
                        <td><code>PORT</code></td>
                        <td class="optional">No</td>
                        <td>Server port (default: 3000)</td>
                    </tr>
                    <tr>
                        <td><code>API_BASE_URL</code></td>
                        <td class="required">YES</td>
                        <td>Your deployed URL (Railway/Koyeb)</td>
                    </tr>
                    <tr>
                        <td><code>SUPER_ADMIN_EMAIL</code></td>
                        <td class="required">YES</td>
                        <td>Email for super admin account</td>
                    </tr>
                    <tr>
                        <td><code>GOOGLE_CLIENT_ID</code></td>
                        <td class="optional">No</td>
                        <td>Google OAuth client ID</td>
                    </tr>
                    <tr>
                        <td><code>GOOGLE_CLIENT_SECRET</code></td>
                        <td class="optional">No</td>
                        <td>Google OAuth client secret</td>
                    </tr>
                    <tr>
                        <td><code>GITHUB_CLIENT_ID</code></td>
                        <td class="optional">No</td>
                        <td>GitHub OAuth app ID</td>
                    </tr>
                    <tr>
                        <td><code>GITHUB_CLIENT_SECRET</code></td>
                        <td class="optional">No</td>
                        <td>GitHub OAuth app secret</td>
                    </tr>
                    <tr>
                        <td><code>PAYSTACK_SECRET_KEY</code></td>
                        <td class="optional">No</td>
                        <td>Paystack secret key (for payments)</td>
                    </tr>
                    <tr>
                        <td><code>PAYSTACK_PUBLIC_KEY</code></td>
                        <td class="optional">No</td>
                        <td>Paystack public key (for frontend)</td>
                    </tr>
                    <tr>
                        <td><code>RATE_LIMIT_WINDOW_MS</code></td>
                        <td class="optional">No</td>
                        <td>Rate limit window (default: 15 min)</td>
                    </tr>
                    <tr>
                        <td><code>RATE_LIMIT_MAX_REQUESTS</code></td>
                        <td class="optional">No</td>
                        <td>Max requests per window (default: 100)</td>
                    </tr>
                    <tr>
                        <td><code>YTDLP_PATH</code></td>
                        <td class="optional">No</td>
                        <td>Path to yt-dlp binary</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section" id="deploy">
            <h2>🚀 Deployment</h2>

            <h3>Railway</h3>
            <pre><code># 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add environment variables in Railway dashboard
#    (Settings > Variables)

# 5. Deploy
railway up

# 6. Add custom domain (optional)
railway domain</code></pre>

            <h3 style="margin-top: 20px;">Koyeb</h3>
            <pre><code># 1. Install Koyeb CLI
# https://www.koyeb.com/docs/quickstart

# 2. Login
koyeb login

# 3. Create app
koyeb app create dailymotion-api

# 4. Deploy
koyeb service create   --app dailymotion-api   --git github.com/yourusername/dailymotion-downloader-api   --git-branch main   --ports 3000:http   --env PORT=3000   --env NODE_ENV=production</code></pre>

            <h3 style="margin-top: 20px;">Docker (Optional)</h3>
            <pre><code>docker build -t dailymotion-api .
docker run -p 3000:3000 --env-file .env dailymotion-api</code></pre>
        </div>

        <div class="section" id="examples">
            <h2>💻 Code Examples</h2>

            <h3>cURL - Get Video Info</h3>
            <pre><code>curl -X POST ${baseUrl}/api/v1/download/info \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"url": "https://www.dailymotion.com/video/x8q3exq"}'</code></pre>

            <h3 style="margin-top: 20px;">JavaScript/Node.js</h3>
            <pre><code>const response = await fetch('${baseUrl}/api/v1/download/url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'dm_your_api_key_here'
  },
  body: JSON.stringify({
    url: 'https://www.dailymotion.com/video/x8q3exq',
    quality: '720p'
  })
});

const data = await response.json();
console.log(data.data.download.url);</code></pre>

            <h3 style="margin-top: 20px;">Python</h3>
            <pre><code>import requests

headers = {
    'X-API-Key': 'dm_your_api_key_here',
    'Content-Type': 'application/json'
}

response = requests.post(
    '${baseUrl}/api/v1/download/info',
    headers=headers,
    json={'url': 'https://www.dailymotion.com/video/x8q3exq'}
)

data = response.json()
print(data['data']['title'])</code></pre>
        </div>
    </div>

    <footer>
        <p>DailyMotion Downloader API &copy; 2026 | Built with ❤️ by Phoenix</p>
        <p>Open Source under MIT License</p>
    </footer>
</body>
</html>`);
});

export { router as docsRouter };
