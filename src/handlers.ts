import express from "express";
import * as bodyParser from "body-parser";
import * as path from "path";
import * as fs from "fs";
import * as core from "./core";
import { HandlerOptions } from "./types";

/**
 * Set default max limit to 100mb for incoming JSON and urlencoded
 */
const FILE_SIZE_MAXIMUM = "100mb";
const IS_EXTENDED = true;

/**
 * Create the main handler with coverage endpoints
 */
export async function createHandler(
  opts: HandlerOptions = {}
): Promise<express.Application> {
  const app = express();

  // Preprocess outputDir to absolute path to prevent issues during internal usage
  const rawOutputDir = opts.outputDir || path.join(process.cwd(), "output");
  const outputDir = path.isAbsolute(rawOutputDir)
    ? rawOutputDir
    : path.resolve(process.cwd(), rawOutputDir);

  const diffTarget = opts.diffTarget;
  let diffValidation: {
    isValid: boolean;
    type: string;
    error?: string;
  } | null = null;

  // Validate diffTarget (handles all cases including undefined/null)
  try {
    diffValidation = diffTarget
      ? await core.validateDiffTarget(diffTarget)
      : { isValid: false, type: "none" };

    if (diffValidation.isValid) {
      console.log(
        `Differential coverage enabled with ${diffValidation.type}: ${diffTarget}`
      );
    } else if (diffTarget) {
      // Only show warning if diffTarget was provided but invalid
      console.warn(
        `Warning: Invalid diffTarget '${diffTarget}': ${diffValidation.error}`
      );
      console.warn("Differential coverage endpoints will be disabled.");
    }
    // If no diffTarget provided, silently disable (no warning needed)
  } catch (err) {
    console.warn(
      `Warning: Failed to validate diffTarget '${diffTarget}': ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    console.warn("Differential coverage endpoints will be disabled.");
    diffValidation = { isValid: false, type: "error" };
  }

  // Configure body parser options
  const urlOptions = { extended: IS_EXTENDED, limit: FILE_SIZE_MAXIMUM };
  const jsonOptions = { limit: FILE_SIZE_MAXIMUM };

  // Serve static files from output directory
  app.use("/", express.static(outputDir));

  // Serve diff-coverage.html at /diff route if diffTarget is valid
  if (diffValidation?.isValid) {
    app.get("/diff", (req: express.Request, res: express.Response) => {
      const diffHtmlPath = path.join(outputDir, "diff-coverage.html");

      if (!fs.existsSync(diffHtmlPath)) {
        return res.status(404).json({
          error:
            "Differential coverage report not found. Please POST coverage data to /merge first.",
        });
      }

      // Use more robust file serving with proper error handling
      try {
        const htmlContent = fs.readFileSync(diffHtmlPath, "utf8");
        res.setHeader("Content-Type", "text/html");
        res.send(htmlContent);
      } catch (err) {
        console.error("Error serving diff coverage file:", err);
        res.status(500).json({
          error: "Failed to serve differential coverage report",
        });
      }
    });
  }

  // Configure body parsers
  app.use(bodyParser.urlencoded(urlOptions));
  app.use(bodyParser.json(jsonOptions));

  // Reset coverage to baseline on POST /reset
  app.post("/reset", (req: express.Request, res: express.Response) => {
    core.resetCoverage();
    res.json({ ok: true });
  });

  // Opt-in to allow resets on GET as well (useful for easy browser-based demos)
  if (opts.resetOnGet) {
    app.get("/reset", (req: express.Request, res: express.Response) => {
      core.resetCoverage();
      res.json({ ok: true });
    });
  }

  // Return global coverage object on /object as JSON
  app.get("/object", (req: express.Request, res: express.Response) => {
    res.json(core.getCoverageObject() || {});
  });

  // Send self-contained download package with coverage and reports on /download
  app.get("/download", (req: express.Request, res: express.Response) => {
    core.createDownloadPackage((err, archive) => {
      if (err) {
        if (err.message === "No coverage data available") {
          res.statusCode = 404;
          res.setHeader("Content-type", "text/plain");
          return res.end(
            "No coverage data available. Please run some tests first."
          );
        } else {
          console.error("Error creating download package:", err);
          res.statusCode = 500;
          res.setHeader("Content-type", "text/plain");
          return res.end("Error creating download package: " + err.message);
        }
      }

      if (!archive) {
        res.statusCode = 500;
        res.setHeader("Content-type", "text/plain");
        return res.end("Archive creation failed");
      }

      res.statusCode = 200;
      res.setHeader("Content-type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=coverage.zip");

      // Pipe archive data to the response
      archive.pipe(res);
    }, outputDir);
  });

  // Merge client coverage posted from browser
  app.post("/merge", async (req: express.Request, res: express.Response) => {
    const body = req.body;
    if (!(body && typeof body === "object")) {
      return res
        .status(400)
        .send("Please post an object with content-type: application/json");
    }

    try {
      core.mergeClientCoverage(body);
      core.generateCoverageReport(outputDir);

      // Generate LCOV report (only if coverage data exists)
      try {
        core.generateLcovReport(outputDir);
      } catch (lcovErr) {
        // LCOV generation can fail if no coverage data, which is acceptable
        console.debug(
          "LCOV generation skipped:",
          lcovErr instanceof Error ? lcovErr.message : "No coverage data"
        );
      }

      // Generate differential coverage if diffTarget is valid
      if (diffValidation?.isValid && diffTarget) {
        try {
          // Generate diff info and cache it
          const diffInfo = await core.getGitDiffInfo(diffTarget);
          const diffInfoPath = path.join(outputDir, "diff-info.json");
          fs.writeFileSync(
            diffInfoPath,
            JSON.stringify(
              {
                target: diffTarget,
                targetType: diffInfo.targetType,
                changedFiles: diffInfo.changedFiles,
                diffSummary: diffInfo.diffSummary,
                generatedAt: new Date().toISOString(),
              },
              null,
              2
            )
          );

          // Generate differential coverage report
          await core.generateDiffCoverageReport({
            target: diffTarget,
            outputDir: outputDir,
            diffCoverCommand: opts.diffCoverCommand,
          });
        } catch (diffErr) {
          console.warn("Failed to generate differential coverage:", diffErr);
        }
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("Error in merge endpoint:", err);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // Generate LCOV format report
  app.get("/lcov", (req: express.Request, res: express.Response) => {
    try {
      const lcovFilePath = path.join(outputDir, "lcov.info");

      // Check if LCOV file already exists (use cached version)
      if (fs.existsSync(lcovFilePath)) {
        console.log("Using cached LCOV report:", lcovFilePath);
        try {
          const lcovContent = fs.readFileSync(lcovFilePath, "utf8");
          res.setHeader("Content-Type", "text/plain");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=lcov.info"
          );
          res.send(lcovContent);
          return;
        } catch (fileErr) {
          console.error("Error reading cached LCOV file:", fileErr);
          return res.status(500).json({
            error: "Failed to read cached LCOV report",
          });
        }
      }

      // No cached file exists, try to generate a new one
      const coverage = core.getCoverageObject();
      if (!coverage || Object.keys(coverage).length === 0) {
        return res.status(404).json({
          error: "No coverage data available. Please run some tests first.",
        });
      }

      // Generate new LCOV report
      const lcovFile = core.generateLcovReport(outputDir);

      // Read and serve the generated file
      try {
        const lcovContent = fs.readFileSync(lcovFile, "utf8");
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", "attachment; filename=lcov.info");
        res.send(lcovContent);
      } catch (fileErr) {
        console.error("Error reading generated LCOV file:", fileErr);
        return res.status(500).json({
          error: "Failed to read generated LCOV report",
        });
      }
    } catch (err) {
      console.error("Error generating LCOV report:", err);
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to generate LCOV report",
      });
    }
  });

  // Differential coverage info endpoint
  app.get("/diff/info", async (req: express.Request, res: express.Response) => {
    if (!diffValidation?.isValid || !diffTarget) {
      return res.status(400).json({
        error: diffTarget
          ? `Invalid diffTarget: ${
              diffValidation?.error || "Validation failed"
            }`
          : "Differential coverage target not configured. Set diffTarget in options.",
      });
    }

    try {
      // Check if diff info cache exists
      const diffInfoPath = path.join(outputDir, "diff-info.json");

      if (fs.existsSync(diffInfoPath)) {
        // Return cached diff info
        const cachedInfo = JSON.parse(fs.readFileSync(diffInfoPath, "utf8"));
        res.json({
          ...cachedInfo,
          enableDiffCoverage: !!diffTarget,
        });
      } else {
        // Fallback: generate diff info on demand
        const diffInfo = await core.getGitDiffInfo(diffTarget);
        res.json({
          target: diffTarget,
          targetType: diffInfo.targetType,
          changedFiles: diffInfo.changedFiles,
          diffSummary: diffInfo.diffSummary,
          enableDiffCoverage: !!diffTarget,
          note: "This info was generated on demand. POST to /merge to cache it.",
        });
      }
    } catch (err) {
      console.error("Error getting diff info:", err);
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to get diff information",
      });
    }
  });

  return app;
}
