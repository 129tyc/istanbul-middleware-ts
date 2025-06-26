export interface CoverageData {
  [filePath: string]: any;
}

export interface DownloadPackageCallback {
  (error: Error | null, archive?: any): void;
}

export interface HandlerOptions {
  resetOnGet?: boolean;
  outputDir?: string;
  diffTarget?: string; // Git diff target (branch/commit/tag) or diff file path - if set, enables differential coverage
  diffCoverCommand?: string; // Custom diff-cover command path (default: "diff-cover")
}

export interface DiffCoverageOptions {
  target: string; // Git diff target (branch/commit/tag) or diff file path
  outputDir: string; // Output directory for reports
  lcovFile?: string; // Custom lcov file path
  diffCoverCommand?: string; // Custom diff-cover command path
}