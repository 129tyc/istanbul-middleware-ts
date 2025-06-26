#!/bin/bash

# Release script for istanbul-middleware-ts
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Istanbul Middleware TS Release Script${NC}"
echo "======================================="

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: Must be on main branch to release${NC}"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Error: Working directory is not clean${NC}"
    git status --short
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin main

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm run build
npm test --if-present

# Test server
echo -e "${YELLOW}🌐 Testing server...${NC}"

# Function to cleanup server processes
cleanup_server() {
    echo "Cleaning up server processes..."
    # Kill any node processes running test-server
    pkill -f "node test/server.js" 2>/dev/null || true
    pkill -f "test-server" 2>/dev/null || true
    # Free up port 3000 if it's occupied
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
}

# Cleanup any existing server processes first
cleanup_server

# Use gtimeout on macOS or timeout on Linux
if command -v gtimeout >/dev/null 2>&1; then
    gtimeout 10s npm run test-server || true
elif command -v timeout >/dev/null 2>&1; then
    timeout 10s npm run test-server || true
else
    # Fallback: start server in background and kill after 10 seconds
    echo "Starting server in background..."
    
    # Start server in background (macOS compatible)
    # Use nohup for better process isolation on macOS
    nohup npm run test-server > /tmp/test-server.log 2>&1 &
    SERVER_PID=$!
    echo "Server started with PID: $SERVER_PID"
    
    # Wait for server to start
    sleep 3
    
    # Test if server is responding
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Server is responding"
    else
        echo "⚠️ Server may not be responding, but continuing..."
    fi
    
    sleep 7
    echo "Stopping server..."
    
    # Kill the server process and its children
    if kill -0 $SERVER_PID 2>/dev/null; then
        # First try graceful termination
        kill -TERM $SERVER_PID 2>/dev/null || true
        sleep 2
        # Force kill if still running
        if kill -0 $SERVER_PID 2>/dev/null; then
            kill -KILL $SERVER_PID 2>/dev/null || true
        fi
        echo "Server process terminated"
    else
        echo "Server already stopped"
    fi
    
    # Clean up log file
    rm -f /tmp/test-server.log
    
    # Final cleanup
    cleanup_server
    echo "Server test completed"
fi

# Check package
echo -e "${YELLOW}📋 Checking package contents...${NC}"
npm pack --dry-run

# Version selection
echo ""
echo "Select version bump type:"
echo "1) patch (1.0.0 -> 1.0.1)"
echo "2) minor (1.0.0 -> 1.1.0)"
echo "3) major (1.0.0 -> 2.0.0)"
echo "4) prerelease (1.0.0 -> 1.0.1-beta.0)"
echo "5) custom"

read -p "Enter choice (1-5): " choice

case $choice in
    1)
        VERSION_TYPE="patch"
        ;;
    2)
        VERSION_TYPE="minor"
        ;;
    3)
        VERSION_TYPE="major"
        ;;
    4)
        VERSION_TYPE="prerelease"
        ;;
    5)
        read -p "Enter custom version: " CUSTOM_VERSION
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Bump version
echo -e "${YELLOW}🔢 Bumping version...${NC}"

# First, run build to ensure everything is ready
npm run build

# Calculate new version
CURRENT_VERSION=$(node -p "require('./package.json').version")

if [ "$choice" = "5" ]; then
    NEW_VERSION=$CUSTOM_VERSION
else
    if [ "$VERSION_TYPE" = "prerelease" ]; then
        read -p "Enter prerelease tag (default: beta): " PRERELEASE_TAG
        PRERELEASE_TAG=${PRERELEASE_TAG:-beta}
        # Calculate prerelease version manually to avoid script execution
        NEW_VERSION=$(node -e "
            const semver = require('semver');
            const current = '$CURRENT_VERSION';
            if (semver.prerelease(current)) {
                console.log(semver.inc(current, 'prerelease', '$PRERELEASE_TAG'));
            } else {
                console.log(semver.inc(current, 'prerelease', '$PRERELEASE_TAG'));
            }
        " 2>/dev/null || echo "${CURRENT_VERSION}-${PRERELEASE_TAG}.0")
    else
        # Use node to calculate version increment
        NEW_VERSION=$(node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const version = pkg.version.split('.');
            let major = parseInt(version[0]);
            let minor = parseInt(version[1]);
            let patch = parseInt(version[2]);
            
            if ('$VERSION_TYPE' === 'major') {
                major++;
                minor = 0;
                patch = 0;
            } else if ('$VERSION_TYPE' === 'minor') {
                minor++;
                patch = 0;
            } else if ('$VERSION_TYPE' === 'patch') {
                patch++;
            }
            
            console.log(\`\${major}.\${minor}.\${patch}\`);
        ")
    fi
fi

# Update package.json manually to avoid running scripts
node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update package-lock.json if it exists
if [ -f "package-lock.json" ]; then
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
        pkg.version = '$NEW_VERSION';
        if (pkg.packages && pkg.packages['']) {
            pkg.packages[''].version = '$NEW_VERSION';
        }
        fs.writeFileSync('package-lock.json', JSON.stringify(pkg, null, 2) + '\n');
    "
fi

echo -e "${GREEN}✅ Version bumped to: $NEW_VERSION${NC}"

# Confirm release
echo ""
read -p "Proceed with release? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${YELLOW}⏹️ Release cancelled${NC}"
    exit 0
fi

# Create and push tag
TAG="v${NEW_VERSION#v}"
echo -e "${YELLOW}🏷️ Creating tag: $TAG${NC}"

git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"
git tag $TAG

echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push origin main
git push origin $TAG

echo ""
echo -e "${GREEN}🎉 Release completed successfully!${NC}"
echo -e "${BLUE}📦 Tag $TAG has been created and pushed${NC}"
echo -e "${BLUE}🚀 GitHub Actions will automatically publish to npm${NC}"
echo ""
echo "You can monitor the release at:"
echo "https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions" 