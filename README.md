# Istanbul Middleware TypeScript

A TypeScript middleware for Istanbul code coverage reporting. This library provides HTTP endpoints for coverage data collection, reporting, and downloading.

> **Note**: This is a TypeScript rewrite inspired by and compatible with [istanbul-middleware](https://github.com/gotwarlost/istanbul-middleware), providing the same API with enhanced TypeScript support and modern Node.js features.

## Features

- ✨ **TypeScript Support** - Full TypeScript support with type definitions
- 📊 **Coverage Collection** - Collect and merge coverage data from multiple sources
- 📈 **HTML Reports** - Generate beautiful HTML coverage reports
- 📦 **Download Packages** - Download complete coverage packages as ZIP files
- 🔄 **Reset Functionality** - Reset coverage data as needed
- 🌐 **Express Integration** - Easy integration with Express.js applications

## Installation

```bash
npm install istanbul-middleware-ts
```

## Quick Start

```typescript
import express from "express";
import { createHandler } from "istanbul-middleware-ts";

const app = express();

// Add Istanbul middleware
app.use(
  "/coverage",
  createHandler({
    resetOnGet: true, // Allow GET requests to reset coverage
  })
);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("Coverage available at http://localhost:3000/coverage");
});
```

## API Endpoints

Once the middleware is set up, the following endpoints will be available:

### GET /object

Returns the current coverage object as JSON.

### POST /reset

Resets the coverage data to empty state.

### GET /reset

Resets the coverage data (only if `resetOnGet` option is enabled).

### POST /merge

Merges client-side coverage data with server-side coverage. Send coverage data in the request body.

### GET /download

Downloads a ZIP package containing:

- `coverage.json` - Raw coverage data
- `html/` - Complete HTML coverage report

### GET /lcov

Downloads the coverage report in LCOV format.

### GET /diff

Shows differential coverage report comparing against a target branch/commit. Requires `enableDiffCoverage: true` and `diff_cover` to be installed.

### GET /diff/info

Returns git diff information including changed files and diff summary.

## Core Functions

### getCoverageObject()

```typescript
import { getCoverageObject } from "istanbul-middleware-ts";

const coverage = getCoverageObject();
console.log("Current coverage:", coverage);
```

### resetCoverage()

```typescript
import { resetCoverage } from "istanbul-middleware-ts";

resetCoverage();
console.log("Coverage data reset");
```

### mergeClientCoverage(data)

```typescript
import { mergeClientCoverage } from "istanbul-middleware-ts";

// Merge coverage data from client
mergeClientCoverage(clientCoverageData);
```

### generateCoverageReport(outputDir?)

```typescript
import { generateCoverageReport } from "istanbul-middleware-ts";

// Generate HTML report in ./output directory
generateCoverageReport();

// Generate HTML report in custom directory
generateCoverageReport("/tmp/my-reports");
```

### createDownloadPackage(callback, outputDir?)

```typescript
import { createDownloadPackage } from "istanbul-middleware-ts";

createDownloadPackage((err, archive) => {
  if (err) {
    console.error("Error creating package:", err);
    return;
  }

  // archive is a readable stream
  archive.pipe(response);
});

// Use custom output directory
createDownloadPackage((err, archive) => {
  // Handle response
}, "/tmp/my-reports");
```

## Configuration Options

```typescript
interface HandlerOptions {
  resetOnGet?: boolean; // Allow GET requests to reset coverage (default: false)
  outputDir?: string; // Custom output directory for reports (default: ./output)
  diffTarget?: string; // Git diff target (branch/commit/tag) or diff file path - if set, enables differential coverage
  diffCoverCommand?: string; // Custom diff-cover command path (default: "diff-cover")
}
```

### Custom Output Directory

You can specify a custom directory for coverage reports:

```typescript
import { createHandler } from "istanbul-middleware-ts";

app.use(
  "/coverage",
  createHandler({
    resetOnGet: true,
    outputDir: "/tmp/my-coverage-reports", // Custom output directory
  })
);
```

The output directory will be used for:

- HTML coverage reports
- Static file serving
- Download packages

### Using with Environment Variables

For the test server, you can set the output directory via environment variable:

```bash
# Use custom output directory
OUTPUT_DIR=/tmp/coverage npm run test-server

# Use default output directory
npm run test-server
```

### Differential Coverage

Enable differential coverage by setting a diffTarget (branch, commit, tag, or diff file):

```typescript
import { createHandler } from "istanbul-middleware-ts";

// createHandler is now async for validation
async function setupCoverage() {
  const coverageHandler = await createHandler({
    resetOnGet: true,
    diffTarget: "main", // Compare against main branch - this enables differential coverage
  });

  app.use("/coverage", coverageHandler);
}

setupCoverage();
```

**Prerequisites for differential coverage:**

1. Install `diff_cover`: `pip install diff_cover`
2. Ensure you're in a git repository
3. Have some changes compared to the target branch

**Custom diff-cover command path:**

If you need to use a custom path for the `diff-cover` command (e.g., using virtual environments, conda, or custom installations):

```typescript
async function setupCoverage() {
  const coverageHandler = await createHandler({
    diffTarget: "main",
    diffCoverCommand: "/path/to/venv/bin/diff-cover", // Custom command path
  });
  app.use("/coverage", coverageHandler);
}

// Or using conda environment
async function setupWithConda() {
  const coverageHandler = await createHandler({
    diffTarget: "main",
    diffCoverCommand: "conda run -n myenv diff-cover", // Using conda
  });
  app.use("/coverage", coverageHandler);
}

// Or using pipx
async function setupWithPipx() {
  const coverageHandler = await createHandler({
    diffTarget: "main",
    diffCoverCommand: "pipx run diff-cover", // Using pipx
  });
  app.use("/coverage", coverageHandler);
}
```

**Environment variables for test server:**

```bash
# Enable differential coverage with git branch
DIFF_TARGET=main npm run test-server

# Enable differential coverage with diff file
DIFF_TARGET=/path/to/changes.diff npm run test-server

# Custom output directory with diff coverage
OUTPUT_DIR=/tmp/coverage DIFF_TARGET=develop npm run test-server
```

**Available endpoints:**

- `/coverage/diff` - View differential coverage HTML report
- `/coverage/diff/info` - Get git diff information
- `/coverage/lcov` - Download LCOV format report

**Using differential coverage:**

```bash
# View differential coverage report
curl "http://localhost:3000/coverage/diff"

# Get diff information
curl "http://localhost:3000/coverage/diff/info"
```

**Configuration:**

The diff target is configured when starting the server, not in individual requests:

```typescript
// Git branch/commit/tag
async function setupWithGitRef() {
  const handler = await createHandler({
    diffTarget: "main", // Git branch/commit/tag - enables differential coverage
  });
  app.use("/coverage", handler);
}

// Or use a diff file
async function setupWithDiffFile() {
  const handler = await createHandler({
    diffTarget: "/path/to/changes.diff", // Pre-existing diff file - enables differential coverage
  });
  app.use("/coverage", handler);
}
```

**Diff file support:**

- The system automatically detects if `diffTarget` is a file path by checking file existence
- Diff files must exist on the server (cannot be uploaded via HTTP)
- Diff files should be in standard git diff format
- Supports both relative and absolute file paths

## TypeScript Types

The library exports comprehensive TypeScript types:

```typescript
import {
  CoverageData,
  CoverageReportOptions,
  ReportContext,
  DownloadPackageCallback,
  HandlerOptions,
} from "istanbul-middleware-ts";
```

## Example Integration

```typescript
import express from "express";
import {
  createHandler,
  getCoverageObject,
  generateCoverageReport,
} from "istanbul-middleware-ts";

const app = express();

// Add coverage middleware
app.use("/coverage", createHandler());

// Custom endpoint to check coverage
app.get("/api/coverage-status", (req, res) => {
  const coverage = getCoverageObject();
  const hasData = Object.keys(coverage).length > 0;

  res.json({
    hasCoverage: hasData,
    fileCount: Object.keys(coverage).length,
  });
});

// Generate report programmatically
app.post("/api/generate-report", (req, res) => {
  try {
    generateCoverageReport();
    res.json({ success: true, message: "Report generated" });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(3000);
```

## License

BSD-3-Clause

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
