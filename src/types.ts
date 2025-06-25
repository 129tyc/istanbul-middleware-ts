export interface CoverageData {
  [filePath: string]: any;
}

export interface CoverageReportOptions {
  skipEmpty?: boolean;
  skipFull?: boolean;
}

export interface ReportContext {
  dir: string;
  coverageMap: any;
  defaultSummarizer: string;
  watermarks: {
    statements: [number, number];
    functions: [number, number];
    branches: [number, number];
    lines: [number, number];
  };
}

export interface DownloadPackageCallback {
  (error: Error | null, archive?: any): void;
}

export interface HandlerOptions {
  resetOnGet?: boolean;
}
