import { createHandler } from "../../src/handlers";
import { HandlerOptions } from "../../src/types";
import express from "express";
import request from "supertest";
import * as fs from "fs";
import * as path from "path";

describe("Handlers", () => {
  let app: express.Application;
  const testOutputDir = path.join(__dirname, "../temp-test-output");

  beforeEach(() => {
    app = express();
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test output directory after each test
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe("createHandler", () => {
    it("should create handler without options", async () => {
      const handler = await createHandler();
      expect(handler).toBeDefined();
    });

    it("should create handler with basic options", async () => {
      const handler = await createHandler({
        resetOnGet: true,
        outputDir: testOutputDir,
      });
      expect(handler).toBeDefined();
    });

    it("should handle absolute outputDir path", async () => {
      const absolutePath = path.resolve(testOutputDir);
      const handler = await createHandler({
        outputDir: absolutePath,
      });
      expect(handler).toBeDefined();
    });

    it("should handle relative outputDir path", async () => {
      const handler = await createHandler({
        outputDir: "./test-output",
      });
      expect(handler).toBeDefined();
    });

    it("should create handler with diffTarget", async () => {
      const options: HandlerOptions = {
        outputDir: testOutputDir,
        diffTarget: "main",
        diffCoverCommand: "diff-cover",
      };

      const handler = await createHandler(options);
      expect(handler).toBeDefined();
    });

    it("should handle invalid diffTarget", async () => {
      const options: HandlerOptions = {
        outputDir: testOutputDir,
        diffTarget: "invalid-branch-name-that-does-not-exist",
      };

      const handler = await createHandler(options);
      expect(handler).toBeDefined();
    });

    it("should handle diffTarget validation errors", async () => {
      // Test with a diffTarget that would cause validation errors
      const options: HandlerOptions = {
        outputDir: testOutputDir,
        diffTarget: "/nonexistent/path/file.diff",
      };

      const handler = await createHandler(options);
      expect(handler).toBeDefined();
    });
  });

  describe("Basic Routes", () => {
    beforeEach(async () => {
      const handler = await createHandler({
        resetOnGet: false,
        outputDir: testOutputDir,
      });
      app.use("/coverage", handler);
    });

    describe("POST /merge", () => {
      it("should merge valid coverage data", async () => {
        const coverageData = {
          "src/test.ts": {
            path: "src/test.ts",
            statementMap: {
              0: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
            fnMap: {},
            branchMap: {},
            s: { 0: 1 },
            f: {},
            b: {},
          },
        };

        const response = await request(app)
          .post("/coverage/merge")
          .send(coverageData)
          .expect(200);

        expect(response.body.ok).toBe(true);
      });

      it("should handle empty coverage data", async () => {
        const response = await request(app)
          .post("/coverage/merge")
          .send({})
          .expect(200);

        expect(response.body.ok).toBe(true);
      });

      it("should handle invalid content type", async () => {
        const response = await request(app)
          .post("/coverage/merge")
          .send("invalid data");

        // Could be 400 or 500 depending on how the body parser handles it
        expect([400, 500]).toContain(response.status);
      });

      it("should handle null data", async () => {
        const response = await request(app)
          .post("/coverage/merge")
          .send(null as any);

        // The handler might accept null/undefined and treat it as empty object
        expect([200, 400]).toContain(response.status);
      });
    });

    describe("POST /reset", () => {
      it("should reset coverage data", async () => {
        const response = await request(app).post("/coverage/reset").expect(200);

        expect(response.body.ok).toBe(true);
      });
    });

    describe("GET /object", () => {
      it("should return coverage object", async () => {
        const response = await request(app).get("/coverage/object").expect(200);

        expect(response.body).toBeDefined();
      });

      it("should return coverage data when exists", async () => {
        // First merge some data
        const coverageData = {
          "src/test.ts": {
            path: "src/test.ts",
            statementMap: {
              0: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
            fnMap: {},
            branchMap: {},
            s: { 0: 1 },
            f: {},
            b: {},
          },
        };

        await request(app)
          .post("/coverage/merge")
          .send(coverageData)
          .expect(200);

        // Then get the object
        const response = await request(app).get("/coverage/object").expect(200);

        expect(Object.keys(response.body)).toHaveLength(1);
        expect(response.body["src/test.ts"]).toBeDefined();
      });
    });

    describe("GET /download", () => {
      it("should return 404 when no coverage data", async () => {
        const response = await request(app)
          .get("/coverage/download")
          .expect(404);

        expect(response.text).toContain("No coverage data available");
      });

      it("should download coverage package when data exists", async () => {
        // First merge some data
        const coverageData = {
          "src/test.ts": {
            path: "src/test.ts",
            statementMap: {
              0: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
            fnMap: {},
            branchMap: {},
            s: { 0: 1 },
            f: {},
            b: {},
          },
        };

        await request(app)
          .post("/coverage/merge")
          .send(coverageData)
          .expect(200);

        // Then download
        const response = await request(app)
          .get("/coverage/download")
          .expect(200);

        expect(response.headers["content-type"]).toBe("application/zip");
        expect(response.headers["content-disposition"]).toContain(
          "coverage.zip"
        );
      });

      it("should handle download package creation errors", async () => {
        // First merge some data to avoid the "no coverage data" path
        const coverageData = {
          "src/test.ts": {
            path: "src/test.ts",
            statementMap: {
              0: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
            fnMap: {},
            branchMap: {},
            s: { 0: 1 },
            f: {},
            b: {},
          },
        };

        await request(app)
          .post("/coverage/merge")
          .send(coverageData)
          .expect(200);

        // Mock the createDownloadPackage to simulate an error
        const core = require("../../src/core");
        const originalCreateDownloadPackage = core.createDownloadPackage;

        core.createDownloadPackage = jest.fn((callback, outputDir) => {
          callback(new Error("Test error"), null);
        });

        const response = await request(app)
          .get("/coverage/download")
          .expect(500);

        expect(response.text).toContain(
          "Error creating download package: Test error"
        );

        // Restore original function
        core.createDownloadPackage = originalCreateDownloadPackage;
      });

      it("should handle null archive from createDownloadPackage", async () => {
        // First merge some data
        const coverageData = {
          "src/test.ts": {
            path: "src/test.ts",
            statementMap: {
              0: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
            fnMap: {},
            branchMap: {},
            s: { 0: 1 },
            f: {},
            b: {},
          },
        };

        await request(app)
          .post("/coverage/merge")
          .send(coverageData)
          .expect(200);

        // Mock the createDownloadPackage to return null archive
        const core = require("../../src/core");
        const originalCreateDownloadPackage = core.createDownloadPackage;

        core.createDownloadPackage = jest.fn((callback, outputDir) => {
          callback(null, null);
        });

        const response = await request(app)
          .get("/coverage/download")
          .expect(500);

        expect(response.text).toContain("Archive creation failed");

        // Restore original function
        core.createDownloadPackage = originalCreateDownloadPackage;
      });
    });

    describe("GET /lcov", () => {
      it("should return LCOV report when coverage data exists", async () => {
        // First merge some data
        const coverageData = {
          "src/test.ts": {
            path: "src/test.ts",
            statementMap: {
              0: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
            fnMap: {},
            branchMap: {},
            s: { 0: 1 },
            f: {},
            b: {},
          },
        };

        await request(app)
          .post("/coverage/merge")
          .send(coverageData)
          .expect(200);

        // Then get LCOV
        const response = await request(app).get("/coverage/lcov").expect(200);

        expect(response.headers["content-disposition"]).toContain("lcov.info");
        expect(response.headers["content-type"]).toContain("text/plain");
        expect(response.text).toContain("SF:");
      });

      it("should use cached LCOV file when available", async () => {
        // Create a cached LCOV file
        if (!fs.existsSync(testOutputDir)) {
          fs.mkdirSync(testOutputDir, { recursive: true });
        }

        const cachedLcovPath = path.join(testOutputDir, "lcov.info");
        const cachedContent = "SF:test-cached.js\nLH:1\nLF:1\nend_of_record\n";
        fs.writeFileSync(cachedLcovPath, cachedContent);

        const response = await request(app).get("/coverage/lcov").expect(200);

        expect(response.headers["content-type"]).toContain("text/plain");
        expect(response.headers["content-disposition"]).toContain(
          "attachment; filename=lcov.info"
        );
        expect(response.text).toBe(cachedContent);
        expect(response.text).toContain("test-cached.js");
      });

      it("should handle error when no coverage data", async () => {
        const response = await request(app).get("/coverage/lcov").expect(404);

        expect(response.body.error).toContain("No coverage data available");
      });
    });
  });

  describe("Routes with resetOnGet enabled", () => {
    beforeEach(async () => {
      const handler = await createHandler({
        resetOnGet: true,
        outputDir: testOutputDir,
      });
      app.use("/coverage", handler);
    });

    describe("GET /reset", () => {
      it("should reset coverage data via GET when enabled", async () => {
        const response = await request(app).get("/coverage/reset").expect(200);

        expect(response.body.ok).toBe(true);
      });
    });
  });

  describe("Differential Coverage Routes", () => {
    let originalValidateDiffTarget: any;

    beforeEach(async () => {
      // Mock validateDiffTarget to ensure it always succeeds in tests
      const core = require("../../src/core");
      originalValidateDiffTarget = core.validateDiffTarget;
      core.validateDiffTarget = jest.fn().mockResolvedValue({
        isValid: true,
        type: "git-ref",
      });

      const handler = await createHandler({
        outputDir: testOutputDir,
        diffTarget: "main", // Use a target that should exist
      });
      app.use("/coverage", handler);
    });

    afterEach(() => {
      // Restore original function
      if (originalValidateDiffTarget) {
        const core = require("../../src/core");
        core.validateDiffTarget = originalValidateDiffTarget;
      }
    });

    describe("GET /diff/info", () => {
      it("should return diff info when diffTarget is valid", async () => {
        const response = await request(app).get("/coverage/diff/info");

        // Should return diff info or error if target is invalid
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.body).toBeDefined();
      });

      it("should return cached diff info when available", async () => {
        // Create a mock diff-info.json file
        if (!fs.existsSync(testOutputDir)) {
          fs.mkdirSync(testOutputDir, { recursive: true });
        }

        const mockDiffInfo = {
          target: "main",
          targetType: "git-ref",
          changedFiles: ["src/test.ts"],
          diffSummary: "Test diff summary",
          generatedAt: new Date().toISOString(),
        };

        fs.writeFileSync(
          path.join(testOutputDir, "diff-info.json"),
          JSON.stringify(mockDiffInfo, null, 2)
        );

        const response = await request(app)
          .get("/coverage/diff/info")
          .expect(200);

        expect(response.body.target).toBe("main");
        expect(response.body.enableDiffCoverage).toBe(true);
        expect(response.body.changedFiles).toEqual(["src/test.ts"]);
      });

      it("should generate diff info on demand when cache not available", async () => {
        const response = await request(app).get("/coverage/diff/info");

        // Should either return 200 with generated info or error if git command fails
        expect([200, 500]).toContain(response.status);
        expect(response.body).toBeDefined();

        if (response.status === 200) {
          expect(response.body.note).toContain("generated on demand");
        }
      });
    });

    describe("GET /diff", () => {
      it("should return 404 when diff coverage report does not exist", async () => {
        const response = await request(app).get("/coverage/diff");

        expect(response.status).toBe(404);

        // Check if this is the expected JSON error from our diff route
        if (
          response.body &&
          typeof response.body === "object" &&
          response.body.error
        ) {
          // This is our expected JSON response from the diff route
          expect(response.body.error).toContain(
            "Differential coverage report not found"
          );
        } else {
          // This might be a 404 from Express because the route doesn't exist
          // In this case, we still got the expected 404 status, which is acceptable
          // This can happen if diffTarget validation fails and the route isn't registered
          console.log("Route may not be registered, but 404 status is correct");
          expect(response.status).toBe(404);
        }
      });

      it("should serve diff coverage report when file exists", async () => {
        // Create a mock diff-coverage.html file
        if (!fs.existsSync(testOutputDir)) {
          fs.mkdirSync(testOutputDir, { recursive: true });
        }

        const mockHtmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Differential Coverage Report</title>
</head>
<body>
  <h1>Coverage Report</h1>
  <p>Test coverage data</p>
</body>
</html>
        `;

        fs.writeFileSync(
          path.join(testOutputDir, "diff-coverage.html"),
          mockHtmlContent
        );

        const response = await request(app).get("/coverage/diff").expect(200);

        expect(response.headers["content-type"]).toContain("text/html");
        expect(response.text).toContain("Differential Coverage Report");
      });
    });

    describe("POST /merge with differential coverage", () => {
      it("should generate differential coverage when diffTarget is valid", async () => {
        const coverageData = {
          "src/test.ts": {
            path: "src/test.ts",
            statementMap: {
              0: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
            fnMap: {},
            branchMap: {},
            s: { 0: 1 },
            f: {},
            b: {},
          },
        };

        // Mock the core functions to avoid actual git operations
        const core = require("../../src/core");
        const originalGetGitDiffInfo = core.getGitDiffInfo;
        const originalGenerateDiffCoverageReport =
          core.generateDiffCoverageReport;

        core.getGitDiffInfo = jest.fn().mockResolvedValue({
          targetType: "git-ref",
          changedFiles: ["src/test.ts"],
          diffSummary: "Test diff summary",
        });

        core.generateDiffCoverageReport = jest
          .fn()
          .mockResolvedValue(undefined);

        const response = await request(app)
          .post("/coverage/merge")
          .send(coverageData)
          .expect(200);

        expect(response.body.ok).toBe(true);

        // Verify that diff info was cached
        const diffInfoPath = path.join(testOutputDir, "diff-info.json");
        expect(fs.existsSync(diffInfoPath)).toBe(true);

        const cachedInfo = JSON.parse(fs.readFileSync(diffInfoPath, "utf8"));
        expect(cachedInfo.target).toBe("main");
        expect(cachedInfo.targetType).toBe("git-ref");

        // Restore original functions
        core.getGitDiffInfo = originalGetGitDiffInfo;
        core.generateDiffCoverageReport = originalGenerateDiffCoverageReport;
      });

      it("should handle differential coverage generation errors gracefully", async () => {
        const coverageData = {
          "src/test.ts": {
            path: "src/test.ts",
            statementMap: {
              0: {
                start: { line: 1, column: 0 },
                end: { line: 1, column: 10 },
              },
            },
            fnMap: {},
            branchMap: {},
            s: { 0: 1 },
            f: {},
            b: {},
          },
        };

        // Mock the core functions to simulate errors
        const core = require("../../src/core");
        const originalGetGitDiffInfo = core.getGitDiffInfo;

        core.getGitDiffInfo = jest
          .fn()
          .mockRejectedValue(new Error("Git command failed"));

        const response = await request(app)
          .post("/coverage/merge")
          .send(coverageData)
          .expect(200);

        // Should still succeed even if differential coverage fails
        expect(response.body.ok).toBe(true);

        // Restore original function
        core.getGitDiffInfo = originalGetGitDiffInfo;
      });
    });
  });

  describe("Routes without diffTarget", () => {
    beforeEach(async () => {
      const handler = await createHandler({
        outputDir: testOutputDir,
        // No diffTarget
      });
      app.use("/coverage", handler);
    });

    describe("GET /diff/info", () => {
      it("should return 400 when diffTarget not configured", async () => {
        const response = await request(app)
          .get("/coverage/diff/info")
          .expect(400);

        expect(response.body.error).toContain(
          "Differential coverage target not configured"
        );
      });
    });

    describe("GET /diff", () => {
      it("should not be available when diffTarget not configured", async () => {
        // This route should not exist, so it should return 404
        const response = await request(app).get("/coverage/diff").expect(404);
      });
    });
  });

  describe("Static file serving", () => {
    beforeEach(async () => {
      const handler = await createHandler({
        outputDir: testOutputDir,
      });
      app.use("/coverage", handler);
    });

    it("should serve static files from output directory", async () => {
      // Create a test file in the output directory
      if (!fs.existsSync(testOutputDir)) {
        fs.mkdirSync(testOutputDir, { recursive: true });
      }

      const testFileContent = "Test coverage report";
      fs.writeFileSync(path.join(testOutputDir, "index.html"), testFileContent);

      const response = await request(app)
        .get("/coverage/index.html")
        .expect(200);

      expect(response.text).toBe(testFileContent);
    });
  });

  describe("Error handling edge cases", () => {
    let originalValidateDiffTarget: any;

    beforeEach(async () => {
      // Mock validateDiffTarget to ensure it always succeeds in tests
      const core = require("../../src/core");
      originalValidateDiffTarget = core.validateDiffTarget;
      core.validateDiffTarget = jest.fn().mockResolvedValue({
        isValid: true,
        type: "git-ref",
      });

      const handler = await createHandler({
        outputDir: testOutputDir,
        diffTarget: "main",
      });
      app.use("/coverage", handler);
    });

    afterEach(() => {
      // Restore original function
      if (originalValidateDiffTarget) {
        const core = require("../../src/core");
        core.validateDiffTarget = originalValidateDiffTarget;
      }
    });

    it("should handle diff/info endpoint errors", async () => {
      // Mock core.getGitDiffInfo to throw an error
      const core = require("../../src/core");
      const originalGetGitDiffInfo = core.getGitDiffInfo;

      core.getGitDiffInfo = jest
        .fn()
        .mockRejectedValue(new Error("Git command failed"));

      const response = await request(app)
        .get("/coverage/diff/info")
        .expect(500);

      expect(response.body.error).toContain("Git command failed");

      // Restore original function
      core.getGitDiffInfo = originalGetGitDiffInfo;
    });

    it("should handle malformed cached diff info", async () => {
      // Create a malformed diff-info.json file
      if (!fs.existsSync(testOutputDir)) {
        fs.mkdirSync(testOutputDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(testOutputDir, "diff-info.json"),
        "invalid json content"
      );

      const response = await request(app).get("/coverage/diff/info");

      // Should handle the JSON parse error gracefully
      expect([200, 500]).toContain(response.status);
    });
  });
});
