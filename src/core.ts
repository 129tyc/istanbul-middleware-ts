import * as libCoverage from "istanbul-lib-coverage";
import * as libReport from "istanbul-lib-report";
import * as reports from "istanbul-reports";
import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";
import {
  CoverageData,
  CoverageReportOptions,
  DownloadPackageCallback,
} from "./types";

declare global {
  var __coverage__: CoverageData;
}

/**
 * Get the global coverage object
 */
export function getCoverageObject(): CoverageData {
  global.__coverage__ = global.__coverage__ || {};
  return global.__coverage__;
}

/**
 * Reset coverage data to empty state
 */
export function resetCoverage(): void {
  global.__coverage__ = {};
}

/**
 * Merge client-side coverage data with server-side coverage
 */
export function mergeClientCoverage(obj: CoverageData): void {
  if (!obj) {
    return;
  }

  const coverage = getCoverageObject();
  const coverageMap = libCoverage.createCoverageMap(coverage);
  const newCoverageMap = libCoverage.createCoverageMap(obj);

  // Merge the coverage maps
  coverageMap.merge(newCoverageMap);

  // Update the global coverage object
  const merged = coverageMap.toJSON();
  Object.keys(merged).forEach((filePath: string) => {
    coverage[filePath] = merged[filePath];
  });
}

/**
 * Generate HTML coverage report
 */
export function generateCoverageReport(customOutputDir?: string): void {
  const coverage = getCoverageObject();

  if (!(coverage && Object.keys(coverage).length > 0)) {
    return; // No coverage data to generate report
  }

  try {
    const coverageMap = libCoverage.createCoverageMap(coverage);
    const outputDir = customOutputDir || path.join(process.cwd(), "output");

    // Clean and recreate output directory
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    // Create report context
    const context = libReport.createContext({
      dir: outputDir,
      defaultSummarizer: "pkg",
      coverageMap: coverageMap,
      watermarks: {
        statements: [50, 80],
        functions: [50, 80],
        branches: [50, 80],
        lines: [50, 80],
      },
    });

    // Create and execute HTML report
    const report = reports.create("html", {
      skipEmpty: false,
      skipFull: false,
    } as CoverageReportOptions);

    report.execute(context);
    console.log("Coverage report generated successfully in:", outputDir);
  } catch (err) {
    console.error("Error generating coverage report:", err);
  }
}

/**
 * Create a downloadable package with coverage data and HTML reports
 */
export function createDownloadPackage(
  callback: DownloadPackageCallback,
  customOutputDir?: string
): void {
  const coverageObject = getCoverageObject() || {};

  // Check if we have coverage data
  if (!coverageObject || Object.keys(coverageObject).length === 0) {
    return callback(new Error("No coverage data available"));
  }

  try {
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    const outputDir = customOutputDir || path.join(process.cwd(), "output");

    // Ensure HTML report is generated
    if (
      !fs.existsSync(outputDir) ||
      !fs.existsSync(path.join(outputDir, "index.html"))
    ) {
      console.log("Generating HTML report for download...");
      generateCoverageReport(customOutputDir);
    }

    // Add coverage.json to zip
    const coverageJson = JSON.stringify(coverageObject, null, 4);
    archive.append(coverageJson, { name: "coverage.json" });

    // Add entire HTML report directory
    archive.directory(outputDir, "html");

    // Finalize the archive
    archive.finalize();

    // Return the archive stream
    callback(null, archive);
  } catch (err) {
    callback(err as Error);
  }
}
