#!/bin/bash
# Deploy Node.js PDF server to Vercel

set -e

echo "======================================="
echo "Deploying PDF Server to Vercel"
echo "======================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not installed"
    echo "Install with: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Navigate to server directory
cd server

echo "🔧 Preparing for Vercel deployment..."
echo ""

# Check environment variables
echo "📋 Checking environment variables..."
if [ ! -f ".env" ]; then
    echo "❌ server/.env not found"
    echo "   Create it from server/.env.example and set your values"
    exit 1
fi

# List required env vars
echo "   Required variables in server/.env:"
echo "   ✓ SUPABASE_URL"
echo "   ✓ SUPABASE_SERVICE_ROLE_KEY"
echo "   ✓ NODE_ENV=production"
echo "   ✓ PORT (will be set by Vercel)"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel (production)..."
vercel --prod

echo ""
echo "======================================="
echo "✅ Deployment Complete!"
echo "======================================="
echo ""
echo "📝 Next steps:"
echo "   1. Note the deployment URL"
echo "   2. Update VITE_NODE_PDF_SERVER_URL in frontend/.env.production"
echo "   3. Update NODE_PDF_SERVER_URL in Supabase Edge Function settings"
echo "   4. Redeploy frontend and Edge Function"
echo ""
echo "🔍 Verify deployment:"
echo "   curl <your-vercel-url>/health"
echo ""
