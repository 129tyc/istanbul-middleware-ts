#!/bin/bash

# Setup script for istanbul-middleware-ts release environment
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Istanbul Middleware TS Release Setup${NC}"
echo "========================================="

# Check npm login
echo -e "${YELLOW}📝 Checking npm login status...${NC}"
if npm whoami > /dev/null 2>&1; then
    NPM_USER=$(npm whoami)
    echo -e "${GREEN}✅ Logged in to npm as: $NPM_USER${NC}"
else
    echo -e "${RED}❌ Not logged in to npm${NC}"
    echo "Please run: npm login"
    exit 1
fi

# Check package name availability
echo -e "${YELLOW}📦 Checking package name availability...${NC}"
PACKAGE_NAME="istanbul-middleware-ts"

if npm view $PACKAGE_NAME > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Package '$PACKAGE_NAME' already exists${NC}"
    EXISTING_OWNER=$(npm owner ls $PACKAGE_NAME | head -n1 | awk '{print $1}')
    if [ "$EXISTING_OWNER" = "$NPM_USER" ]; then
        echo -e "${GREEN}✅ You are the owner of this package${NC}"
    else
        echo -e "${RED}❌ Package is owned by: $EXISTING_OWNER${NC}"
        echo "You need to:"
        echo "1. Change the package name in package.json"
        echo "2. Or contact the owner for access"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Package name '$PACKAGE_NAME' is available${NC}"
fi

# Check git repository
echo -e "${YELLOW}🔍 Checking git repository...${NC}"
if git remote get-url origin > /dev/null 2>&1; then
    REPO_URL=$(git remote get-url origin)
    echo -e "${GREEN}✅ Git remote origin: $REPO_URL${NC}"
else
    echo -e "${RED}❌ No git remote origin found${NC}"
    echo "Please add a git remote origin"
    exit 1
fi

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ]; then
    echo -e "${GREEN}✅ On main branch${NC}"
else
    echo -e "${YELLOW}⚠️  Not on main branch (current: $CURRENT_BRANCH)${NC}"
    echo "Releases should typically be done from main branch"
fi

# Check working directory status
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Working directory has uncommitted changes${NC}"
    git status --short
    echo "Consider committing changes before release"
else
    echo -e "${GREEN}✅ Working directory is clean${NC}"
fi

# Check if build works
echo -e "${YELLOW}🔨 Testing build process...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    echo "Please fix build errors before releasing"
    exit 1
fi

# Check package contents
echo -e "${YELLOW}📋 Checking package contents...${NC}"
npm pack --dry-run > /tmp/pack-output.txt 2>&1
PACKAGE_SIZE=$(grep "unpacked size:" /tmp/pack-output.txt | awk '{print $3 $4}')
FILE_COUNT=$(grep -E "^\d" /tmp/pack-output.txt | wc -l)

echo -e "${GREEN}✅ Package will contain $FILE_COUNT files ($PACKAGE_SIZE)${NC}"

# Show what will be published
echo -e "${YELLOW}📄 Files that will be published:${NC}"
npm pack --dry-run 2>/dev/null | grep -E "^\d" | head -10
if [ $FILE_COUNT -gt 10 ]; then
    echo "... and $((FILE_COUNT - 10)) more files"
fi

# GitHub Actions check
echo -e "${YELLOW}🔍 Checking GitHub Actions setup...${NC}"
if [ -f ".github/workflows/release.yml" ]; then
    echo -e "${GREEN}✅ Release workflow found${NC}"
else
    echo -e "${RED}❌ Release workflow not found${NC}"
    echo "Create .github/workflows/release.yml for automated releases"
fi

if [ -f ".github/workflows/ci.yml" ]; then
    echo -e "${GREEN}✅ CI workflow found${NC}"
else
    echo -e "${YELLOW}⚠️  CI workflow not found${NC}"
    echo "Consider creating .github/workflows/ci.yml for continuous integration"
fi

# Version check
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📋 Current version: $CURRENT_VERSION${NC}"

# Summary
echo ""
echo -e "${BLUE}📋 Setup Summary${NC}"
echo "=================="
echo -e "npm user: ${GREEN}$NPM_USER${NC}"
echo -e "Package name: ${GREEN}$PACKAGE_NAME${NC}"
echo -e "Current version: ${GREEN}$CURRENT_VERSION${NC}"
echo -e "Git branch: ${GREEN}$CURRENT_BRANCH${NC}"
echo -e "Package size: ${GREEN}$PACKAGE_SIZE${NC}"

echo ""
echo -e "${GREEN}🎉 Release environment setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run './scripts/release.sh' for interactive release"
echo "2. Or push a version tag to trigger automated release"
echo "3. Or use npm scripts: npm run release:patch"

# Cleanup
rm -f /tmp/pack-output.txt 