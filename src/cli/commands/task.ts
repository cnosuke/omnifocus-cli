import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs, parsePositiveInteger } from '../arg-utils.js';
import { parseDateToIso } from '../date.js';
import { TASK_ADD_SCRIPT, buildTaskAddArgs } from '../../jxa/scripts/task-add.js';
import { TASK_COMPLETE_SCRIPT, buildTaskCompleteArgs } from '../../jxa/scripts/task-complete.js';
import { TASK_SEARCH_SCRIPT, buildTaskSearchArgs } from '../../jxa/scripts/task-search.js';
import type {
  SingleTaskResponse,
  TaskAddOptions,
  TaskBrief,
  TaskCompleteResult,
  TaskSearchOptions,
  TasksListResponse,
} from '../../types/index.js';

export async function taskAdd(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      project: { type: 'string' },
      due: { type: 'string' },
      defer: { type: 'string' },
      flagged: { type: 'boolean' },
      note: { type: 'string' },
      estimate: { type: 'string' },
      tag: { type: 'string', multiple: true },
    },
    'of task add --help',
  );

  if (values.help) {
    printTaskAddHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of task add --help');
  const name = positionals[0];
  if (!name) {
    throw new Error("Task name is required. Run 'of task add --help' for usage.");
  }

  const options: TaskAddOptions = {};
  if (values.project !== undefined) options.project = values.project;
  if (values.due !== undefined) options.dueDate = parseDateToIso(values.due);
  if (values.defer !== undefined) options.deferDate = parseDateToIso(values.defer);
  if (values.flagged) options.flagged = true;
  if (values.note !== undefined) options.note = values.note;
  if (values.estimate !== undefined) {
    options.estimatedMinutes = parsePositiveInteger('--estimate', values.estimate);
  }
  if (values.tag && values.tag.length > 0) {
    options.tags = values.tag;
  }

  await runAndPrint<SingleTaskResponse<TaskBrief>>(
    TASK_ADD_SCRIPT,
    buildTaskAddArgs(name, options),
  );
}

export async function taskComplete(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args, {}, 'of task complete --help');

  if (values.help) {
    printTaskCompleteHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of task complete --help');
  const taskId = positionals[0];
  if (!taskId) {
    throw new Error("Task ID is required. Run 'of task complete --help' for usage.");
  }

  await runAndPrint<SingleTaskResponse<TaskCompleteResult>>(
    TASK_COMPLETE_SCRIPT,
    buildTaskCompleteArgs(taskId),
  );
}

export async function taskSearch(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      project: { type: 'string' },
      flagged: { type: 'boolean' },
      limit: { type: 'string' },
    },
    'of task search --help',
  );

  if (values.help) {
    printTaskSearchHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of task search --help');
  const keyword = positionals[0];
  if (!keyword) {
    throw new Error("Search keyword is required. Run 'of task search --help' for usage.");
  }

  const options: TaskSearchOptions = {};
  if (values.project !== undefined) options.project = values.project;
  if (values.flagged) options.flagged = true;
  if (values.limit !== undefined) {
    options.limit = parsePositiveInteger('--limit', values.limit);
  }

  await runAndPrint<TasksListResponse<TaskBrief>>(
    TASK_SEARCH_SCRIPT,
    buildTaskSearchArgs(keyword, options),
  );
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
