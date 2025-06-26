import {
  getCoverageObject,
  resetCoverage,
  mergeClientCoverage,
} from "../../src/core";
import { CoverageData } from "../../src/types";

describe("Core Functions", () => {
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

  // Reset coverage before each test to ensure clean state
  beforeEach(() => {
    resetCoverage();
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
  });
});
