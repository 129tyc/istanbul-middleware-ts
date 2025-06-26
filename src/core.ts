import * as libCoverage from "istanbul-lib-coverage";
import * as libReport from "istanbul-lib-report";
import * as reports from "istanbul-reports";
import * as fs from "fs";
import * as path from "path";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import archiver from "archiver";
import {
  CoverageData,
  DownloadPackageCallback,
  DiffCoverageOptions,
} from "./types";

const execAsync = promisify(exec);
import { HtmlOptions } from "istanbul-reports";

/**
 * Modern coverage storage class to replace global variables
 */
class CoverageStore {
  private static instance: CoverageStore;
  private coverageData: CoverageData = {};

  private constructor() {}

  static getInstance(): CoverageStore {
    if (!CoverageStore.instance) {
      CoverageStore.instance = new CoverageStore();
    }
    return CoverageStore.instance;
  }

  getCoverage(): CoverageData {
    return this.coverageData;
  }

  setCoverage(data: CoverageData): void {
    this.coverageData = data;
  }

  resetCoverage(): void {
    this.coverageData = {};
  }

  mergeCoverage(newData: CoverageData): void {
    if (!newData) {
      return;
    }

    const coverageMap = libCoverage.createCoverageMap(this.coverageData);
    const newCoverageMap = libCoverage.createCoverageMap(newData);

    // Merge the coverage maps
    coverageMap.merge(newCoverageMap);

    // Update the stored coverage data
    this.coverageData = coverageMap.toJSON();
  }
}

/**
 * Get the coverage store instance
 */
function getCoverageStore(): CoverageStore {
  return CoverageStore.getInstance();
}

/**
 * Get the current coverage object
 */
export function getCoverageObject(): CoverageData {
  return getCoverageStore().getCoverage();
}

/**
 * Reset coverage data to empty state
 */
export function resetCoverage(): void {
  getCoverageStore().resetCoverage();
}

/**
 * Merge client-side coverage data with server-side coverage
 */
export function mergeClientCoverage(obj: CoverageData): void {
  getCoverageStore().mergeCoverage(obj);
}

/**
 * Generate LCOV format coverage report
 */
