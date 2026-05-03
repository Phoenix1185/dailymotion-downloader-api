#!/bin/bash

echo "🎬 DailyMotion Downloader API - Setup Script"
echo "=============================================="

# Check Node.js version
node_version=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $node_version"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "🗄️  Pushing schema to database..."
npx prisma db push

# Seed super admin
echo "👑 Seeding super admin..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your values"
echo "2. Run 'npm run dev' for development"
echo "3. Run 'npm run build && npm start' for production"
echo ""
echo "API Documentation: http://localhost:3000/"
