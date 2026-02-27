#!/bin/bash
# Deploy Node.js PDF server using Docker

set -e

echo "======================================="
echo "Deploying PDF Server via Docker"
echo "======================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed"
    echo "Install from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Docker found"
echo ""

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo "❌ server/.env not found"
    echo "   Create it from server/.env.example and set your values"
    exit 1
fi

echo "🔧 Building Docker image..."
cd server
docker build -t ucc-ipo-pdf-generator:latest .
echo "✅ Docker image built"
echo ""

# Extract env vars for docker run
echo "📝 Reading environment variables..."
export $(cat .env | grep -v '^#' | xargs)

echo "🚀 Starting Docker container..."
echo "   Image: ucc-ipo-pdf-generator:latest"
echo "   Port: ${PORT:-3000}"
echo "   Environment: ${NODE_ENV:-production}"
echo ""

docker run -d \
  --name pdf-generator \
  -p ${PORT:-3000}:3000 \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e NODE_ENV="${NODE_ENV:-production}" \
  -e PORT=3000 \
  -e FRONTEND_URL="${FRONTEND_URL:-*}" \
  --restart unless-stopped \
  ucc-ipo-pdf-generator:latest

echo ""
echo "======================================="
echo "✅ Docker Container Started!"
echo "======================================="
echo ""
echo "📋 Container Info:"
docker ps | grep pdf-generator
echo ""

# Wait for health check
echo "⏳ Waiting for server to start..."
sleep 3

echo "🔍 Testing health endpoint..."
curl -s http://localhost:${PORT:-3000}/health | jq . || echo "  (Server may still be starting)"

echo ""
echo "📝 Next steps:"
echo "   1. Note your server URL (http://localhost:${PORT:-3000} or your deployed URL)"
echo "   2. Update VITE_NODE_PDF_SERVER_URL in frontend/.env.production"
echo "   3. Update NODE_PDF_SERVER_URL in Supabase Edge Function settings"
echo "   4. Redeploy frontend and Edge Function"
echo ""

echo "📝 Docker commands:"
echo "   View logs: docker logs pdf-generator -f"
echo "   Stop: docker stop pdf-generator"
echo "   Start: docker start pdf-generator"
echo "   Remove: docker rm pdf-generator"
echo ""
