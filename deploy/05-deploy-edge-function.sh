#!/bin/bash
# Deploy Edge Function to Supabase

set -e

echo "======================================="
echo "Deploying Edge Function to Supabase"
echo "======================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not installed"
    echo "Install with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if Edge Function file exists
if [ ! -f "supabase/functions/generate-full-record-documentation-pdf/index.ts" ]; then
    echo "❌ Edge Function not found"
    exit 1
fi

echo "✅ Edge Function file found"
echo ""

# Step 1: Extract PDF server URL from config
echo "📝 Configuration:"
if [ -f ".env.local" ]; then
    PDF_URL=$(grep "VITE_NODE_PDF_SERVER_URL" .env.local 2>/dev/null | cut -d '=' -f2 || echo "")
    if [ -z "$PDF_URL" ]; then
        echo "   NODE_PDF_SERVER_URL not in .env.local (this is expected for production)"
    else
        echo "   Using PDF Server: $PDF_URL"
    fi
else
    echo "   .env.local not found (this is expected)"
fi
echo ""

# Step 2: Set Edge Function environment variable
echo "🔧 Configuring Edge Function environment..."
echo ""
echo "⚠️  IMPORTANT:"
echo "   Before deploying, set NODE_PDF_SERVER_URL in Supabase:"
echo ""
echo "   Method 1: Via Supabase Dashboard"
echo "   1. Go to: Supabase > Project > Functions"
echo "   2. Click: generate-full-record-documentation-pdf"
echo "   3. Click: Settings ⚙️"
echo "   4. Add Secret:"
echo "       Name: NODE_PDF_SERVER_URL"
echo "       Value: https://your-pdf-server.com"
echo "   5. Save"
echo ""
echo "   Method 2: Via CLI"
echo "   supabase secrets set NODE_PDF_SERVER_URL=https://your-pdf-server.com"
echo ""

read -p "Press ENTER to continue deployment..."
echo ""

# Step 3: Deploy
echo "🚀 Deploying Edge Function..."
supabase functions deploy generate-full-record-documentation-pdf

echo ""
echo "======================================="
echo "✅ Edge Function Deployed!"
echo "======================================="
echo ""

# Step 4: Verify
echo "🔍 Getting function details..."
supabase functions list | grep generate-full-record-documentation-pdf || true
echo ""

echo "📝 Next steps:"
echo "   1. Verify environment variable is set:"
echo "      supabase secrets list"
echo ""
echo "   2. Test the function:"
echo "      supabase functions call generate-full-record-documentation-pdf \\"
echo "        --auth-token <YOUR_JWT_TOKEN> \\"
echo "        --data '{\"record_id\":\"test-id\"}'"
echo ""
echo "   3. Check logs in Supabase dashboard:"
echo "      Supabase > Project > Functions > Logs"
echo ""
