# OmniFocus CLI (`of`)

A CLI for OmniFocus automation built with TypeScript and JXA (JavaScript for Automation). Provides a friendly command-line interface to manage OmniFocus tasks.

## Requirements

- macOS
- OmniFocus 4 Pro
- Node.js >= 20

## Setup

```bash
npm install
npm run build

# Run directly
./dist/index.mjs tasks today

# Or link globally
npm link
of tasks today
```

## Usage

### Inbox

```bash
of inbox list                    # List inbox tasks (brief)
of inbox list --detailed         # List with full details
```

### Task Management

```bash
# Add tasks
of task add "Buy milk"
of task add "Review PR" --project Work --due tomorrow --flagged
of task add "Write report" --due "+3d" --defer today --note "Q1 summary" --estimate 60
of task add "Deploy" --tag urgent --tag ops

# Complete a task
of task complete "task-id-here"

# Search tasks
of task search "quarterly"
of task search "review" --project Work --flagged --limit 10
```

### Task Lists

```bash
of tasks today                   # Tasks due today
of tasks overdue                 # Overdue tasks
of tasks flagged                 # Flagged tasks
```

## Date Formats

| Format      | Example             | Description               |
| ----------- | ------------------- | ------------------------- |
| `today`     | `--due today`       | Today at 17:00            |
| `tomorrow`  | `--due tomorrow`    | Tomorrow at 17:00         |
| `next week` | `--due "next week"` | 7 days from now at 17:00  |
| `+Nd`       | `--due +3d`         | N days from now at 17:00  |
| `+Nw`       | `--due +2w`         | N weeks from now at 17:00 |
| ISO 8601    | `--due 2026-03-15`  | Specific date             |

Default time is 17:00 for relative and keyword-based dates.

## Output Format

All commands return JSON. If `jq` is installed, output is automatically pretty-printed.

**Success (list):**

```json
{
  "success": true,
  "tasks": [...],
  "totalCount": 5
}
```

**Success (single task):**

```json
{
  "success": true,
  "task": { "id": "abc123", "name": "Buy milk", ... }
}
```

**Error:**

```json
{
  "success": false,
  "error": "OmniFocus is not running"
}
```

## Task Fields

**Brief output** (`formatTaskBrief`):

| Field       | Type    | Description       |
| ----------- | ------- | ----------------- |
| `id`        | string  | OmniFocus task ID |
| `name`      | string  | Task name         |
| `dueDate`   | string? | ISO 8601 due date |
| `flagged`   | boolean | Flagged status    |
| `completed` | boolean | Completion status |

**Detailed output** adds (`formatTaskDetail`):

| Field              | Type     | Description              |
| ------------------ | -------- | ------------------------ |
| `note`             | string   | Task note                |
| `deferDate`        | string?  | ISO 8601 defer date      |
| `completionDate`   | string?  | ISO 8601 completion date |
| `estimatedMinutes` | number?  | Time estimate in minutes |
| `inInbox`          | boolean  | Whether task is in inbox |
| `tags`             | string[] | Tag names                |
| `projectName`      | string?  | Containing project name  |

## Development

### Directory Structure

```
src/
  cli/
    commands/       # Command handlers (inbox, task, tasks)
    index.ts        # Entry point
    main.ts         # Command router
    run-and-print.ts
  jxa/
    scripts/        # JXA script generators
    helpers.ts      # Shared JXA helpers and wrapJxaScript()
    runner.ts       # osascript execution via execFile
    parse.ts        # JSON response parser
    types.ts        # JXA-related type definitions
  types/
    index.ts        # Shared type definitions
tests/
  unit/             # Unit tests
  integration/      # Integration tests (requires OmniFocus)
```

### Build & Test

```bash
npm run build          # Bundle with Vite Plus (vp pack)
npm run dev            # Development mode
npm run check          # Lint and type check
npm run fix            # Auto-fix lint issues
npm run test           # Run tests in watch mode
npm run test:run       # Run tests once
npm run test:integration  # Run integration tests (requires OmniFocus)
```

### Adding a New Script

1. Create a new `.ts` file in `src/jxa/scripts/` for the JXA logic
2. Create a command handler in `src/cli/commands/` if needed
3. Register the command in `src/cli/main.ts`
4. Add tests in `tests/`
