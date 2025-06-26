# Development Guide

Complete guide for developing, testing, and releasing `istanbul-middleware-ts`.

## 🧪 Testing

### Quick Commands

```bash
npm test                 # All tests
npm run test:coverage    # With coverage report
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:watch       # Watch mode
```

### Test Structure

```
tests/
├── setup.ts              # Test configuration
├── unit/                 # Unit tests
│   ├── core.test.ts      # Core functions
│   └── handlers.test.ts  # HTTP handlers
└── integration/          # End-to-end tests
    └── server.test.ts    # Full server tests
```

### Running Examples

```bash
npm run test-server                    # Basic server
OUTPUT_DIR=/tmp npm run test-server    # Custom output
DIFF_TARGET=main npm run test-server   # With diff coverage
```

## 🚀 Release Process

### Quick Release (Recommended)

```bash
# Interactive release script
./scripts/release.sh

# Or use npm scripts
npm run release:patch   # 1.0.0 → 1.0.1 (bug fixes)
npm run release:minor   # 1.0.0 → 1.1.0 (new features)
npm run release:major   # 1.0.0 → 2.0.0 (breaking changes)
npm run release:beta    # 1.0.0 → 1.0.1-beta.0 (pre-release)
```

### Manual Release

```bash
# Create and push tag (triggers automated release)
git tag v1.0.0
git push origin v1.0.0
```

### Release Checklist

- [ ] All tests pass (`npm test`)
- [ ] Code built successfully (`npm run build`)
- [ ] Version follows [semantic versioning](https://semver.org/)
- [ ] Release notes will be auto-generated from git commits

## ⚙️ GitHub Actions Setup

### Required Secrets

1. Create npm token at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. Add to GitHub: **Settings** → **Secrets** → **Actions**
   - Name: `NPM_TOKEN`
   - Value: your-token-here

### Workflows

- **CI** (`ci.yml`): Tests on push/PR (Node 18, 20, 21)
- **Release** (`release.yml`): Publishes on tag push
- **Version Bump** (`version-bump.yml`): Manual version management

### Workflow Triggers

```bash
# Automatic: Push to main triggers CI
git push origin main

# Manual: Run version bump via GitHub Actions UI
# Repository → Actions → Version Bump → Run workflow

# Tag: Create tag triggers release
git tag v1.0.0 && git push origin v1.0.0
```

## 🛠️ Development

### Setup

```bash
git clone <repo>
cd istanbul-middleware-ts
npm install
npm run build
```

### Development Workflow

```bash
npm run dev          # Watch mode compilation
npm run test:watch   # Watch mode testing
npm run clean        # Clean build artifacts
```

### Code Quality

```bash
npm run build        # TypeScript compilation
npm test            # All tests
npm audit           # Security audit
npm run check       # Package validation
```

## 🐛 Troubleshooting

### Common Issues

**Build Fails**

```bash
npm run clean && npm install
npx tsc --noEmit  # Check TypeScript errors
```

**Tests Fail**

```bash
# Clear test cache
npm test -- --clearCache

# Run specific test
npm test -- --testNamePattern="specific test"
```

**Release Fails**

```bash
npm whoami          # Check npm login
npm view istanbul-middleware-ts  # Check package status
```

**GitHub Actions Fails**

- Check `NPM_TOKEN` in repository secrets
- Review Actions logs for specific errors
- Ensure workflow permissions are enabled

### Emergency Rollback

```bash
# Unpublish (within 24 hours only)
npm unpublish istanbul-middleware-ts@1.0.1

# Or deprecate version
npm deprecate istanbul-middleware-ts@1.0.1 "Version deprecated"
```

## 📁 Project Structure

```
├── src/                 # Source code
│   ├── core.ts         # Coverage functions
│   ├── handlers.ts     # HTTP handlers
│   ├── types.ts        # TypeScript types
│   └── index.ts        # Main exports
├── tests/              # Test files
├── examples/           # Usage examples
├── scripts/            # Release scripts
└── .github/workflows/  # CI/CD workflows
```

## 🔗 Resources

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
