const express = require("express");
const { createHandler } = require("../dist/index");

/**
 * Test server with Istanbul coverage middleware
 */
const testServer = {
  start: async function (port, outputDir, diffTarget, command) {
    const app = express();

    console.log("Turn on coverage reporting at /coverage");
    // Use istanbul-middleware-ts with new modern coverage storage
    // This version uses an internal CoverageStore class instead of global.__coverage__
    // which avoids conflicts with Jest and other testing frameworks
    const istanbulHandler = await createHandler({
      resetOnGet: false,
      diffTarget: diffTarget,
      diffCoverCommand: command,
    });
    app.use("/coverage", istanbulHandler);

    // Basic routes
    app.get("/", (req, res) => {
      res.json({
        message: "Istanbul Middleware Test Server",
        endpoints: {
          coverage: "/coverage",
          reset: "/coverage/reset",
          object: "/coverage/object",
          download: "/coverage/download",
          merge: "/coverage/merge",
          lcov: "/coverage/lcov",
          diff: "/coverage/diff",
          diffInfo: "/coverage/diff/info",
        },
        config: {
          outputDir: outputDir || "default",
          diffTarget: diffTarget || "not set",
        },
      });
    });

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        coverage: "enabled",
      });
    });

    // Start server
    app.listen(port, () => {
      console.log(`Test server started on port ${port}`);
      console.log(`Coverage endpoints available at:`);
      console.log(
        `  - http://localhost:${port}/coverage - Coverage report HTML`
      );
      console.log(
        `  - http://localhost:${port}/coverage/object - Coverage data JSON`
      );
      console.log(
        `  - http://localhost:${port}/coverage/reset - Reset coverage data`
      );
      console.log(
        `  - http://localhost:${port}/coverage/download - Download coverage package`
      );
      console.log(
        `  - http://localhost:${port}/coverage/lcov - Download LCOV report`
      );
      console.log(
        `  - POST http://localhost:${port}/coverage/merge - Merge client coverage`
      );

      if (diffTarget) {
        console.log(
          `  - http://localhost:${port}/coverage/diff - Differential coverage report`
        );
        console.log(
          `  - http://localhost:${port}/coverage/diff/info - Git diff information`
        );
        console.log(`  - Diff target: ${diffTarget}`);
      }
      console.log(`Health check: http://localhost:${port}/health`);
    });

    return app;
  },
};

module.exports = testServer;

// If this file is run directly, start the server
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const outputDir = process.env.OUTPUT_DIR; // Optional custom output directory
  const diffTarget = process.env.DIFF_TARGET; // Optional git diff target (branch or diff file path)
  const command = process.env.COMMAND; // Optional custom diff-cover command

  testServer.start(port, outputDir, diffTarget, command).catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
