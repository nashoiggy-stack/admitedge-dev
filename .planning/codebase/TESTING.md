# Testing

## Current State

**No test framework is configured.** The project has no test files, no test runner, and no coverage tooling.

## What Exists

- No `jest`, `vitest`, `playwright`, or `cypress` in dependencies
- No `__tests__/`, `*.test.ts`, or `*.spec.ts` files found
- No test scripts in `package.json`
- No CI/CD pipeline configured

## What Should Be Tested

### Priority 1: Scoring Logic
- `src/lib/admissions.ts` — GPA comparison, test score comparison, classification, essay adjustment
- `src/lib/profile-types.ts` — SAT/ACT composite calculations
- Pure functions, no dependencies — ideal for unit tests

### Priority 2: API Routes
- `src/app/api/grade/route.ts` — essay grading endpoint
- `src/app/api/chat/route.ts` — coaching chat endpoint
- `src/app/api/ec-chat/route.ts` — EC chatbot endpoint
- `src/app/api/ec-evaluate/route.ts` — EC evaluation endpoint
- Integration tests with mocked Anthropic responses

### Priority 3: Hooks
- `src/hooks/useProfile.ts` — localStorage read/write, computed values
- `src/hooks/useChanceCalculator.ts` — auto-fill from profile, score computation
- `src/hooks/useCollegeFilter.ts` — filtering + classification logic

### Priority 4: E2E
- Critical user flows: sign in, grade essay, calculate GPA, build college list

## Recommendations

1. Add `vitest` for unit/integration tests (fast, native ESM/TS support)
2. Add `playwright` for E2E tests
3. Start with admissions.ts — highest value, easiest to test
4. Target 80% coverage on scoring logic before expanding
