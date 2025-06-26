# Istanbul Middleware TypeScript

A comprehensive TypeScript web service for Istanbul code coverage management with differential coverage analysis.

> **Note**: Enhanced version of [istanbul-middleware](https://github.com/gotwarlost/istanbul-middleware) with TypeScript support and advanced features.

## Features

- 🌐 **Web Service** - HTTP API for coverage data management
- 📊 **Istanbul Integration** - Native support for Istanbul/Babel coverage data
- ✨ **TypeScript Support** - Full TypeScript support with type definitions
- 📈 **Multiple Report Formats** - HTML, LCOV, and JSON reports
- 🔄 **Differential Coverage** - Compare coverage against git branches/commits
- 📦 **Download Packages** - ZIP packages with complete reports
- 📁 **Smart Caching** - Intelligent caching for better performance

## Installation

```bash
npm install istanbul-middleware-ts
```

## Quick Start

```typescript
import express from "express";
import { createHandler } from "istanbul-middleware-ts";

const app = express();

// Basic setup
app.use("/coverage", await createHandler());

// With differential coverage
app.use(
  "/coverage",
  await createHandler({
    diffTarget: "main", // Compare against main branch
    resetOnGet: true,
  })
);

app.listen(3000);
```

## API Endpoints

### Core Endpoints

- `GET /object` - Get coverage data as JSON
- `POST /merge` - Merge new coverage data
- `POST /reset` - Reset coverage data

### Reports

- `GET /download` - Download ZIP package
- `GET /lcov` - Download LCOV report
- `GET /` - View HTML report

### Differential Coverage (requires `diffTarget`)

- `GET /diff` - Differential coverage HTML report
- `GET /diff/info` - Git diff information

## Configuration

```typescript
interface HandlerOptions {
  resetOnGet?: boolean; // Allow GET /reset
  outputDir?: string; // Output directory (default: ./output)
  diffTarget?: string; // Git branch/commit/tag or diff file
  diffCoverCommand?: string; // Custom diff-cover command
}
```

## Differential Coverage Setup

1. Install Python package:

   ```bash
   pip install diff_cover
   ```

2. Configure target:
   ```typescript
   await createHandler({
     diffTarget: "main", // Git branch
     // diffTarget: "abc123",      // Git commit
     // diffTarget: "v1.0.0",      // Git tag
     // diffTarget: "/path/to.diff" // Diff file
   });
   ```

## Examples

```bash
# Basic server
npm run test-server

# With custom output
OUTPUT_DIR=/tmp/coverage npm run test-server

# With differential coverage
DIFF_TARGET=main npm run test-server
```

## Core Functions

```typescript
import {
  getCoverageObject,
  resetCoverage,
  mergeClientCoverage,
  generateCoverageReport,
} from "istanbul-middleware-ts";

// Get current coverage
const coverage = getCoverageObject();

// Reset coverage
resetCoverage();

// Merge coverage data
mergeClientCoverage(coverageData);

// Generate HTML report
generateCoverageReport("./output");
```

## License

BSD-3-Clause
