import express from "express";
import request from "supertest";
import { createHandler } from "../../src/handlers";
import { CoverageData } from "../../src/types";

describe("Server Integration Tests", () => {
  let app: express.Application;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Create handler for basic integration tests
    const handler = await createHandler({
      resetOnGet: false,
      outputDir: "./temp-test-output",
    });

    app.use("/coverage", handler);
  });

  describe("Coverage Workflow", () => {
    const sampleCoverageData: CoverageData = {
      "src/calculator.ts": {
        path: "src/calculator.ts",
        statementMap: {
          0: { start: { line: 1, column: 0 }, end: { line: 1, column: 25 } },
          1: { start: { line: 2, column: 0 }, end: { line: 2, column: 20 } },
        },
        fnMap: {
          0: {
            name: "add",
            line: 1,
            loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
          },
        },
        branchMap: {},
        s: { 0: 5, 1: 3 }, // Statement execution counts
        f: { 0: 5 }, // Function execution counts
        b: {}, // Branch execution counts
      },
    };

    it("should handle basic coverage workflow", async () => {
      // 1. Initially should have no coverage
      let response = await request(app).get("/coverage/object").expect(200);
      expect(Object.keys(response.body)).toHaveLength(0);

      // 2. Merge coverage data
      response = await request(app)
        .post("/coverage/merge")
        .send(sampleCoverageData)
        .expect(200);

      expect(response.body.ok).toBe(true);

      // 3. Verify coverage data is stored
      response = await request(app).get("/coverage/object").expect(200);

      expect(Object.keys(response.body)).toHaveLength(1);
      expect(response.body["src/calculator.ts"]).toBeDefined();

      // 4. Reset coverage
      response = await request(app).post("/coverage/reset").expect(200);

      expect(response.body.ok).toBe(true);

      // 5. Verify coverage is cleared
      response = await request(app).get("/coverage/object").expect(200);

      expect(Object.keys(response.body)).toHaveLength(0);
    });

    it("should handle multiple merge operations", async () => {
      // First merge
      const firstBatch: CoverageData = {
        "src/file1.ts": {
          path: "src/file1.ts",
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 3 },
          f: {},
          b: {},
        },
      };

      let response = await request(app)
        .post("/coverage/merge")
        .send(firstBatch)
        .expect(200);

      expect(response.body.ok).toBe(true);

      // Second merge with different file
      const secondBatch: CoverageData = {
        "src/file2.ts": {
          path: "src/file2.ts",
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 2 },
          f: {},
          b: {},
        },
      };

      response = await request(app)
        .post("/coverage/merge")
        .send(secondBatch)
        .expect(200);

      expect(response.body.ok).toBe(true);

      // Verify both files are present
      response = await request(app).get("/coverage/object").expect(200);

      expect(Object.keys(response.body)).toHaveLength(2);
      expect(response.body["src/file1.ts"].s[0]).toBe(3);
      expect(response.body["src/file2.ts"].s[0]).toBe(2);
    });

    it("should handle empty coverage data", async () => {
      // Test empty object (should succeed)
      const response = await request(app)
        .post("/coverage/merge")
        .send({})
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });
});
