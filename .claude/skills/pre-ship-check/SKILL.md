---
name: pre-ship-check
description: Runs the Eraser checks in order (type check, tests, build) and reports pass or fail for each. Use before committing, merging or deploying.
disable-model-invocation: true
---

# Pre-ship check

Run in order and stop at the first failure; show its output and fix the cause (don't silence it).

1. `npx tsc --noEmit`
2. `npm test`
3. `npm run build`

ESLint is not configured, so skip `npm run lint`. Finish with one line per step: pass or fail.
