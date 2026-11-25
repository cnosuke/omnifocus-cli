# CLAUDE.md

## Commands

```bash
npm run build             # Bundle CLI (vp pack) and copy to skills/omnifocus-cli/bin/of
npm run dev               # Dev mode
npm run check             # Lint + type check + format check
npm run fix               # Auto-fix lint and format issues
npm run test              # Tests in watch mode (vitest)
npm run test:run          # Tests once
npm run test:integration  # Integration tests (requires OmniFocus running)
```

## Architecture

TypeScript CLI that automates OmniFocus via a thin JXA bridge calling Omni Automation (`app.evaluateJavascript`).
CLI parses args (Node `parseArgs`) and validates/normalizes dates in TypeScript -> builds wrapped Omni Automation script -> executes via `osascript -l JavaScript - <json-payload>` -> parses JSON response.

- `src/cli/` - CLI entry point, command router, command handlers, date parser, arg parser helpers
- `src/jxa/` - Omni Automation script builders, JXA `evaluateJavascript` bridge, `osascript` runner, response parser
- `src/types/` - Shared type definitions and project status validation
- `tests/unit/` and `tests/integration/`

## Toolchain

- Vite Plus (`vp`) for build, lint, format, and test
- ESM only (`"type": "module"`)
- Formatting: `singleQuote`, `trailingComma: 'all'`
- Lint: `typeAware` enabled

## Gotchas

- Omni Automation code in `src/jxa/helpers.ts` and `src/jxa/scripts/` is embedded JS string (not TypeScript) — verified by executing generated scripts against mock Omni Automation globals in `tests/unit/jxa/scripts.test.ts`
- `wrapOmniScript()` wraps all scripts with `Application("OmniFocus").running()` check, JSON input injection, and `evaluateJavascript` error handling
- `flattenedTasks` in Omni Automation includes project root tasks (`task.project !== null`); task list/search scripts exclude them
- Integration tests require `OF_INTEGRATION=1` env var and OmniFocus running on macOS
- Import paths must use `.js` extension (Node16 module resolution)
