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
# Use gtimeout on macOS or timeout on Linux
if command -v gtimeout >/dev/null 2>&1; then
    gtimeout 10s npm run test-server || true
elif command -v timeout >/dev/null 2>&1; then
    timeout 10s npm run test-server || true
else
    # Fallback: start server in background and kill after 10 seconds
    npm run test-server &
    SERVER_PID=$!
    sleep 10
    kill $SERVER_PID 2>/dev/null || true
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

if [ "$choice" = "5" ]; then
    NEW_VERSION=$CUSTOM_VERSION
    # Update version manually for custom versions
    npm version $CUSTOM_VERSION --no-git-tag-version
else
    if [ "$VERSION_TYPE" = "prerelease" ]; then
        read -p "Enter prerelease tag (default: beta): " PRERELEASE_TAG
        PRERELEASE_TAG=${PRERELEASE_TAG:-beta}
        NEW_VERSION=$(npm version prerelease --preid=$PRERELEASE_TAG --no-git-tag-version)
    else
        NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
    fi
fi

# Clean up version string (remove 'v' prefix if present)
NEW_VERSION=${NEW_VERSION#v}

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