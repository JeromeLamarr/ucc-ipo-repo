#!/bin/bash
# Master deployment orchestrator

set -e

echo "======================================="
echo "PDF Generation System - Master Deployer"
echo "======================================="
echo ""

# Function to print menu
show_menu() {
    echo "Choose deployment path:"
    echo "1) Full deployment (all components)"
    echo "2) Node Server only"
    echo "3) Frontend only"
    echo "4) Edge Function only"
    echo "5) Verify deployment"
    echo "0) Exit"
}

# Function to verify deployment
verify_deployment() {
    echo ""
    echo "======================================="
    echo "Verifying Deployment"
    echo "======================================="
    echo ""
    
    READ_TIMEOUT=5
    
    # Check Node Server
    echo "🔍 Checking Node Server health..."
    if command -v curl &> /dev/null; then
        if [ -z "$PDF_SERVER_URL" ]; then
            PDF_SERVER_URL="http://localhost:3000"
        fi
        
        if timeout $READ_TIMEOUT curl -s "$PDF_SERVER_URL/health" > /dev/null 2>&1; then
            echo "   ✅ Node Server responding at $PDF_SERVER_URL"
            timeout $READ_TIMEOUT curl -s "$PDF_SERVER_URL/health" | jq . 2>/dev/null || true
        else
            echo "   ⚠️  Node Server not responding at $PDF_SERVER_URL"
            echo "   (It may not be running yet)"
        fi
    fi
    echo ""
    
    # Check files
    echo "📋 Checking critical files..."
    [ -f "src/lib/sharedHTMLTemplate.ts" ] && echo "   ✅ Shared HTML Template" || echo "   ❌ Shared HTML Template"
    [ -f "server/src/utils/pdfGenerator.ts" ] && echo "   ✅ PDF Generator" || echo "   ❌ PDF Generator"
    [ -f "supabase/functions/generate-full-record-documentation-pdf/index.ts" ] && echo "   ✅ Edge Function" || echo "   ❌ Edge Function"
    [ -f ".env.production" ] && echo "   ✅ Frontend .env.production" || echo "   ⚠️  Frontend .env.production"
    [ -f "server/.env" ] && echo "   ✅ Node Server .env" || echo "   ⚠️  Node Server .env"
    echo ""
}

# Main menu loop
while true; do
    show_menu
    read -p "Select option (0-5): " choice
    
    case $choice in
        1)
            echo ""
            echo "🚀 Starting full deployment..."
            echo "   This will deploy all components in sequence"
            echo ""
            read -p "Continue? (y/n) " confirm
            if [ "$confirm" = "y" ]; then
                bash deploy/02-deploy-docker.sh  # or choose another method
                bash deploy/04-deploy-frontend.sh
                bash deploy/05-deploy-edge-function.sh
                verify_deployment
            fi
            ;;
        2)
            echo ""
            echo "Deployment method for Node Server:"
            echo "a) Vercel (recommended)"
            echo "b) Docker"
            echo "c) Traditional VPS"
            read -p "Choose (a/b/c): " method
            case $method in
                a) bash deploy/01-deploy-vercel.sh ;;
                b) bash deploy/02-deploy-docker.sh ;;
                c) bash deploy/03-deploy-vps.sh ;;
                *) echo "Invalid option" ;;
            esac
            ;;
        3)
            bash deploy/04-deploy-frontend.sh
            ;;
        4)
            bash deploy/05-deploy-edge-function.sh
            ;;
        5)
            verify_deployment
            ;;
        0)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
    
    echo ""
    read -p "Press ENTER to continue..."
done
