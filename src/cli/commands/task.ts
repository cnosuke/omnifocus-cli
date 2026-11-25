import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs, parsePositiveInteger } from '../arg-utils.js';
import { parseDateToIso } from '../date.js';
import { TASK_ADD_SCRIPT, buildTaskAddArgs } from '../../jxa/scripts/task-add.js';
import { TASK_SHOW_SCRIPT, buildTaskShowArgs } from '../../jxa/scripts/task-show.js';
import { TASK_UPDATE_SCRIPT, buildTaskUpdateArgs } from '../../jxa/scripts/task-update.js';
import { TASK_COMPLETE_SCRIPT, buildTaskCompleteArgs } from '../../jxa/scripts/task-complete.js';
import {
  TASK_UNCOMPLETE_SCRIPT,
  buildTaskUncompleteArgs,
} from '../../jxa/scripts/task-uncomplete.js';
import { TASK_DROP_SCRIPT, buildTaskDropArgs } from '../../jxa/scripts/task-drop.js';
import { TASK_DELETE_SCRIPT, buildTaskDeleteArgs } from '../../jxa/scripts/task-delete.js';
import {
  TASK_TO_PROJECT_SCRIPT,
  buildTaskToProjectArgs,
} from '../../jxa/scripts/task-to-project.js';
import { TASK_SEARCH_SCRIPT, buildTaskSearchArgs } from '../../jxa/scripts/task-search.js';
import {
  parseRepetitionMethod,
  type ProjectBrief,
  type SingleProjectResponse,
  type SingleTaskResponse,
  type TaskAddOptions,
  type TaskBrief,
  type TaskCompleteResult,
  type TaskDeleteResponse,
  type TaskDetail,
  type TaskDropResult,
  type TaskSearchOptions,
  type TaskShowResponse,
  type TaskUpdateOptions,
  type TasksListResponse,
} from '../../types/index.js';

function assertExclusive(flags: Array<[string, boolean]>): void {
  const active = flags.filter(([, set]) => set).map(([name]) => name);
  if (active.length > 1) {
    throw new Error(`Cannot combine ${active.join(' and ')}`);
  }
}

export async function taskAdd(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      project: { type: 'string' },
      parent: { type: 'string' },
      due: { type: 'string' },
      defer: { type: 'string' },
      flagged: { type: 'boolean' },
      note: { type: 'string' },
      estimate: { type: 'string' },
      tag: { type: 'string', multiple: true },
      sequential: { type: 'boolean' },
      repeat: { type: 'string' },
      'repeat-method': { type: 'string' },
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

  assertExclusive([
    ['--project', values.project !== undefined],
    ['--parent', values.parent !== undefined],
  ]);

  if (values['repeat-method'] !== undefined && values.repeat === undefined) {
    throw new Error('--repeat-method requires --repeat');
  }

  const options: TaskAddOptions = {};
  if (values.project !== undefined) options.project = values.project;
  if (values.parent !== undefined) options.parentId = values.parent;
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
  if (values.sequential) options.sequential = true;
  if (values.repeat !== undefined) {
    const method =
      values['repeat-method'] !== undefined
        ? parseRepetitionMethod(values['repeat-method'])
        : 'fixed';
    options.repetitionRule = { ruleString: values.repeat, method };
  }

  await runAndPrint<SingleTaskResponse<TaskBrief>>(
    TASK_ADD_SCRIPT,
    buildTaskAddArgs(name, options),
  );
}

export async function taskShow(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      children: { type: 'boolean' },
    },
    'of task show --help',
  );

  if (values.help) {
    printTaskShowHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of task show --help');
  const taskId = positionals[0];
  if (!taskId) {
    throw new Error("Task ID is required. Run 'of task show --help' for usage.");
  }

  await runAndPrint<TaskShowResponse>(
    TASK_SHOW_SCRIPT,
    buildTaskShowArgs({ taskId, includeChildren: Boolean(values.children) }),
  );
}

