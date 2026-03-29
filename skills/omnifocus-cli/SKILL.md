---
name: omnifocus-cli
description: Manage OmniFocus tasks via CLI. Add, complete, search tasks. List inbox, today, overdue, flagged tasks. List perspectives and manage projects. Use when the user mentions OmniFocus, OF, tasks, inbox, or wants to manage their task list.
---

# OmniFocus CLI Skill

Manage OmniFocus tasks using the `of` CLI bundled in this plugin.

## Setup

The CLI is at `${CLAUDE_PLUGIN_ROOT}/dist/index.mjs`. All commands are self-contained (JXA scripts included in the single bundle).

**Requirements:** macOS, OmniFocus 4 Pro, Node.js >= 20, optional `jq` for pretty-printed JSON.

## How to Use

Run commands via Bash tool:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs <command> [arguments]
```

## Commands

### Inbox

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs inbox list                    # List inbox tasks (brief)
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs inbox list --detailed         # List with full details
```

### Add Task

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs task add "Task name"
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs task add "Review PR" --project Work --due tomorrow --flagged
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs task add "Write report" --due "+3d" --defer today --note "Q1 summary" --estimate 60
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs task add "Deploy" --tag urgent --tag ops
```

**Options:**
- `--project <name>` -- Assign to project
- `--due <date>` -- Due date
- `--defer <date>` -- Defer date
- `--flagged` -- Mark as flagged
- `--note <text>` -- Add a note
- `--estimate <minutes>` -- Estimated duration
- `--tag <name>` -- Add tag (repeatable)

### Complete Task

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs task complete "task-id"
```

### Search Tasks

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs task search "keyword"
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs task search "review" --project Work --flagged --limit 10
```

### Task Lists

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs tasks today      # Due today
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs tasks overdue    # Overdue
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs tasks flagged    # Flagged
```

### Perspectives

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs perspectives list    # List all perspective names
```

### Projects

```bash
# List projects
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects list                          # All projects
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects list --status active          # Filter by status
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects list --folder "Work"          # Filter by folder

# Show project details
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects show "My Project"             # Brief info
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects show "My Project" --detailed  # Full details
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects show "My Project" --tasks     # Include tasks

# Create a project
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects add "New Project"
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects add "Work Project" --folder "Work" --due "next week" --sequential
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects add "Side Project" --tag dev --tag personal --flagged

# Change project status
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects status "Old Project" done
node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs projects status "Paused Project" on-hold
```

**Status values:** `active`, `on-hold`, `done`, `dropped`

## Date Formats

| Format | Example | Description |
|--------|---------|-------------|
| `today` | `--due today` | Today at 17:00 |
| `tomorrow` | `--due tomorrow` | Tomorrow at 17:00 |
| `next week` | `--due "next week"` | 7 days from now |
| `+Nd` | `--due +3d` | N days from now |
| `+Nw` | `--due +2w` | N weeks from now |
| ISO 8601 | `--due 2026-03-15` | Specific date |

## Output

All commands return JSON. Parse with `jq` if needed.

```json
{"success": true, "tasks": [...], "totalCount": 5}
{"success": true, "task": {"id": "abc123", "name": "Buy milk"}}
{"success": true, "projects": [...], "totalCount": 3}
{"success": true, "perspectives": ["Inbox", "Forecast", ...]}
{"success": false, "error": "OmniFocus is not running"}
```

## Guidelines

- When user says "OF" they mean OmniFocus
- Always use the full path `node ${CLAUDE_PLUGIN_ROOT}/dist/index.mjs` to invoke the CLI
- Parse JSON output to present results in a readable format
- When adding tasks, infer appropriate flags from context (e.g. work-related -> `--project Work`)
- Convert relative date references from user to the CLI date format (e.g. "in 3 days" -> `--due +3d`)
