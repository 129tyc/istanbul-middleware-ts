const express = require("express");
const path = require("path");
const { createHandler } = require("../dist/index"); // Use compiled files

/**
 * Test server with Istanbul coverage middleware
 */
const testServer = {
  start: function (port, needCover) {
    const app = express();

    if (needCover) {
      console.log("Turn on coverage reporting at /coverage");
      // Create coverage handler and mount to /coverage path
      const coverageHandler = createHandler({
        verbose: true,
        resetOnGet: true,
      });
      app.use("/coverage", coverageHandler);
    }

    // Set static file directory (if public directory exists)
    const publicDir = path.join(__dirname, "public");
    app.use(express.static(publicDir));

    // Basic routes
    app.get("/", (req, res) => {
      res.json({
        message: "Istanbul Middleware Test Server",
        endpoints: {
          coverage: needCover ? "/coverage" : "disabled",
          reset: needCover ? "/coverage/reset" : "disabled",
          object: needCover ? "/coverage/object" : "disabled",
          download: needCover ? "/coverage/download" : "disabled",
          merge: needCover ? "/coverage/merge" : "disabled",
        },
      });
    });

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        coverage: needCover ? "enabled" : "disabled",
      });
    });

    // Start server
    app.listen(port, () => {
      console.log(`Test server started on port ${port}`);
      if (needCover) {
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
          `  - POST http://localhost:${port}/coverage/merge - Merge client coverage`
        );
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
  const needCover = process.env.COVERAGE !== "false";
  testServer.start(port, needCover);
}
