import { runAndPrint } from '../run-and-print.js';
import { requireFlagValue, requireInteger, requirePositionalArg } from '../arg-utils.js';
import { TASK_ADD_SCRIPT, buildTaskAddArgs } from '../../jxa/scripts/task-add.js';
import { TASK_COMPLETE_SCRIPT, buildTaskCompleteArgs } from '../../jxa/scripts/task-complete.js';
import { TASK_SEARCH_SCRIPT, buildTaskSearchArgs } from '../../jxa/scripts/task-search.js';
import type { TaskAddOptions, TaskSearchOptions } from '../../types/index.js';

export async function taskAdd(args: string[]): Promise<void> {
  let name = '';
  const options: TaskAddOptions = {};
  const tags: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--project':
        options.project = requireFlagValue('--project', args, ++i);
        break;
      case '--due':
        options.dueDate = requireFlagValue('--due', args, ++i);
        break;
      case '--defer':
        options.deferDate = requireFlagValue('--defer', args, ++i);
        break;
      case '--flagged':
        options.flagged = true;
        break;
      case '--note':
        options.note = requireFlagValue('--note', args, ++i);
        break;
      case '--estimate':
        options.estimatedMinutes = requireInteger(
          '--estimate',
          requireFlagValue('--estimate', args, ++i),
        );
        break;
      case '--tag':
        tags.push(requireFlagValue('--tag', args, ++i));
        break;
      case '--help':
      case '-h':
        printTaskAddHelp();
        return;
      default:
        name = requirePositionalArg(args, arg, name, 'of task add --help');
    }
  }

  if (!name) {
    throw new Error("Task name is required. Run 'of task add --help' for usage.");
  }

  if (tags.length > 0) {
    options.tags = tags;
  }

  await runAndPrint(TASK_ADD_SCRIPT, buildTaskAddArgs(name, options));
}

export async function taskComplete(args: string[]): Promise<void> {
  let taskId = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printTaskCompleteHelp();
      return;
    }
    taskId = requirePositionalArg(args, arg, taskId, 'of task complete --help');
  }

  if (!taskId) {
    throw new Error("Task ID is required. Run 'of task complete --help' for usage.");
  }

  await runAndPrint(TASK_COMPLETE_SCRIPT, buildTaskCompleteArgs(taskId));
}

export async function taskSearch(args: string[]): Promise<void> {
  let keyword = '';
  const options: TaskSearchOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--project':
        options.project = requireFlagValue('--project', args, ++i);
        break;
      case '--flagged':
        options.flagged = true;
        break;
      case '--limit':
        options.limit = requireInteger('--limit', requireFlagValue('--limit', args, ++i));
        break;
      case '--help':
      case '-h':
        printTaskSearchHelp();
        return;
      default:
        keyword = requirePositionalArg(args, arg, keyword, 'of task search --help');
    }
  }

  if (!keyword) {
    throw new Error("Search keyword is required. Run 'of task search --help' for usage.");
  }

  await runAndPrint(TASK_SEARCH_SCRIPT, buildTaskSearchArgs(keyword, options));
}

export function runTask(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'add':
      return taskAdd(args.slice(1));
    case 'complete':
      return taskComplete(args.slice(1));
    case 'search':
      return taskSearch(args.slice(1));
    case '--help':
    case '-h':
      printTaskHelp();
      return Promise.resolve();
    default:
      throw new Error(`Unknown task subcommand '${sub ?? ''}'. Run 'of task --help' for usage.`);
  }
}

function printTaskAddHelp(): void {
  console.log(`Usage: of task add <name> [options]

Add a new task to OmniFocus.

Arguments:
  <name>                  Task name (required)

Options:
  --project <name>        Assign to project
  --due <date>            Due date (e.g. "2026-03-15", "tomorrow")
  --defer <date>          Defer date
  --flagged               Mark as flagged
  --note <text>           Add a note
  --estimate <minutes>    Estimated duration in minutes
  --tag <name>            Add a tag (repeatable)

Examples:
  of task add "Buy groceries"
  of task add "Write report" --project "Work" --due "2026-03-15" --flagged
  of task add "Read book" --tag "personal" --tag "reading" --estimate 60`);
}

function printTaskCompleteHelp(): void {
  console.log(`Usage: of task complete <id>

Mark a task as complete.

Arguments:
  <id>    Task ID (required)

Examples:
  of task complete "nPaAZJbFJcj"`);
}

function printTaskSearchHelp(): void {
  console.log(`Usage: of task search <keyword> [options]

Search for tasks by keyword.

Arguments:
  <keyword>               Search keyword (required)

Options:
  --project <name>        Filter by project
  --flagged               Only flagged tasks
  --limit <n>             Max number of results

Examples:
  of task search "report"
  of task search "meeting" --project "Work" --flagged --limit 10`);
}

function printTaskHelp(): void {
  console.log(`Usage: of task <subcommand> [arguments]

Subcommands:
  add <name> [options]            Add a new task
  complete <id>                   Mark task as complete
  search <keyword> [options]      Search tasks

Run 'of task <subcommand> --help' for details.`);
}
