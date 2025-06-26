# Testing Guide

This document explains how to run tests and work with examples in the Istanbul Middleware TypeScript project.

## Test Structure

The project uses Jest as the testing framework with the following structure:

```
tests/
├── setup.ts              # Test setup and configuration
├── unit/                 # Unit tests for individual functions
│   ├── core.test.ts      # Tests for core coverage functions
│   └── handlers.test.ts  # Tests for HTTP handlers
└── integration/          # Integration tests for full workflows
    └── server.test.ts    # End-to-end server tests
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (for development)

```bash
npm run test:watch
```

### Coverage Reports

```bash
npm run test:coverage
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

## Test Categories

### Unit Tests

**Core Functions (`tests/unit/core.test.ts`)**

- `getCoverageObject()` - Retrieving coverage data
- `resetCoverage()` - Clearing coverage data
- `mergeClientCoverage()` - Merging coverage from clients
- `generateCoverageReport()` - HTML report generation
- `generateLcovReport()` - LCOV report generation
- `validateDiffTarget()` - Diff target validation

**HTTP Handlers (`tests/unit/handlers.test.ts`)**

- `createHandler()` - Handler creation with different options
- Route testing for all endpoints
- Error handling scenarios
- Diff target validation

### Integration Tests

**Server Integration (`tests/integration/server.test.ts`)**

- Complete coverage workflow testing
- Multiple merge operations
- Report generation
- Error handling scenarios
- End-to-end API testing

## Examples

Examples are located in the `examples/` directory:

```
examples/
├── basic-server.js              # Basic server setup
├── custom-output-example.js     # Custom output directory
├── custom-diff-command-example.js # Custom diff-cover command
├── diff-coverage-example.js     # Differential coverage
├── diff-file-example.js         # Using diff files
└── example.diff                 # Sample diff file
```

### Running Examples

**Basic Server**

```bash
npm run test-server
# or
npm run build && node examples/basic-server.js
```

**Custom Output Directory**

```bash
npm run example:custom-output
```

**Differential Coverage**

```bash
npm run example:diff-coverage
```

**Diff File Example**

```bash
npm run example:diff-file
```

### Example Environment Variables

You can customize examples using environment variables:

```bash
# Custom port
PORT=4000 npm run test-server

# Custom output directory
OUTPUT_DIR=/tmp/coverage npm run test-server

# Enable differential coverage
DIFF_TARGET=main npm run test-server

# Custom diff-cover command
COMMAND="pipx run diff-cover" DIFF_TARGET=main npm run test-server
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- TypeScript support via `ts-jest`
- Test file patterns and locations
- Coverage collection settings
- Test timeout configuration

### Test Setup (`tests/setup.ts`)

- Coverage reset before each test
- Global test environment setup
- Cleanup after test completion

## Writing Tests

### Unit Test Example

```typescript
import { getCoverageObject, resetCoverage } from "../../src/core";

describe("Coverage Functions", () => {
  beforeEach(() => {
    resetCoverage();
  });

  it("should return empty object when no coverage exists", () => {
    const coverage = getCoverageObject();
    expect(coverage).toEqual({});
  });
});
```

### Integration Test Example

```typescript
import request from "supertest";
import { createHandler } from "../../src/handlers";

describe("API Integration", () => {
  let app: express.Application;

  beforeEach(async () => {
    app = express();
    const handler = await createHandler();
    app.use("/coverage", handler);
  });

  it("should handle coverage merge", async () => {
    const response = await request(app)
      .post("/coverage/merge")
      .send(mockCoverageData)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## Mocking

The tests use Jest mocking for:

- File system operations (`fs` module)
- External command execution
- Network requests

## Continuous Integration

Tests are automatically run in CI/CD pipelines:

- Before version bumps (`preversion` script)
- In GitHub Actions workflows
- Before publishing to npm

## Debugging Tests

### Running Single Test File

```bash
npx jest tests/unit/core.test.ts
```

### Running Single Test Case

```bash
npx jest --testNamePattern="should return empty object"
```

### Debug Mode

```bash
npx jest --detectOpenHandles --forceExit
```

## Coverage Thresholds

The project maintains high test coverage:

- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

Coverage reports are generated in the `coverage/` directory after running `npm run test:coverage`.

## Best Practices

1. **Reset State**: Always reset coverage data between tests
2. **Mock External Dependencies**: Use Jest mocks for file system and network operations
3. **Test Error Cases**: Include both success and failure scenarios
4. **Use Descriptive Names**: Test names should clearly describe what is being tested
5. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases

## Troubleshooting

### Common Issues

**Tests timing out**

- Increase timeout in Jest configuration
- Check for async operations without proper awaiting

**File system mocks not working**

- Ensure `jest.mock('fs')` is called before imports
- Reset mocks in `beforeEach` blocks

**Coverage data not clearing**

- Verify `resetCoverage()` is called in test setup
- Check global state management

For more help, check the test files for examples or open an issue on GitHub.
