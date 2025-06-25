import express from "express";
import * as bodyParser from "body-parser";
import * as path from "path";
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
export function createHandler(opts: HandlerOptions = {}): express.Application {
  const app = express();

  // Configure body parser options
  const urlOptions = { extended: IS_EXTENDED, limit: FILE_SIZE_MAXIMUM };
  const jsonOptions = { limit: FILE_SIZE_MAXIMUM };

  // Serve static files from output directory
  app.use("/", express.static(path.join(process.cwd(), "output")));

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
    });
  });

  // Merge client coverage posted from browser
  app.post("/merge", (req: express.Request, res: express.Response) => {
    const body = req.body;
    if (!(body && typeof body === "object")) {
      return res
        .status(400)
        .send("Please post an object with content-type: application/json");
    }

    core.mergeClientCoverage(body);
    core.generateCoverageReport();
    res.json({ ok: true });
  });

  return app;
}
