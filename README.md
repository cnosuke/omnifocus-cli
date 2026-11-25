# OmniFocus CLI (`of`)

A CLI for OmniFocus 4 Pro automation built with TypeScript and a thin JXA bridge calling Omni Automation (`app.evaluateJavascript`). Covers the full GTD workflow (Capture, Clarify, Organize, Reflect, Engage).

## Requirements

- macOS
- OmniFocus 4 Pro
- Node.js >= 20

## Setup

### As a Claude Code Plugin

```bash
claude plugin install github:cnosuke/omnifocus-cli
```

Once installed, Claude Code automatically loads the OmniFocus skill and can manage your tasks and GTD workflows directly through conversation.

### As a standalone CLI

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

### Inbox (Capture / Clarify)

```bash
of inbox list                    # List inbox tasks (brief)
of inbox list --detailed         # List with full details
```

### Task Management (Capture / Clarify / Engage)

```bash
# Add tasks (inbox, project, subtask, repeating)
of task add "Buy milk"
of task add "Review PR" --project Work --due tomorrow --flagged
of task add "Write report" --due "+3d" --defer today --note "Q1 summary" --estimate 60
of task add "Deploy" --tag urgent --tag ops
of task add "Draft outline" --parent "task-id-here" --estimate 30
of task add "Weekly review" --repeat "FREQ=WEEKLY;INTERVAL=1" --repeat-method fixed

# Show full task details (optionally with active children)
of task show "task-id-here"
of task show "task-id-here" --children

# Update properties, tags, recurrence, or move container (project / parent / inbox)
of task update "task-id-here" --project Work --add-tag "@PC" --estimate 15
of task update "task-id-here" --defer "+3d" --clear-due --unflagged
of task update "task-id-here" --append-note "\nFollow up with Alice"

# Complete / uncomplete / drop / delete
of task complete "task-id-here"
of task uncomplete "task-id-here"
of task drop "task-id-here"
of task drop "task-id-here" --all-occurrences
of task delete "task-id-here"

# Convert a multi-step task into a project
of task to-project "task-id-here"
of task to-project "task-id-here" --folder "Work"

# Search tasks
of task search "quarterly"
of task search "review" --project Work --flagged --limit 10
```

### Task Lists & Forecast (Engage / Reflect)

```bash
# Flexible query (defaults to --status available)
of tasks list                                       # Currently available tasks
of tasks list --tag "@PC" --max-estimate 30         # Context + time filter
of tasks list --status next --detailed              # Next actions across projects
of tasks list --status blocked --tag "Waiting For"  # Waiting-for / blocked items
of tasks list --completed-since "7d ago"            # Completed in the last 7 days

# Forecast: overdue, upcoming due, and deferred tasks becoming available
of tasks forecast                                   # Next 7 days (default)
of tasks forecast --days 3

# Quick views
of tasks today                   # Tasks due today (including overdue)
of tasks overdue                 # Overdue tasks
of tasks flagged                 # Flagged tasks
```

### Projects (Organize / Reflect)

```bash
# List projects
of projects list                          # All projects
of projects list --status active          # Filter by status (active, on-hold, done, dropped)
of projects list --folder "Work"          # Filter by folder
of projects list --stalled                # Active projects with no available next action

# Show project details (including review info & nextTask with --detailed)
of projects show "My Project"
of projects show "My Project" --detailed
of projects show "My Project" --tasks

# Create a project
of projects add "New Project"
of projects add "Work Project" --folder "Work" --due "next week" --sequential
of projects add "Misc Errands" --single-actions --review-interval 2w

# Update project properties, folder, type, tags, or review settings
of projects update "My Project" --folder "Work" --review-interval 1w
of projects update "Old Name" --name "New Name" --parallel --clear-due

# Change project status
of projects status "Old Project" done
of projects status "Paused Project" on-hold
```

### Weekly Review (Reflect)

```bash
of review list                   # Active & on-hold projects due for review (oldest first)
of review list --status active   # Filter by active or on-hold
of review mark "My Project"      # Mark project reviewed now
```

### Tags & Folders (Organize)

