# Coverage Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an 85% line-coverage CI gate using Vitest's built-in threshold mechanism so any PR that drops coverage below 85% is blocked from merging.

**Architecture:** Install `@vitest/coverage-v8`, configure thresholds in `vitest.config.ts`, add a `test:coverage` npm script, and wire a new `coverage` CI job in `test.yml` that runs after the unit-test job passes.

**Tech Stack:** Vitest 4.x, `@vitest/coverage-v8`, GitHub Actions

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `@vitest/coverage-v8` dev dep + `test:coverage` script |
| `vitest.config.ts` | Modify | Add `coverage` config block with v8 provider and 85% lines threshold |
| `.github/workflows/test.yml` | Modify | Add `coverage` job that depends on `test` |
| `package-lock.json` | Modify (auto) | Updated by `npm install` |

---

## Task 1: Install `@vitest/coverage-v8`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (auto)

- [ ] **Step 1: Install the package**

```bash
npm install --save-dev @vitest/coverage-v8
```

Expected: package added under `devDependencies` in `package.json`, `package-lock.json` updated.

- [ ] **Step 2: Verify it installed**

```bash
node -e "const p=require('./package.json'); console.log(p.devDependencies['@vitest/coverage-v8'])"
```

Expected: prints a version string like `^4.1.5`.

---

## Task 2: Configure coverage in `vitest.config.ts` and add `test:coverage` script

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the `coverage` block to `vitest.config.ts`**

Replace the entire file with:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      exclude: ["**/node_modules/**", "**/e2e/**"],
      thresholds: {
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 2: Add the `test:coverage` script to `package.json`**

In the `"scripts"` section, add after `"test:watch"`:

```json
"test:coverage": "vitest run --coverage",
```

The scripts block should look like:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test",
```

---

## Task 3: Verify coverage runs locally and threshold passes

**Files:** none (verification only)

- [ ] **Step 1: Run coverage**

```bash
npm run test:coverage
```

Expected output (last lines):
```
 % Coverage report from v8
 File               | % Stmts | % Branch | % Funcs | % Lines | ...
...
 All files          |   94.xx |    87.xx |   89.xx |   94.xx | ...

 Coverage summary:
  Lines: 94.xx% — passes threshold 85%
```

The command must exit with code 0. If it exits non-zero, check the threshold config.

- [ ] **Step 2: Confirm exit code**

```bash
npm run test:coverage; echo "Exit: $?"
```

Expected: `Exit: 0`

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "feat: add vitest coverage config with 85% lines threshold"
```

---

## Task 4: Add `coverage` job to `.github/workflows/test.yml`

**Files:**
- Modify: `.github/workflows/test.yml`

- [ ] **Step 1: Add the `coverage` job**

Replace the entire file with:

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - run: npm test

  coverage:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - run: npm run test:coverage
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add coverage gate job requiring 85% line coverage"
```
