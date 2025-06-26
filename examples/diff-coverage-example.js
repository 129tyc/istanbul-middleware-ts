const express = require("express");
const path = require("path");
const { createHandler } = require("../dist/index");

/**
 * Example showing differential coverage functionality
 */
const app = express();
const port = 3002;

// Configuration
const outputDir = path.join(__dirname, "../temp-diff-coverage");
const diffTarget = "main"; // Compare against main branch

console.log("Differential Coverage Example:");
console.log("=============================");
console.log("Output directory:", outputDir);
console.log("Diff target:", diffTarget);
console.log("");

// Create coverage handler with differential coverage enabled via diffTarget
async function setupCoverageHandler() {
  const coverageHandler = await createHandler({
    resetOnGet: true,
    outputDir: outputDir,
    diffTarget: diffTarget, // This enables differential coverage
  });

  app.use("/coverage", coverageHandler);
}

setupCoverageHandler();

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Differential Coverage Example",
    config: {
      outputDir: outputDir,
      diffTarget: diffTarget,
    },
    endpoints: {
      coverage: "/coverage",
      lcov: "/coverage/lcov",
      diff: "/coverage/diff",
      diffInfo: "/coverage/diff/info",
      merge: "/coverage/merge",
    },
    usage: {
      step1: "POST coverage data to /coverage/merge",
      step2: "View differential coverage at /coverage/diff",
      step3: "Get diff info at /coverage/diff/info",
      step4: "Download LCOV at /coverage/lcov",
    },
  });
});

// Example route to generate some coverage data
app.get("/api/test", (req, res) => {
  // This is just a dummy function to generate coverage
  function dummyFunction(x) {
    if (x > 0) {
      return x * 2;
    } else {
      return 0;
    }
  }

  const result = dummyFunction(5);
  res.json({ result: result, message: "Test endpoint for coverage" });
});

app.listen(port, () => {
  console.log(`Example server started on port ${port}`);
  console.log(`Main page: http://localhost:${port}`);
  console.log(`Coverage: http://localhost:${port}/coverage`);
  console.log(`Differential coverage: http://localhost:${port}/coverage/diff`);
  console.log(`Diff info: http://localhost:${port}/coverage/diff/info`);
  console.log("");
  console.log("Prerequisites:");
  console.log("1. Install diff_cover: pip install diff_cover");
  console.log("2. Ensure you're in a git repository");
  console.log("3. Have some changes compared to the target branch");
  console.log("");
  console.log("Press Ctrl+C to stop");
});
