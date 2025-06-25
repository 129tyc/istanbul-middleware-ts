const express = require("express");
const path = require("path");
const { createHandler } = require("../dist/index");

/**
 * Example showing custom output directory usage
 */
const app = express();
const port = 3001;

// Example 1: Use temporary directory
const tempOutputDir = path.join(__dirname, "../temp-coverage");

// Example 2: Use system temp directory
const osTempDir = path.join(require("os").tmpdir(), "istanbul-coverage");

console.log("Custom Output Directory Examples:");
console.log("=================================");
console.log("Temp directory:", tempOutputDir);
console.log("OS temp directory:", osTempDir);

// Create coverage handler with custom output directory
const coverageHandler = createHandler({
  resetOnGet: true,
  outputDir: tempOutputDir, // Use custom directory
});

app.use("/coverage", coverageHandler);

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Custom Output Directory Example",
    outputDir: tempOutputDir,
    endpoints: {
      coverage: "/coverage",
      reset: "/coverage/reset",
      object: "/coverage/object",
      download: "/coverage/download",
    },
  });
});

app.listen(port, () => {
  console.log(`\nExample server started on port ${port}`);
  console.log(`Main page: http://localhost:${port}`);
  console.log(`Coverage: http://localhost:${port}/coverage`);
  console.log(`Custom output directory: ${tempOutputDir}`);
  console.log("\nPress Ctrl+C to stop");
});
