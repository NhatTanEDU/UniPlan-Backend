#!/bin/bash

# UniPlan Backend - Railway Deployment Script
# This script forces Railway to use Dockerfile instead of Nixpacks

echo "🚀 DEPLOYING UNIPLAN BACKEND TO RAILWAY..."
echo "📋 Deployment Configuration:"
echo "   - Builder: DOCKERFILE (forced)"
echo "   - Node.js: 20+ (Alpine)"
echo "   - Start Command: node server.js"
echo "   - Health Check: /api/health"
echo ""

# Check if we're in the backend directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Must run from backend directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: server.js, Dockerfile, package.json"
    exit 1
fi

# Verify required files exist
echo "🔍 Checking required files..."
required_files=("Dockerfile" "package.json" "server.js" "railway.json")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ Missing: $file"
        exit 1
    fi
done

# Check if nixpacks.toml exists (should be removed)
if [ -f "nixpacks.toml" ]; then
    echo "   ⚠️  Warning: nixpacks.toml still exists - Railway might use Nixpacks"
    echo "   🗑️  Removing nixpacks.toml to force Dockerfile usage..."
    rm nixpacks.toml
    echo "   ✅ nixpacks.toml removed"
fi

echo ""
echo "📦 Railway Configuration:"
cat railway.json | grep -E "(builder|startCommand)" || echo "   ⚠️  Could not read railway.json"

echo ""
echo "🐳 Docker Configuration:"
echo "   - Base Image: node:20-alpine"
echo "   - Working Dir: /app"
echo "   - Port: 5000 (from ENV)"
echo "   - Health Check: /api/health"

echo ""
echo "🔧 Next Steps:"
echo "   1. Commit and push these changes to GitHub"
echo "   2. Railway will automatically detect Dockerfile"
echo "   3. Monitor deployment logs for success"
echo "   4. Test health endpoint: https://your-app.railway.app/api/health"
echo ""
echo "📝 Git Commands:"
echo "   git add ."
echo "   git commit -m \"🐳 Force Railway to use Dockerfile - Fix Nixpacks override\""
echo "   git push origin main"
echo ""
echo "✅ Deployment preparation complete!"
