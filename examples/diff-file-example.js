const express = require("express");
const path = require("path");
const { createHandler } = require("../dist/index");

/**
 * Example showing differential coverage with diff file
 */
const app = express();
const port = 3003;

// Configuration
const outputDir = path.join(__dirname, "../temp-diff-file-coverage");
const diffFilePath = path.join(__dirname, "example.diff"); // Use example diff file

console.log("Diff File Coverage Example:");
console.log("==========================");
console.log("Output directory:", outputDir);
console.log("Diff file:", diffFilePath);
console.log("");

// Create coverage handler with differential coverage enabled via diffTarget
async function setupCoverageHandler() {
  const coverageHandler = await createHandler({
    resetOnGet: true,
    outputDir: outputDir,
    diffTarget: diffFilePath, // Use diff file as target - this enables differential coverage
  });

  app.use("/coverage", coverageHandler);
}

setupCoverageHandler();

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Diff File Coverage Example",
    config: {
      outputDir: outputDir,
      diffTarget: diffFilePath,
    },
    endpoints: {
      coverage: "/coverage",
      lcov: "/coverage/lcov",
      diff: "/coverage/diff",
      diffInfo: "/coverage/diff/info",
      merge: "/coverage/merge",
    },
    examples: {
      "View diff coverage": `curl "http://localhost:${port}/coverage/diff"`,
      "Get diff info": `curl "http://localhost:${port}/coverage/diff/info"`,
    },
  });
});

// Test endpoint to check diff file parsing
app.get("/test/diff-parse", async (req, res) => {
  try {
    const { getGitDiffInfo } = require("../dist/core");
    const diffInfo = await getGitDiffInfo(diffFilePath);
    res.json({
      message: "Diff file parsed successfully",
      diffInfo: diffInfo,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      message: "Failed to parse diff file",
    });
  }
});

app.listen(port, () => {
  console.log(`Example server started on port ${port}`);
  console.log(`Main page: http://localhost:${port}`);
  console.log(`Coverage: http://localhost:${port}/coverage`);
  console.log(`Test diff parsing: http://localhost:${port}/test/diff-parse`);
  console.log(`Diff info: http://localhost:${port}/coverage/diff/info`);
  console.log("");
  console.log("This example uses a pre-created diff file for testing");
  console.log("Press Ctrl+C to stop");
});