```bash
# Tags (contexts / waiting-for)
of tags list                             # All tags with available/remaining counts
of tags list --status on-hold            # Filter by active, on-hold, dropped
of tags add "@PC"
of tags add "Waiting For" --on-hold
of tags add "Alice" --parent "Waiting For"
of tags status "Waiting For" on-hold

# Folders (areas of responsibility)
of folders list                          # All folders
of folders list --status active          # Filter by active, dropped
of folders add "Work"
of folders add "Q2" --parent "Work"
```

### Perspectives

```bash
of perspectives list             # List all perspective names
```

## Date & Interval Formats

| Format              | Example                       | Description                  |
| ------------------- | ----------------------------- | ---------------------------- |
| `today`             | `--due today`                 | Today at 17:00               |
| `tomorrow`          | `--due tomorrow`              | Tomorrow at 17:00            |
| `yesterday`         | `--completed-since yesterday` | Yesterday                    |
| `next week`         | `--due "next week"`           | 7 days from now at 17:00     |
| `+Nd` / `+Nw`       | `--due +3d`, `--defer +2w`    | N days / weeks from now      |
| `Nd ago` / `Nw ago` | `--completed-since "7d ago"`  | N days / weeks ago           |
| `-Nd` / `-Nw`       | `--completed-since=-7d`       | N days / weeks ago (use `=`) |
| ISO 8601            | `--due 2026-03-15`            | Specific date or datetime    |

Default time is 17:00 for `--due` / `--defer`. Date-only boundary filters use start-of-day (`00:00:00`) for `--completed-since` and end-of-day (`23:59:59.999`) for `--due-before` / `--defer-before`.

Review intervals (`--review-interval`) accept `<N>d`, `<N>w`, `<N>m`, or `<N>y` (e.g. `7d`, `2w`, `1m`, `1y`).

## Output Format

All commands output pretty-printed JSON to stdout on success. On failure, an error message (`Error: ...`) is printed to stderr and the process exits with code `1`.

```json
{
  "success": true,
  "tasks": [...],
  "totalCount": 5
}
```

## Task & Project Fields

**Task brief** (`formatTaskBrief`): `id`, `name`, `dueDate`, `flagged`, `completed`.

**Task detail** adds (`formatTaskDetail`): `note`, `deferDate`, `completionDate`, `estimatedMinutes`, `inInbox`, `tags`, `projectName`, `taskStatus` (`available`, `next`, `blocked`, `due-soon`, `overdue`, `completed`, `dropped`), `parentId`, `hasChildren`, `sequential`, `repetitionRule`.

**Project brief** (`formatProjectBrief`): `id`, `name`, `status`, `dueDate`, `deferDate`, `flagged`, `taskCount`, `folderName`.

**Project detail** adds (`formatProjectDetail`): `note`, `completionDate`, `estimatedMinutes`, `sequential`, `singleActions`, `tags`, `lastReviewDate`, `nextReviewDate`, `reviewInterval`, `nextTask`.

## Development

### Directory Structure

```
src/
  cli/
    commands/       # Command handlers (inbox, task, tasks, projects, review, tags, folders, perspectives)
    arg-utils.ts    # Shared argument parsing helpers
    date.ts         # Date and boundary parser
    index.ts        # Entry point
    main.ts         # Command router
    run-and-print.ts
  jxa/
    scripts/        # Omni Automation script generators
    helpers.ts      # Shared Omni Automation helpers and wrapOmniScript()
    runner.ts       # osascript execution via execFile
    parse.ts        # JSON response parser
    types.ts        # Runner type definitions
  types/
    index.ts        # Shared type definitions and validators
tests/
  unit/             # Unit tests (CLI + node:vm script execution tests)
  integration/      # Read-only integration tests (requires OmniFocus)
```

### Build & Test

```bash
npm run build             # Bundle with Vite Plus (vp pack) & copy to skills/omnifocus-cli/bin/of
npm run dev               # Development mode
npm run check             # Lint, type check, and format check
npm run fix               # Auto-fix lint and format issues
npm run test              # Run tests in watch mode
npm run test:run          # Run unit tests once
npm run test:integration  # Run read-only integration tests (requires OmniFocus)
```
