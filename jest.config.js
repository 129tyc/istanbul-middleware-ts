module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/index.ts", // Entry point, just exports
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json-summary"],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 80,
      lines: 70,
    },
    // Specific file thresholds can be added here
    "src/core.ts": {
      statements: 70,
      branches: 55,
      functions: 80,
      lines: 70,
    },
    "src/handlers.ts": {
      statements: 75,
      branches: 60,
      functions: 100, // All functions should be tested
      lines: 75,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 10000,
  verbose: true,
  // Additional coverage configuration
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/tests/",
  ],
};
