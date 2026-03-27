# CLAUDE.md

## Commands

npm run build          # Bundle CLI (vp pack)
npm run dev            # Dev mode
npm run check          # Lint + type check
npm run fix            # Auto-fix lint issues
npm run test           # Tests in watch mode (vitest)
npm run test:run       # Tests once
npm run test:integration  # Integration tests (requires OmniFocus running)

## Architecture

TypeScript CLI that automates OmniFocus via JXA (JavaScript for Automation).
CLI parses args → builds JXA script string → executes via `osascript -l JavaScript` → parses JSON response.

- `src/cli/` - CLI entry point, command router, command handlers
- `src/jxa/` - JXA script generators, helpers, osascript runner
- `src/types/` - Shared type definitions
- `tests/unit/` and `tests/integration/`

## Toolchain

- Vite Plus (`vp`) for build, lint, format, and test
- ESM only (`"type": "module"`)
- Formatting: singleQuote, trailingComma: 'all'
- Lint: typeAware enabled

## Gotchas

- JXA code in `src/jxa/helpers.ts` is a raw JS string (not TypeScript) — no type checking on JXA content
- `wrapJxaScript()` wraps all JXA scripts with OmniFocus-running check and error handling
- Integration tests require `OF_INTEGRATION=1` env var and OmniFocus running on macOS
- Import paths must use `.js` extension (Node16 module resolution)
