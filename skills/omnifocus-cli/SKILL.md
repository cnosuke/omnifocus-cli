---
name: omnifocus-cli
description: Manage OmniFocus tasks and run full GTD workflows (Capture, Clarify, Organize, Reflect/Weekly Review, Engage) via CLI. Add, update, move, drop, delete, convert, complete, and query tasks, projects, reviews, tags, folders, and perspectives. Use when the user mentions OmniFocus, OF, GTD, inbox processing, weekly review, tasks, or projects.
---

# OmniFocus CLI Skill

Manage OmniFocus tasks and run GTD workflows using the `of` CLI bundled in this plugin.

## Setup

The CLI is at `${CLAUDE_PLUGIN_ROOT}/skills/omnifocus-cli/bin/of`. All commands are self-contained (Omni Automation scripts and the JXA bridge are included in the single bundle).

**Requirements:** macOS, OmniFocus 4 Pro, Node.js >= 20.

## How to Use

**CRITICAL: All commands MUST be run with `dangerouslyDisableSandbox: true` in the Bash tool.**
This CLI communicates with OmniFocus via `osascript` (JXA bridge calling Omni Automation `evaluateJavascript`), which requires macOS automation permissions that are blocked by the sandbox. Without disabling the sandbox, commands will fail with a misleading error ("アプリケーションは実行されていません") even when OmniFocus is running. On first run, OmniFocus may also prompt to allow external script execution.

Run commands via Bash tool:

```bash
${CLAUDE_PLUGIN_ROOT}/skills/omnifocus-cli/bin/of <command> [arguments]
```

## GTD Workflow Playbook

Use these command sequences when facilitating GTD with the user:

1. **Capture (把握)**
   - Quickly add to Inbox: `of task add "<name>" [--note "..."]`
2. **Clarify (見極め / Inbox 処理)**
   - Read inbox + existing structure first: `of inbox list --detailed`, `of projects list --status active`, `of tags list`, `of folders list`
   - For each inbox item, decide and apply:
     - Single action -> `of task update <id> --project "<proj>" --add-tag "<ctx>" [--defer ...] [--due ...] [--estimate <min>]`
     - Multi-step outcome -> `of task to-project <id> [--folder "<folder>"]`, then add next action via `of task add "<next>" --project "<proj>"`
     - Waiting for someone -> `of task update <id> --project "<proj>" --add-tag "<on-hold-tag>"`
     - Not actionable / trash -> `of task drop <id>` or `of task delete <id>` (confirm before permanent delete)
3. **Organize (整理)**
   - Manage areas (folders), projects, and contexts (tags): `of folders list/add`, `of projects add/update/status`, `of tags list/add/status`
   - Create waiting-for tags as on-hold: `of tags add "Waiting For" --on-hold`
4. **Reflect (週次レビュー)**
   - Check inbox zero: `of inbox list`
   - Review completed work: `of tasks list --completed-since "7d ago"`
   - Check upcoming week: `of tasks forecast --days 7`
   - Find stalled active projects (no next action): `of projects list --stalled`
   - Walk through projects due for review: `of review list` -> inspect with `of projects show "<name>" --detailed --tasks` -> update/add next action -> `of review mark "<name>"`
   - Audit waiting-for items: `of tasks list --status blocked --tag "<waiting-tag>"`
5. **Engage (実行・選択)**
   - Recommend next actions by context, time, and urgency:
     - `of tasks list --tag "<context>" --max-estimate <minutes>` (defaults to `--status available`, excluding blocked/deferred/on-hold items)
     - `of tasks list --status next --detailed`
     - `of tasks today` / `of tasks overdue` / `of tasks flagged`
   - Complete or undo: `of task complete <id>` / `of task uncomplete <id>`

## Commands Reference

### Inbox

```bash
of inbox list                    # List inbox tasks (brief)
of inbox list --detailed         # List with full details
```

### Task

