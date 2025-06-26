/**
 * Istanbul Middleware TypeScript
 *
 * A TypeScript middleware for Istanbul code coverage reporting.
 * Provides HTTP endpoints for coverage data collection, reporting, and downloading.
 */

// Export core functionality
export {
  getCoverageObject,
  resetCoverage,
  mergeClientCoverage,
  generateCoverageReport,
  createDownloadPackage,
} from "./core";

// Export handlers
export { createHandler } from "./handlers";

// Export types
export { CoverageData, DownloadPackageCallback, HandlerOptions } from "./types";
