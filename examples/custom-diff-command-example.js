const express = require("express");
const path = require("path");
const { createHandler } = require("../dist/index");

/**
 * Example showing custom diff-cover command usage
 * This is useful when diff-cover is installed in a virtual environment,
 * conda environment, or custom location
 */

async function startServer() {
  const app = express();
  const port = 3002;

  // Example configurations for different scenarios
  const examples = {
    // Default system diff-cover
    default: {
      diffTarget: "main",
      // diffCoverCommand not specified, uses default "diff-cover"
    },

    // Virtual environment
    venv: {
      diffTarget: "main",
      diffCoverCommand: "/path/to/venv/bin/diff-cover",
    },

    // Conda environment
    conda: {
      diffTarget: "main",
      diffCoverCommand: "conda run -n myenv diff-cover",
    },

    // Using pipx
    pipx: {
      diffTarget: "main",
      diffCoverCommand: "pipx run diff-cover",
    },

    // Custom installation path
    custom: {
      diffTarget: "main",
      diffCoverCommand: "/usr/local/bin/diff-cover",
    },
  };

  // Use environment variable to select example, default to 'default'
  const exampleType = process.env.EXAMPLE_TYPE || "default";
  const config = examples[exampleType] || examples.default;

  console.log("Custom diff-cover Command Example");
  console.log("=================================");
  console.log(`Using example: ${exampleType}`);
  console.log(`Config:`, JSON.stringify(config, null, 2));

  try {
    // Create coverage handler with custom diff-cover command
    const coverageHandler = await createHandler({
      resetOnGet: true,
      outputDir: path.join(__dirname, "../temp-coverage"),
      ...config, // Spread the selected configuration
    });

    app.use("/coverage", coverageHandler);

    // Basic route
    app.get("/", (req, res) => {
      res.json({
        message: "Custom diff-cover Command Example",
        exampleType: exampleType,
        config: config,
        endpoints: {
          coverage: "/coverage",
          reset: "/coverage/reset",
          object: "/coverage/object",
          download: "/coverage/download",
          lcov: "/coverage/lcov",
          diff: "/coverage/diff",
          diffInfo: "/coverage/diff/info",
        },
        usage: {
          "Set example type":
            "EXAMPLE_TYPE=venv node test/custom-diff-command-example.js",
          "Available types": Object.keys(examples),
        },
      });
    });

    app.listen(port, () => {
      console.log(`\nExample server started on port ${port}`);
      console.log(`Main page: http://localhost:${port}`);
      console.log(`Coverage: http://localhost:${port}/coverage`);
      console.log(`Diff coverage: http://localhost:${port}/coverage/diff`);
      console.log(`\nTo try different examples:`);
      Object.keys(examples).forEach((type) => {
        console.log(
          `  EXAMPLE_TYPE=${type} node test/custom-diff-command-example.js`
        );
      });
      console.log("\nPress Ctrl+C to stop");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    console.log("\nThis might happen if:");
    console.log(
      "1. The diff-cover command is not available at the specified path"
    );
    console.log("2. The diffTarget (git reference) is invalid");
    console.log("3. You're not in a git repository");
    console.log("\nTry using EXAMPLE_TYPE=default to use system diff-cover");
    process.exit(1);
  }
}

startServer();