export async function taskUpdate(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      name: { type: 'string' },
      note: { type: 'string' },
      'append-note': { type: 'string' },
      due: { type: 'string' },
      'clear-due': { type: 'boolean' },
      defer: { type: 'string' },
      'clear-defer': { type: 'boolean' },
      estimate: { type: 'string' },
      'clear-estimate': { type: 'boolean' },
      flagged: { type: 'boolean' },
      unflagged: { type: 'boolean' },
      sequential: { type: 'boolean' },
      parallel: { type: 'boolean' },
      'add-tag': { type: 'string', multiple: true },
      'remove-tag': { type: 'string', multiple: true },
      'clear-tags': { type: 'boolean' },
      project: { type: 'string' },
      parent: { type: 'string' },
      inbox: { type: 'boolean' },
      repeat: { type: 'string' },
      'repeat-method': { type: 'string' },
      'clear-repeat': { type: 'boolean' },
    },
    'of task update --help',
  );

  if (values.help) {
    printTaskUpdateHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of task update --help');
  const taskId = positionals[0];
  if (!taskId) {
    throw new Error("Task ID is required. Run 'of task update --help' for usage.");
  }

  assertExclusive([
    ['--note', values.note !== undefined],
    ['--append-note', values['append-note'] !== undefined],
  ]);
  assertExclusive([
    ['--due', values.due !== undefined],
    ['--clear-due', Boolean(values['clear-due'])],
  ]);
  assertExclusive([
    ['--defer', values.defer !== undefined],
    ['--clear-defer', Boolean(values['clear-defer'])],
  ]);
  assertExclusive([
    ['--estimate', values.estimate !== undefined],
    ['--clear-estimate', Boolean(values['clear-estimate'])],
  ]);
  assertExclusive([
    ['--flagged', Boolean(values.flagged)],
    ['--unflagged', Boolean(values.unflagged)],
  ]);
  assertExclusive([
    ['--sequential', Boolean(values.sequential)],
    ['--parallel', Boolean(values.parallel)],
  ]);
  assertExclusive([
    ['--project', values.project !== undefined],
    ['--parent', values.parent !== undefined],
    ['--inbox', Boolean(values.inbox)],
  ]);
  assertExclusive([
    ['--repeat', values.repeat !== undefined],
    ['--clear-repeat', Boolean(values['clear-repeat'])],
  ]);

  if (values['repeat-method'] !== undefined && values.repeat === undefined) {
    throw new Error('--repeat-method requires --repeat');
  }

  const options: TaskUpdateOptions = { taskId };
  let hasChange = false;

  if (values.name !== undefined) {
    options.name = values.name;
    hasChange = true;
  }
  if (values.note !== undefined) {
    options.note = values.note;
    hasChange = true;
  }
  if (values['append-note'] !== undefined) {
    options.appendNote = values['append-note'];
    hasChange = true;
  }
  if (values.due !== undefined) {
    options.dueDate = parseDateToIso(values.due);
    hasChange = true;
  } else if (values['clear-due']) {
    options.dueDate = null;
    hasChange = true;
  }
  if (values.defer !== undefined) {
    options.deferDate = parseDateToIso(values.defer);
    hasChange = true;
  } else if (values['clear-defer']) {
    options.deferDate = null;
    hasChange = true;
  }
  if (values.estimate !== undefined) {
    options.estimatedMinutes = parsePositiveInteger('--estimate', values.estimate);
    hasChange = true;
  } else if (values['clear-estimate']) {
    options.estimatedMinutes = null;
    hasChange = true;
  }
  if (values.flagged) {
    options.flagged = true;
    hasChange = true;
  } else if (values.unflagged) {
    options.flagged = false;
    hasChange = true;
  }
  if (values.sequential) {
    options.sequential = true;
    hasChange = true;
  } else if (values.parallel) {
    options.sequential = false;
    hasChange = true;
  }
  if (values['clear-tags']) {
    options.clearTags = true;
    hasChange = true;
  }
  if (values['add-tag'] && values['add-tag'].length > 0) {
    options.addTags = values['add-tag'];
    hasChange = true;
  }
  if (values['remove-tag'] && values['remove-tag'].length > 0) {
    options.removeTags = values['remove-tag'];
    hasChange = true;
  }
  if (values.project !== undefined) {
    options.moveToProject = values.project;
    hasChange = true;
  } else if (values.parent !== undefined) {
    options.moveToParentId = values.parent;
    hasChange = true;
  } else if (values.inbox) {
    options.moveToInbox = true;
    hasChange = true;
  }
  if (values.repeat !== undefined) {
    const method =
      values['repeat-method'] !== undefined
        ? parseRepetitionMethod(values['repeat-method'])
        : 'fixed';
    options.repetitionRule = { ruleString: values.repeat, method };
    hasChange = true;
  } else if (values['clear-repeat']) {
    options.repetitionRule = null;
    hasChange = true;
  }

  if (!hasChange) {
    throw new Error(
      "At least one update option is required. Run 'of task update --help' for usage.",
    );
  }

  await runAndPrint<SingleTaskResponse<TaskDetail>>(
    TASK_UPDATE_SCRIPT,
    buildTaskUpdateArgs(options),
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

export async function taskUncomplete(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args, {}, 'of task uncomplete --help');

  if (values.help) {
    printTaskUncompleteHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of task uncomplete --help');
  const taskId = positionals[0];
  if (!taskId) {
    throw new Error("Task ID is required. Run 'of task uncomplete --help' for usage.");
  }

  await runAndPrint<SingleTaskResponse<TaskCompleteResult>>(
    TASK_UNCOMPLETE_SCRIPT,
    buildTaskUncompleteArgs(taskId),
  );
}

export async function taskDrop(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      'all-occurrences': { type: 'boolean' },
    },
    'of task drop --help',
  );

  if (values.help) {
    printTaskDropHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of task drop --help');
  const taskId = positionals[0];
  if (!taskId) {
    throw new Error("Task ID is required. Run 'of task drop --help' for usage.");
  }

  await runAndPrint<SingleTaskResponse<TaskDropResult>>(
    TASK_DROP_SCRIPT,
    buildTaskDropArgs({ taskId, allOccurrences: Boolean(values['all-occurrences']) }),
  );
}

export async function taskDelete(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args, {}, 'of task delete --help');

  if (values.help) {
    printTaskDeleteHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of task delete --help');
  const taskId = positionals[0];
  if (!taskId) {
    throw new Error("Task ID is required. Run 'of task delete --help' for usage.");
  }

  await runAndPrint<TaskDeleteResponse>(TASK_DELETE_SCRIPT, buildTaskDeleteArgs(taskId));
}

export async function taskToProject(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      folder: { type: 'string' },
    },
    'of task to-project --help',
  );

  if (values.help) {
    printTaskToProjectHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of task to-project --help');
  const taskId = positionals[0];
  if (!taskId) {
    throw new Error("Task ID is required. Run 'of task to-project --help' for usage.");
  }

  await runAndPrint<SingleProjectResponse<ProjectBrief>>(
    TASK_TO_PROJECT_SCRIPT,
    buildTaskToProjectArgs({ taskId, folder: values.folder }),
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
    case 'show':
      return taskShow(args.slice(1));
    case 'update':
      return taskUpdate(args.slice(1));
    case 'complete':
      return taskComplete(args.slice(1));
    case 'uncomplete':
      return taskUncomplete(args.slice(1));
    case 'drop':
      return taskDrop(args.slice(1));
    case 'delete':
      return taskDelete(args.slice(1));
    case 'to-project':
      return taskToProject(args.slice(1));
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
  <name>                        Task name (required)

Options:
  --project <name>              Assign to project (exclusive with --parent)
  --parent <id>                 Create as subtask under parent task ID
  --due <date>                  Due date (e.g. "2026-03-15", "tomorrow")
  --defer <date>                Defer date
  --flagged                     Mark as flagged
  --note <text>                 Add a note
  --estimate <minutes>          Estimated duration in minutes
  --tag <name>                  Add a tag (repeatable)
  --sequential                  Make child tasks sequential
  --repeat <ics-rule>           Recurrence rule (e.g. "FREQ=WEEKLY;INTERVAL=1")
  --repeat-method <method>      fixed (default), due-date, defer-until-date

Examples:
  of task add "Buy groceries"
  of task add "Write report" --project "Work" --due "2026-03-15" --flagged
  of task add "Draft outline" --parent "nPaAZJbFJcj" --estimate 30
  of task add "Weekly review" --repeat "FREQ=WEEKLY;INTERVAL=1" --repeat-method fixed`);
}

function printTaskShowHelp(): void {
  console.log(`Usage: of task show <id> [options]

Show detailed information for a task.

Arguments:
  <id>            Task ID (required)

Options:
  --children      Include active child tasks

Examples:
  of task show "nPaAZJbFJcj"
  of task show "nPaAZJbFJcj" --children`);
}

function printTaskUpdateHelp(): void {
  console.log(`Usage: of task update <id> [options]

Update a task's properties, tags, or container (project/parent/inbox).

Arguments:
  <id>                          Task ID (required)

Options:
  --name <name>                 Rename task
  --note <text>                 Replace note
  --append-note <text>          Append text to note
  --due <date> / --clear-due    Set or clear due date
  --defer <date> / --clear-defer Set or clear defer date
  --estimate <min> / --clear-estimate Set or clear estimated minutes
  --flagged / --unflagged       Set or clear flag
  --sequential / --parallel     Set child task ordering
  --add-tag <name>              Add a tag (repeatable)
  --remove-tag <name>           Remove a tag (repeatable)
  --clear-tags                  Remove all tags
  --project <name>              Move task to project
  --parent <id>                 Move task under parent task ID
  --inbox                       Move task back to inbox
  --repeat <ics-rule>           Set recurrence rule
  --repeat-method <method>      fixed (default), due-date, defer-until-date
  --clear-repeat                Remove recurrence rule

Examples:
  of task update "nPaAZJbFJcj" --project "Work" --add-tag "@PC" --estimate 15
  of task update "nPaAZJbFJcj" --defer "+3d" --clear-due --unflagged`);
}

function printTaskCompleteHelp(): void {
  console.log(`Usage: of task complete <id>

Mark a task as complete.

Arguments:
  <id>    Task ID (required)

Examples:
  of task complete "nPaAZJbFJcj"`);
}

function printTaskUncompleteHelp(): void {
  console.log(`Usage: of task uncomplete <id>

Mark a completed task as incomplete.

Arguments:
  <id>    Task ID (required)

Examples:
  of task uncomplete "nPaAZJbFJcj"`);
}

function printTaskDropHelp(): void {
  console.log(`Usage: of task drop <id> [options]

Drop a task (mark as will not be worked on).

Arguments:
  <id>                 Task ID (required)

Options:
  --all-occurrences    Stop repeating (drop all future occurrences)

Examples:
  of task drop "nPaAZJbFJcj"
  of task drop "nPaAZJbFJcj" --all-occurrences`);
}

function printTaskDeleteHelp(): void {
  console.log(`Usage: of task delete <id>

Permanently delete a task from OmniFocus.

Arguments:
  <id>    Task ID (required)

Examples:
  of task delete "nPaAZJbFJcj"`);
}

function printTaskToProjectHelp(): void {
  console.log(`Usage: of task to-project <id> [options]

Convert a task (and its subtasks) into a new project.

Arguments:
  <id>                Task ID (required)

Options:
  --folder <name>     Place the new project in this folder

Examples:
  of task to-project "nPaAZJbFJcj"
  of task to-project "nPaAZJbFJcj" --folder "Work"`);
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
  show <id> [options]             Show detailed task info
  update <id> [options]           Update task properties or move container
  complete <id>                   Mark task as complete
  uncomplete <id>                 Mark task as incomplete
  drop <id> [options]             Drop task
  delete <id>                     Permanently delete task
  to-project <id> [options]       Convert task to project
  search <keyword> [options]      Search tasks

Run 'of task <subcommand> --help' for details.`);
}
