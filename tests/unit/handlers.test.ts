import { createHandler } from "../../src/handlers";
import { HandlerOptions } from "../../src/types";
import express from "express";
import request from "supertest";

describe("Handlers", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
  });

  describe("createHandler", () => {
    it("should create handler without options", async () => {
      const handler = await createHandler();
      expect(handler).toBeDefined();
      expect(typeof handler).toBe("function");
    });

    it("should create handler with basic options", async () => {
      const options: HandlerOptions = {
        resetOnGet: true,
        outputDir: "./temp-test",
      };

      const handler = await createHandler(options);
      expect(handler).toBeDefined();
    });
  });

  describe("Basic Routes", () => {
    beforeEach(async () => {
      const handler = await createHandler({ resetOnGet: false });
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

        expect(response.body).toEqual({});
      });
    });
  });
});
