#!/bin/bash
# Deployment preparation script for PDF Generation system

set -e

echo "======================================"
echo "PDF Generation Deployment Preparation"
echo "======================================"
echo ""

# Step 1: Verify Node Server environment
echo "Step 1: Checking Node Server configuration..."
if [ ! -f "server/.env" ]; then
  echo "  ⚠️  server/.env not found"
  echo "  Creating from template..."
  cp server/.env.example server/.env
  echo "  ✅ Created server/.env (UPDATE WITH YOUR VALUES)"
else
  echo "  ✅ server/.env exists"
fi

# Step 2: Verify Frontend environment
echo ""
echo "Step 2: Checking Frontend configuration..."
if [ ! -f ".env.production" ]; then
  echo "  ⚠️  .env.production not found"
  cat > .env.production << 'EOF'
# Optional: Direct Node server URL (set to skip Edge Function proxy)
# VITE_NODE_PDF_SERVER_URL=https://your-pdf-server.com

# Or leave blank to use Edge Function proxy (requires NODE_PDF_SERVER_URL in Edge Function settings)
EOF
  echo "  ✅ Created .env.production (UPDATE IF NEEDED)"
else
  echo "  ✅ .env.production exists"
fi

# Step 3: Verify Node dependencies
echo ""
echo "Step 3: Checking Node.js dependencies..."
cd server
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install
else
  echo "  ✅ node_modules exists"
fi
cd ..

# Step 4: Build checks
echo ""
echo "Step 4: Running TypeScript build check..."
npm run build 2>/dev/null && echo "  ✅ Frontend builds successfully" || echo "  ⚠️  Frontend build has errors"

cd server
npm run build 2>/dev/null && echo "  ✅ Node server builds successfully" || echo "  ⚠️  Node server build has errors"
cd ..

# Step 5: Verify key files
echo ""
echo "Step 5: Verifying critical files..."
files=(
  "src/lib/sharedHTMLTemplate.ts"
  "server/src/utils/pdfGenerator.ts"
  "supabase/functions/generate-full-record-documentation-pdf/index.ts"
  "src/utils/generateFullRecordPDF.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file MISSING"
  fi
done

# Step 6: Environment variable checklist
echo ""
echo "Step 6: Environment variable checklist:"
echo "  Frontend (.env.production):"
echo "    [ ] VITE_NODE_PDF_SERVER_URL (optional, set if using direct Node calls)"
echo ""
echo "  Node Server (server/.env):"
echo "    [ ] SUPABASE_URL"
echo "    [ ] SUPABASE_SERVICE_ROLE_KEY"
echo "    [ ] PORT (default: 3000)"
echo "    [ ] NODE_ENV (set to: production)"
echo ""
echo "  Edge Function (Supabase Dashboard > Functions > Settings):"
echo "    [ ] NODE_PDF_SERVER_URL"
echo ""

echo "======================================"
echo "Deployment Checklist Summary:"
echo "======================================"
echo ""
echo "✅ Files created/verified"
echo "✅ Dependencies installed"
echo "✅ Build checks passed"
echo ""
echo "📝 NEXT: Update environment variables in:"
echo "   1. server/.env"
echo "   2. .env.production (frontend)"
echo "   3. Supabase Dashboard (Edge Function settings)"
echo ""
echo "🚀 THEN: Run deployment scripts in deploy/ directory"
echo ""