export function generateLcovReport(customOutputDir?: string): string {
  const coverage = getCoverageObject();

  if (!(coverage && Object.keys(coverage).length > 0)) {
    throw new Error("No coverage data available for LCOV generation");
  }

  try {
    const coverageMap = libCoverage.createCoverageMap(coverage);
    const outputDir = customOutputDir || path.join(process.cwd(), "output");

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const lcovFile = path.join(outputDir, "lcov.info");

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

    // Create and execute LCOV report
    const report = reports.create("lcovonly");
    report.execute(context);

    // The lcovonly report creates lcov.info in the output directory
    const actualLcovFile = path.join(outputDir, "lcov.info");

    if (!fs.existsSync(actualLcovFile)) {
      throw new Error(`LCOV report was not generated at ${actualLcovFile}`);
    }

    console.log("LCOV report generated successfully:", actualLcovFile);
    return actualLcovFile;
  } catch (err) {
    console.error("Error generating LCOV report:", err);
    throw err;
  }
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
    const htmlReport = reports.create("html", {
      skipEmpty: false,
    } as HtmlOptions);

    htmlReport.execute(context);
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

/**
 * Check if diff_cover is available
 */
async function checkDiffCoverAvailable(
  diffCoverCommand = "diff-cover"
): Promise<boolean> {
  try {
    await execAsync(`${diffCoverCommand} --version`);
    return true;
  } catch (err) {
    console.warn(
      `diff-cover not found at '${diffCoverCommand}'. Install with: pip install diff_cover`
    );
    return false;
  }
}

/**
 * Check if target is a diff file by checking file existence
 */
function isDiffFile(target: string): boolean {
  try {
    return fs.existsSync(target) && fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

/**
 * Validate if diffTarget is a valid git reference or diff file
 */
export async function validateDiffTarget(target: string): Promise<{
  isValid: boolean;
  type: "diff-file" | "git-ref" | "invalid";
  error?: string;
}> {
  // First check if it's a diff file
  if (isDiffFile(target)) {
    return { isValid: true, type: "diff-file" };
  }

  // Then check if it's a valid git reference
  try {
    await execAsync(`git rev-parse --verify ${target}`, { cwd: process.cwd() });
    return { isValid: true, type: "git-ref" };
  } catch (err) {
    return {
      isValid: false,
      type: "invalid",
      error: `'${target}' is neither a valid file path nor a git reference (branch/commit/tag)`,
    };
  }
}

/**
 * Generate differential coverage report using diff_cover
 */
export async function generateDiffCoverageReport(
  options: DiffCoverageOptions
): Promise<string> {
  const {
    target,
    outputDir,
    lcovFile,
    diffCoverCommand = "diff-cover",
  } = options;

  // Check if diff_cover is available
  const isDiffCoverAvailable = await checkDiffCoverAvailable(diffCoverCommand);
  if (!isDiffCoverAvailable) {
    throw new Error(
      `diff-cover is not available at '${diffCoverCommand}'. Please install it with: pip install diff_cover`
    );
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate LCOV report if not provided
  const lcovPath = lcovFile || generateLcovReport(outputDir);

  if (!fs.existsSync(lcovPath)) {
    throw new Error(`LCOV file not found: ${lcovPath}`);
  }

  try {
    // Determine if target is a diff file or git reference
    const isTargetDiffFile = isDiffFile(target);

    // Generate diff coverage HTML report
    const diffHtmlPath = path.join(outputDir, "diff-coverage.html");

    let diffCoverCommandLine: string;
    if (isTargetDiffFile) {
      // Target is a diff file path
      if (!require("fs").existsSync(target)) {
        throw new Error(`Diff file not found: ${target}`);
      }
      diffCoverCommandLine = [
        diffCoverCommand,
        `--diff-file=${target}`,
        `--format="html:${diffHtmlPath}"`,
        lcovPath,
      ].join(" ");
    } else {
      // Target is a git reference (branch/commit/tag)
      diffCoverCommandLine = [
        diffCoverCommand,
        `--compare-branch=${target}`,
        `--format="html:${diffHtmlPath}"`,
        lcovPath,
      ].join(" ");
    }

    console.log("Generating differential coverage report...");
    console.log(
      "Target type:",
      isTargetDiffFile ? "diff file" : "git reference"
    );
    console.log("Command:", diffCoverCommandLine);

    const { stdout, stderr } = await execAsync(diffCoverCommandLine, {
      cwd: process.cwd(),
    });

    if (stderr) {
      console.warn("diff-cover warnings:", stderr);
    }

    console.log("diff-cover output:", stdout);

    if (!fs.existsSync(diffHtmlPath)) {
      throw new Error("Differential coverage HTML report was not generated");
    }

    console.log("Differential coverage report generated:", diffHtmlPath);
    return diffHtmlPath;
  } catch (err) {
    console.error("Error generating differential coverage report:", err);
    throw err;
  }
}

/**
 * Get git diff information
 */
export async function getGitDiffInfo(target: string): Promise<{
  changedFiles: string[];
  diffSummary: string;
  targetType: "git-ref" | "diff-file";
}> {
  const isTargetDiffFile = isDiffFile(target);

  try {
    if (isTargetDiffFile) {
      // Target is a diff file
      if (!fs.existsSync(target)) {
        throw new Error(`Diff file not found: ${target}`);
      }

      // Parse diff file to extract changed files
      const diffContent = fs.readFileSync(target, "utf8");
      const changedFiles = extractChangedFilesFromDiff(diffContent);

      return {
        changedFiles,
        diffSummary: `Diff file: ${target} (${changedFiles.length} files changed)`,
        targetType: "diff-file",
      };
    } else {
      // Target is a git reference
      // Get list of changed files
      const { stdout: filesOutput } = await execAsync(
        `git diff --name-only ${target}`,
        { cwd: process.cwd() }
      );
      const changedFiles = filesOutput.trim().split("\n").filter(Boolean);

      // Get diff summary
      const { stdout: diffSummary } = await execAsync(
        `git diff --stat ${target}`,
        { cwd: process.cwd() }
      );

      return {
        changedFiles,
        diffSummary: diffSummary.trim(),
        targetType: "git-ref",
      };
    }
  } catch (err) {
    console.error("Error getting git diff info:", err);
    throw new Error(`Failed to get git diff for target: ${target}`);
  }
}

/**
 * Extract changed files from diff content
 */
function extractChangedFilesFromDiff(diffContent: string): string[] {
  const lines = diffContent.split("\n");
  const changedFiles: string[] = [];

  for (const line of lines) {
    // Look for lines that start with "diff --git" or "+++ " or "--- "
    if (line.startsWith("diff --git")) {
      // Format: diff --git a/file.js b/file.js
      const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
      if (match) {
        const fileName = match[2]; // Use the "b/" version (new file)
        if (!changedFiles.includes(fileName)) {
          changedFiles.push(fileName);
        }
      }
    } else if (line.startsWith("+++") && !line.startsWith("+++ /dev/null")) {
      // Format: +++ b/file.js
      const match = line.match(/\+\+\+ b\/(.+)/);
      if (match) {
        const fileName = match[1];
        if (!changedFiles.includes(fileName)) {
          changedFiles.push(fileName);
        }
      }
    }
  }

  return changedFiles;
}
