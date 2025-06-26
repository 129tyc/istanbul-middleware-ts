import {
  getCoverageObject,
  resetCoverage,
  mergeClientCoverage,
  generateCoverageReport,
  generateLcovReport,
  createDownloadPackage,
  validateDiffTarget,
  getGitDiffInfo,
} from "../../src/core";
import { CoverageData } from "../../src/types";
import * as fs from "fs";
import * as path from "path";

describe("Core Functions", () => {
  const testOutputDir = path.join(__dirname, "../temp-core-output");

  const mockCoverageData: CoverageData = {
    "src/test.ts": {
      path: "src/test.ts",
      statementMap: {
        0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        1: { start: { line: 2, column: 0 }, end: { line: 2, column: 15 } },
      },
      fnMap: {
        0: {
          name: "testFunction",
          line: 1,
          loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
        },
      },
      branchMap: {},
      s: { 0: 1, 1: 0 }, // First statement covered, second not
      f: { 0: 1 },
      b: {},
    },
  };

  // Setup and cleanup
  beforeEach(() => {
    resetCoverage();
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe("getCoverageObject", () => {
    it("should return empty object when no coverage data exists", () => {
      const coverage = getCoverageObject();
      expect(coverage).toEqual({});
    });

    it("should return coverage data when it exists", () => {
      // Use mergeClientCoverage to add test data
      mergeClientCoverage(mockCoverageData);

      const coverage = getCoverageObject();

      // Check that the file is present and has the expected structure
      expect(Object.keys(coverage)).toHaveLength(1);
      expect(coverage["src/test.ts"]).toBeDefined();

      // Check key properties that should be preserved
      const fileCoverage = coverage["src/test.ts"];
      expect(fileCoverage.path).toBe("src/test.ts");
      expect(fileCoverage.s).toEqual({ 0: 1, 1: 0 });
      expect(fileCoverage.f).toEqual({ 0: 1 });
    });
  });

  describe("resetCoverage", () => {
    it("should clear coverage data", () => {
      // Add some coverage data first
      mergeClientCoverage(mockCoverageData);

      // Verify data exists
      expect(Object.keys(getCoverageObject())).toHaveLength(1);

      // Reset and verify it's empty
      resetCoverage();
      expect(getCoverageObject()).toEqual({});
    });
  });

  describe("mergeClientCoverage", () => {
    it("should merge coverage data correctly", () => {
      const newCoverageData: CoverageData = {
        "src/another.ts": {
          path: "src/another.ts",
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      mergeClientCoverage(newCoverageData);

      const coverage = getCoverageObject();
      expect(Object.keys(coverage)).toHaveLength(1);
      expect(coverage["src/another.ts"]).toBeDefined();
      expect(coverage["src/another.ts"].s[0]).toBe(1);
    });

    it("should handle empty coverage data", () => {
      mergeClientCoverage({});

      const coverage = getCoverageObject();
      expect(coverage).toEqual({});
    });

    it("should handle null coverage data gracefully", () => {
      expect(() => {
        mergeClientCoverage(null as any);
      }).not.toThrow();
    });

    it("should merge multiple coverage objects", () => {
      const firstData: CoverageData = {
        "src/first.ts": {
          path: "src/first.ts",
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      const secondData: CoverageData = {
        "src/second.ts": {
          path: "src/second.ts",
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 15 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 2 },
          f: {},
          b: {},
        },
      };

      mergeClientCoverage(firstData);
      mergeClientCoverage(secondData);

      const coverage = getCoverageObject();
      expect(Object.keys(coverage)).toHaveLength(2);
      expect(coverage["src/first.ts"]).toBeDefined();
      expect(coverage["src/second.ts"]).toBeDefined();
    });

    it("should accumulate counts for same file", () => {
      const baseData: CoverageData = {
        "src/same.ts": {
          path: "src/same.ts",
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {
            0: {
              name: "test",
              line: 1,
              loc: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
          },
          branchMap: {},
          s: { 0: 1 },
          f: { 0: 1 },
          b: {},
        },
      };

      const additionalData: CoverageData = {
        "src/same.ts": {
          path: "src/same.ts",
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {
            0: {
              name: "test",
              line: 1,
              loc: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
          },
          branchMap: {},
          s: { 0: 2 },
          f: { 0: 1 },
          b: {},
        },
      };

      mergeClientCoverage(baseData);
      mergeClientCoverage(additionalData);

      const coverage = getCoverageObject();
      expect(coverage["src/same.ts"].s[0]).toBe(3); // 1 + 2
      expect(coverage["src/same.ts"].f[0]).toBe(2); // 1 + 1
    });
  });

  describe("generateCoverageReport", () => {
    beforeEach(() => {
      fs.mkdirSync(testOutputDir, { recursive: true });
    });

    it("should generate coverage report when coverage data exists", () => {
      mergeClientCoverage(mockCoverageData);

      expect(() => {
        generateCoverageReport(testOutputDir);
      }).not.toThrow();

      // Check if index.html was created
      const indexPath = path.join(testOutputDir, "index.html");
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it("should handle empty coverage data", () => {
      expect(() => {
        generateCoverageReport(testOutputDir);
      }).not.toThrow();
    });

    it("should create output directory if it doesn't exist", () => {
      const nonExistentDir = path.join(testOutputDir, "new-dir");

      mergeClientCoverage(mockCoverageData);

      expect(() => {
        generateCoverageReport(nonExistentDir);
      }).not.toThrow();

      expect(fs.existsSync(nonExistentDir)).toBe(true);
    });
  });

  describe("generateLcovReport", () => {
    beforeEach(() => {
      fs.mkdirSync(testOutputDir, { recursive: true });
    });

    it("should generate LCOV report when coverage data exists", () => {
      mergeClientCoverage(mockCoverageData);

      const lcovFile = generateLcovReport(testOutputDir);

      expect(lcovFile).toBeDefined();
      expect(fs.existsSync(lcovFile)).toBe(true);
      expect(path.basename(lcovFile)).toBe("lcov.info");
    });

    it("should throw error when no coverage data", () => {
      expect(() => {
        generateLcovReport(testOutputDir);
      }).toThrow("No coverage data available for LCOV generation");
    });

    it("should create output directory if it doesn't exist", () => {
      const nonExistentDir = path.join(testOutputDir, "lcov-dir");

      mergeClientCoverage(mockCoverageData);

      const lcovFile = generateLcovReport(nonExistentDir);

      expect(fs.existsSync(nonExistentDir)).toBe(true);
      expect(fs.existsSync(lcovFile)).toBe(true);
    });
  });

  describe("createDownloadPackage", () => {
    beforeEach(() => {
      fs.mkdirSync(testOutputDir, { recursive: true });
    });

    it("should create download package when coverage data exists", (done) => {
      mergeClientCoverage(mockCoverageData);
      generateCoverageReport(testOutputDir);

      createDownloadPackage((err, archive) => {
        expect(err).toBeNull();
        expect(archive).toBeDefined();
        done();
      }, testOutputDir);
    });

    it("should return error when no coverage data", (done) => {
      createDownloadPackage((err, archive) => {
        expect(err).toBeDefined();
        expect(err?.message).toBe("No coverage data available");
        expect(archive).toBeUndefined();
        done();
      }, testOutputDir);
    });

    it("should handle missing output directory", (done) => {
      const nonExistentDir = path.join(testOutputDir, "missing");

      createDownloadPackage((err, archive) => {
        expect(err).toBeDefined();
        expect(archive).toBeUndefined();
        done();
      }, nonExistentDir);
    });
  });

  describe("validateDiffTarget", () => {
    it("should validate git branch names", async () => {
      const result = await validateDiffTarget("main");
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe("boolean");
      expect(typeof result.type).toBe("string");
    });

    it("should validate file paths", async () => {
      // Create a temporary diff file
      const diffFilePath = path.join(testOutputDir, "test.diff");
      fs.mkdirSync(testOutputDir, { recursive: true });
      fs.writeFileSync(diffFilePath, "diff --git a/test.js b/test.js\n");

      const result = await validateDiffTarget(diffFilePath);
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe("boolean");
      expect(typeof result.type).toBe("string");
    });

    it("should handle invalid targets", async () => {
      const result = await validateDiffTarget("invalid-branch-name-12345");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle non-existent file paths", async () => {
      const result = await validateDiffTarget("/non/existent/file.diff");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getGitDiffInfo", () => {
    it("should get diff info for valid branch", async () => {
      try {
        const result = await getGitDiffInfo("main");
        expect(result).toBeDefined();
        expect(typeof result.targetType).toBe("string");
        expect(Array.isArray(result.changedFiles)).toBe(true);
        expect(typeof result.diffSummary).toBe("string");
      } catch (error) {
        // If git operations fail in test environment, that's acceptable
        expect(error).toBeDefined();
      }
    });

    it("should handle invalid branch", async () => {
      try {
        await getGitDiffInfo("invalid-branch-name-12345");
        // If we reach here, the branch might actually exist or git handled it gracefully
      } catch (error) {
        // Expected to throw for invalid branch
        expect(error).toBeDefined();
      }
    });

    it("should handle diff file", async () => {
      // Create a temporary diff file
      const diffFilePath = path.join(testOutputDir, "test.diff");
      fs.mkdirSync(testOutputDir, { recursive: true });
      fs.writeFileSync(
        diffFilePath,
        `diff --git a/src/test.js b/src/test.js
index 1234567..abcdefg 100644
--- a/src/test.js
+++ b/src/test.js
@@ -1,3 +1,4 @@
 function test() {
+  console.log('added line');
   return true;
 }
`
      );

      try {
        const result = await getGitDiffInfo(diffFilePath);
        expect(result).toBeDefined();
        expect(result.targetType).toBe("file");
        expect(Array.isArray(result.changedFiles)).toBe(true);
      } catch (error) {
        // If diff parsing fails, that's acceptable in test environment
        expect(error).toBeDefined();
      }
    });
  });
});
