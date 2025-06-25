# Release Guide

Quick guide for publishing `istanbul-middleware-ts` to npm.

## 🚀 Quick Release

### Method 1: Interactive Script (Recommended)

```bash
# Check environment and release interactively
./scripts/setup-release.sh
./scripts/release.sh
```

### Method 2: GitHub Actions

1. Go to **Actions** → **Version Bump** workflow
2. Click **Run workflow**
3. Select version type (patch/minor/major/prerelease)

### Method 3: npm Scripts

```bash
npm run release:patch   # 1.0.0 → 1.0.1 (bug fixes)
npm run release:minor   # 1.0.0 → 1.1.0 (new features)
npm run release:major   # 1.0.0 → 2.0.0 (breaking changes)
npm run release:beta    # 1.0.0 → 1.0.1-beta.0 (pre-release)
```

### Method 4: Manual Tag

```bash
git tag v1.0.0
git push origin v1.0.0  # Triggers automated release
```

## 📝 Release Checklist

### Before Release

- [ ] Code merged to `main` branch
- [ ] All tests pass (`npm run build`)
- [ ] Version follows [semantic versioning](https://semver.org/)

### After Release

- [ ] Verify package: `npm view istanbul-middleware-ts`
- [ ] Test installation: `npm install istanbul-middleware-ts`
- [ ] Check [GitHub Release](https://github.com/129tyc/istanbul-middleware-ts/releases)

## 🔍 Version Strategy

- **PATCH** (1.0.0 → 1.0.1): Bug fixes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **PRERELEASE** (1.0.0-beta.0): Pre-release versions

## 🛠️ Troubleshooting

### Common Issues

**npm publish fails:**

```bash
npm whoami  # Check login
npm view istanbul-middleware-ts  # Check if exists
```

**Build fails:**

```bash
npm run build  # Test locally
npx tsc --noEmit  # Check types
```

**GitHub Actions fails:**

- Check `NPM_TOKEN` secret in repository settings
- Review Actions logs for specific errors

### Emergency Rollback

```bash
# Unpublish (within 24 hours only)
npm unpublish istanbul-middleware-ts@1.0.1

# Or deprecate
npm deprecate istanbul-middleware-ts@1.0.1 "Version deprecated"
```

## 📚 Resources

- [Setup Guide](./WORKFLOW_SETUP.md) - Detailed configuration
- [npm Publishing](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
