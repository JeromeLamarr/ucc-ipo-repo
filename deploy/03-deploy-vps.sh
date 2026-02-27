#!/bin/bash
# Deploy Node.js PDF server to traditional VPS/Linux server

set -e

echo "======================================="
echo "Deploying PDF Server to VPS"
echo "======================================="
echo ""

# Configuration
VPS_USER="${VPS_USER:-ubuntu}"
VPS_HOST="${VPS_HOST:-your-server.com}"
VPS_PORT="${VPS_PORT:-22}"
SERVICE_NAME="pdf-generator"
APP_DIR="/opt/pdf-generator"

echo "🔧 VPS Configuration:"
echo "   Host: $VPS_HOST"
echo "   User: $VPS_USER"
echo "   App Dir: $APP_DIR"
echo ""

# Function to run command on VPS
ssh_run() {
    ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "$@"
}

# Step 1: Upload files
echo "📤 Uploading application files..."
scp -P "$VPS_PORT" -r server "$VPS_USER@$VPS_HOST:$APP_DIR"
echo "✅ Files uploaded"
echo ""

# Step 2: Setup Node.js
echo "🔧 Setting up Node.js environment..."
ssh_run "cd $APP_DIR && npm install --production"
echo "✅ Dependencies installed"
echo ""

# Step 3: Create .env
echo "📝 Creating .env file..."
echo "⚠️  IMPORTANT: SSH into the server and update $APP_DIR/.env with correct values:"
echo ""
ssh_run "cat > $APP_DIR/.env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com
EOF"
echo "✅ .env file created (edit on server)"
echo ""

# Step 4: Setup systemd service
echo "🔧 Setting up systemd service..."
ssh_run "sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << 'EOF'
[Unit]
Description=UCC IPO PDF Generator Service
After=network.target

[Service]
Type=simple
User=$VPS_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF"

ssh_run "sudo systemctl daemon-reload"
echo "✅ Systemd service created"
echo ""

# Step 5: Start service
echo "🚀 Starting service..."
ssh_run "sudo systemctl enable $SERVICE_NAME"
ssh_run "sudo systemctl start $SERVICE_NAME"
echo "✅ Service started"
echo ""

# Step 6: Verify
echo "🔍 Verifying deployment..."
sleep 2
ssh_run "sudo systemctl status $SERVICE_NAME"
echo ""

echo "======================================="
echo "✅ Deployment Complete!"
echo "======================================="
echo ""
echo "📋 Next steps:"
echo "   1. SSH into $VPS_HOST and verify:"
echo "      sudo systemctl status $SERVICE_NAME"
echo "      sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "   2. Update .env file on server:"
echo "      nano $APP_DIR/.env"
echo ""
echo "   3. Restart service:"
echo "      sudo systemctl restart $SERVICE_NAME"
echo ""
echo "   4. Test health endpoint:"
echo "      curl http://$VPS_HOST:3000/health"
echo ""
echo "   5. Update frontend configuration:"
echo "      VITE_NODE_PDF_SERVER_URL=http://$VPS_HOST:3000"
echo ""
echo "📝 Useful commands:"
echo "   View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "   Stop: sudo systemctl stop $SERVICE_NAME"
echo "   Restart: sudo systemctl restart $SERVICE_NAME"
echo "   Update: cd $APP_DIR && git pull && npm install --production && sudo systemctl restart $SERVICE_NAME"
echo ""
