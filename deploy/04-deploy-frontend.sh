#!/bin/bash
# Deploy frontend application

set -e

echo "======================================="
echo "Deploying Frontend Application"
echo "======================================="
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found"
    echo "   Create it with:"
    echo "   VITE_NODE_PDF_SERVER_URL=https://your-pdf-server.com"
    exit 1
fi

echo "✅ .env.production exists"
echo ""

# Step 1: Build
echo "🔨 Building frontend..."
npm run build
echo "✅ Build complete"
echo ""

# Step 2: Verify build includes PDF server URL
if grep -q "VITE_NODE_PDF_SERVER_URL" .env.production; then
    PDF_URL=$(grep "VITE_NODE_PDF_SERVER_URL" .env.production | cut -d '=' -f2)
    echo "📝 Node PDF Server URL configured: $PDF_URL"
fi
echo ""

# Step 3: Deploy
echo "🚀 Deploying frontend..."
echo "   Choose your deployment method:"
echo "   1. npm run deploy (if configured in package.json)"
echo "   2. Vercel: vercel --prod"
echo "   3. Netlify: netlify deploy --prod"
echo "   4. Manual: Upload dist/ to your hosting"
echo ""

if grep -q '"deploy"' package.json; then
    echo "   Found deploy script in package.json"
    npm run deploy
else
    echo "   No deploy script found in package.json"
    echo "   Please deploy manually or configure a deploy script"
fi

echo ""
echo "======================================="
echo "✅ Frontend Deployment Complete!"
echo "======================================="
echo ""
