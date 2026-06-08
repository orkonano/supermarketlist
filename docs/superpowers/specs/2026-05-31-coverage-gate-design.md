# Coverage Gate — Design Spec

**Date:** 2026-05-31  
**Status:** Approved

## Summary

Add an 85% line-coverage gate to the GitHub Actions CI pipeline using Vitest's built-in threshold mechanism. Coverage runs as a separate CI job that depends on the unit-test job passing first.

## Context

Current coverage (2026-05-31):

| Metric | Coverage |
|---|---|
| Statements | 94.36% |
| Branches | 87.63% |
| Functions | 89.69% |
| Lines | 94.52% |

All metrics are already above 85%, so the gate passes with no test changes required.

## Changes

### 1. `vitest.config.ts`

Add a `coverage` block:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "json-summary"],
  exclude: ["**/node_modules/**", "**/e2e/**"],
  thresholds: {
    lines: 85,
  },
},
```

- `provider: "v8"` — requires @vitest/coverage-v8 (installed in Task 1)
- `reporter: ["text", "json-summary"]` — prints table to terminal; writes `coverage/coverage-summary.json` for future tooling
- `thresholds.lines: 85` — Vitest exits non-zero when line coverage drops below 85%

### 2. `package.json`

Add script:

```json
"test:coverage": "vitest run --coverage"
```

`npm test` remains unchanged so local developer workflows are unaffected.

### 3. `.github/workflows/test.yml`

Add a `coverage` job:

```yaml
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

`needs: test` ensures coverage only runs after the unit-test job passes.

## Failure behavior

When line coverage drops below 85%, Vitest prints:

```
ERROR: Coverage for lines (xx.x%) does not meet global threshold (85%)
```

The job exits non-zero, blocking the PR from merging (requires branch protection rules to enforce CI checks).

## Out of scope

- Branch, function, or statement thresholds
- Coverage badges or PR comments
- Artifact upload of coverage reports
- Third-party coverage services (Codecov, etc.)