```bash
# Add (inbox, project, subtask, repeating)
of task add "Task name"
of task add "Review PR" --project Work --due tomorrow --flagged --estimate 30 --tag "@PC"
of task add "Substep" --parent "<task-id>" --sequential
of task add "Weekly review" --repeat "FREQ=WEEKLY;INTERVAL=1" --repeat-method fixed

# Show details (with optional active children)
of task show "<id>" [--children]

# Update properties, tags, recurrence, or move container
of task update "<id>" \
  [--name "..."] [--note "..." | --append-note "..."] \
  [--due <date> | --clear-due] [--defer <date> | --clear-defer] \
  [--estimate <min> | --clear-estimate] [--flagged | --unflagged] \
  [--sequential | --parallel] \
  [--add-tag <name>] [--remove-tag <name>] [--clear-tags] \
  [--project <name> | --parent <id> | --inbox] \
  [--repeat <ics-rule> [--repeat-method fixed|due-date|defer-until-date] | --clear-repeat]

# Complete / uncomplete / drop / delete / convert to project
of task complete "<id>"
of task uncomplete "<id>"
of task drop "<id>" [--all-occurrences]
of task delete "<id>"
of task to-project "<id>" [--folder "<name>"]

# Search
of task search "keyword" [--project Work] [--flagged] [--limit 10]
```

### Tasks (Query & Forecast)

```bash
# Flexible query (defaults to --status available)
of tasks list \
  [--status available|next|blocked|remaining|completed|dropped] \
  [--tag <name>] [--project <name>] [--flagged] \
  [--max-estimate <minutes>] [--due-before <date>] [--defer-before <date>] \
  [--completed-since <date>] [--detailed] [--limit <n>]

# Forecast (overdue, upcoming due, upcoming deferred)
of tasks forecast [--days 7]

# Quick views
of tasks today      # Due today (including overdue)
of tasks overdue    # Overdue
of tasks flagged    # Flagged
```

### Projects

```bash
of projects list [--status active|on-hold|done|dropped] [--folder "<name>"] [--stalled] [--limit <n>]
of projects show "<name>" [--detailed] [--tasks]
of projects add "<name>" [--folder "<name>"] [--due <date>] [--defer <date>] [--flagged] [--note "..."] [--sequential | --single-actions] [--tag <name>] [--review-interval 1w]
of projects update "<name>" \
  [--name "<new>"] [--note "..." | --append-note "..."] \
  [--due <date> | --clear-due] [--defer <date> | --clear-defer] \
  [--flagged | --unflagged] [--sequential | --parallel | --single-actions] \
  [--add-tag <name>] [--remove-tag <name>] [--clear-tags] \
  [--folder "<name>" | --top-level] [--review-interval 2w] [--next-review <date>]
of projects status "<name>" active|on-hold|done|dropped
```

### Review

```bash
of review list [--status active|on-hold]    # Projects due for review (nextReviewDate <= now)
of review mark "<project-name>"             # Mark project reviewed now
```

### Tags & Folders

```bash
of tags list [--status active|on-hold|dropped]
of tags add "<name>" [--parent "<name>"] [--on-hold]
of tags status "<name>" active|on-hold|dropped

of folders list [--status active|dropped]
of folders add "<name>" [--parent "<name>"]
```

### Perspectives

```bash
of perspectives list
```

## Date & Interval Formats

| Format              | Example                       | Description              |
| ------------------- | ----------------------------- | ------------------------ |
| `today`             | `--due today`                 | Today at 17:00           |
| `tomorrow`          | `--due tomorrow`              | Tomorrow at 17:00        |
| `yesterday`         | `--completed-since yesterday` | Yesterday                |
| `next week`         | `--due "next week"`           | 7 days from now          |
| `+Nd` / `+Nw`       | `--due +3d`, `--defer +2w`    | N days / weeks from now  |
| `Nd ago` / `Nw ago` | `--completed-since "7d ago"`  | N days / weeks ago       |
| `-Nd` / `-Nw`       | `--completed-since=-7d`       | N days / weeks ago (`=`) |
| ISO 8601            | `--due 2026-03-15`            | Specific date            |

Review intervals (`--review-interval`): `<N>d`, `<N>w`, `<N>m`, `<N>y` (e.g., `7d`, `2w`, `1m`, `1y`).

## Guidelines

- When user says "OF" they mean OmniFocus
- Always use the full path `${CLAUDE_PLUGIN_ROOT}/skills/omnifocus-cli/bin/of` to invoke the CLI
- Always run `of tags list` and `of projects list` before assigning tags or projects if you don't already know the exact names (unknown tags/projects fail fast)
- Confirm with the user before destructive actions like `of task delete` or bulk status changes
- Use `Nd ago` (e.g., `"7d ago"`) or `=` syntax (`--completed-since=-7d`) for negative relative dates so CLI arg parsing never treats `-7d` as a flag
