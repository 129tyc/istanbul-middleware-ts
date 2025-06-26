import { resetCoverage } from "../src/core";

// Reset coverage before each test to ensure clean state
beforeEach(() => {
  resetCoverage();
});

// Clean up any global state after all tests
afterAll(() => {
  resetCoverage();
});
