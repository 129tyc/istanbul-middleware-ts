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
