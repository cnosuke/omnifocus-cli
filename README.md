# OmniFocus CLI (`of`)

A CLI wrapper for OmniFocus automation via JXA (JavaScript for Automation). Provides a friendly command-line interface to manage OmniFocus tasks.

## Requirements

- macOS
- OmniFocus 4 Pro
- Optional: `jq` for pretty-printed JSON output

## Setup

```bash
# Build
cd omnifocus-skills
./build.sh

# Run directly
./of tasks today

# Or add to PATH
ln -s "$(pwd)/dist/of" /usr/local/bin/of
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

| Format       | Example        | Description                    |
|--------------|----------------|--------------------------------|
| `today`      | `--due today`  | Today at 17:00                 |
| `tomorrow`   | `--due tomorrow` | Tomorrow at 17:00            |
| `next week`  | `--due "next week"` | 7 days from now at 17:00  |
| `+Nd`        | `--due +3d`    | N days from now at 17:00       |
| `+Nw`        | `--due +2w`    | N weeks from now at 17:00      |
| ISO 8601     | `--due 2026-03-15` | Specific date              |

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

| Field       | Type    | Description          |
|-------------|---------|----------------------|
| `id`        | string  | OmniFocus task ID    |
| `name`      | string  | Task name            |
| `dueDate`   | string? | ISO 8601 due date    |
| `flagged`   | boolean | Flagged status       |
| `completed` | boolean | Completion status    |

**Detailed output** adds (`formatTaskDetail`):

| Field              | Type     | Description              |
|--------------------|----------|--------------------------|
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
omnifocus-skills/
  lib/helpers.js    # Shared JXA utility functions
  scripts/          # Individual JXA script sources
  dist/             # Built self-contained scripts (gitignored)
  of                # CLI wrapper script
  build.sh          # Build script
```

### Build Process

`build.sh` concatenates `lib/helpers.js` with each script in `scripts/` to produce standalone files in `dist/`. Each built script includes all helper functions and can run independently via `osascript -l JavaScript`.

```bash
./build.sh
# => Built 7 scripts to dist/
```

### Adding a New Script

1. Create a new `.js` file in `scripts/` (e.g., `scripts/of-task-defer.js`)
2. Use helper functions from `lib/helpers.js` directly (they will be prepended at build time)
3. Run `./build.sh` to generate the combined script in `dist/`
