import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs, parsePositiveInteger } from '../arg-utils.js';
import { parseDateBoundaryToIso } from '../date.js';
import {
  buildTasksFlaggedScript,
  buildTasksOverdueScript,
  buildTasksTodayScript,
} from '../../jxa/scripts/tasks-filter.js';
import { TASKS_LIST_SCRIPT, buildTasksListArgs } from '../../jxa/scripts/tasks-list.js';
import { TASKS_FORECAST_SCRIPT, buildTasksForecastArgs } from '../../jxa/scripts/tasks-forecast.js';
import {
  parseTaskFilterStatus,
  type TaskBrief,
  type TaskDetail,
  type TasksForecastResponse,
  type TasksListOptions,
  type TasksListResponse,
} from '../../types/index.js';

async function runSimpleTasksCommand(
  args: string[],
  commandName: string,
  description: string,
  buildScript: () => string,
): Promise<void> {
  const helpCommand = `of tasks ${commandName} --help`;
  const { values, positionals } = parseCommandArgs(args, {}, helpCommand);

  if (values.help) {
    console.log(
      `Usage: of tasks ${commandName}\n\n${description}\n\nExamples:\n  of tasks ${commandName}`,
    );
    return;
  }

  expectPositionalCount(positionals, 0, helpCommand);

  await runAndPrint<TasksListResponse<TaskBrief>>(buildScript());
}

export async function tasksList(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      status: { type: 'string' },
      tag: { type: 'string', multiple: true },
      project: { type: 'string' },
      flagged: { type: 'boolean' },
      'max-estimate': { type: 'string' },
      'due-before': { type: 'string' },
      'defer-before': { type: 'string' },
      'completed-since': { type: 'string' },
      detailed: { type: 'boolean' },
      limit: { type: 'string' },
    },
    'of tasks list --help',
  );

  if (values.help) {
    printTasksListHelp();
    return;
  }

  expectPositionalCount(positionals, 0, 'of tasks list --help');

  const options: TasksListOptions = {};

  if (values.status !== undefined) {
    options.status = parseTaskFilterStatus(values.status);
  }
  if (values['completed-since'] !== undefined) {
    if (options.status !== undefined && options.status !== 'completed') {
      throw new Error('--completed-since requires --status completed (or omit --status)');
    }
    options.status = 'completed';
    options.completedSince = parseDateBoundaryToIso(values['completed-since'], 'start');
  }
  if (values.tag && values.tag.length > 0) options.tags = values.tag;
  if (values.project !== undefined) options.project = values.project;
  if (values.flagged) options.flagged = true;
  if (values['max-estimate'] !== undefined) {
    options.maxEstimate = parsePositiveInteger('--max-estimate', values['max-estimate']);
  }
  if (values['due-before'] !== undefined) {
    options.dueBefore = parseDateBoundaryToIso(values['due-before'], 'end');
  }
  if (values['defer-before'] !== undefined) {
    options.deferBefore = parseDateBoundaryToIso(values['defer-before'], 'end');
  }
  if (values.detailed) options.detailed = true;
  if (values.limit !== undefined) {
    options.limit = parsePositiveInteger('--limit', values.limit);
  }

  await runAndPrint<TasksListResponse<TaskBrief | TaskDetail>>(
    TASKS_LIST_SCRIPT,
    buildTasksListArgs(options),
  );
}

export async function tasksForecast(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      days: { type: 'string' },
    },
    'of tasks forecast --help',
  );

  if (values.help) {
    printTasksForecastHelp();
    return;
  }

  expectPositionalCount(positionals, 0, 'of tasks forecast --help');

  const days = values.days !== undefined ? parsePositiveInteger('--days', values.days) : undefined;
  await runAndPrint<TasksForecastResponse>(
    TASKS_FORECAST_SCRIPT,
    buildTasksForecastArgs(days !== undefined ? { days } : {}),
  );
}

export function runTasks(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'list':
      return tasksList(args.slice(1));
    case 'forecast':
      return tasksForecast(args.slice(1));
    case 'flagged':
      return runSimpleTasksCommand(
        args.slice(1),
        'flagged',
        'List flagged tasks.',
        buildTasksFlaggedScript,
      );
    case 'overdue':
      return runSimpleTasksCommand(
        args.slice(1),
        'overdue',
        'List overdue tasks.',
        buildTasksOverdueScript,
      );
    case 'today':
      return runSimpleTasksCommand(
        args.slice(1),
        'today',
        'List tasks due today (including overdue tasks).',
        buildTasksTodayScript,
      );
    case '--help':
    case '-h':
      printTasksHelp();
      return Promise.resolve();
    default:
      throw new Error(`Unknown tasks subcommand '${sub ?? ''}'. Run 'of tasks --help' for usage.`);
  }
}

function printTasksListHelp(): void {
  console.log(`Usage: of tasks list [options]

Query tasks by availability status, context tags, estimate, or date range.

Options:
  --status <status>         available (default), next, blocked, remaining, completed, dropped
  --tag <name>              Filter by tag (repeatable, AND match)
  --project <name>          Filter by project name
  --flagged                 Only flagged tasks
  --max-estimate <minutes>  Tasks with estimated duration <= minutes
  --due-before <date>       Tasks due on or before date
  --defer-before <date>     Tasks deferred on or before date
  --completed-since <date>  Tasks completed on or after date (implies --status completed)
  --detailed                Return full task details
  --limit <n>               Max number of results (default: 50)

Examples:
  of tasks list --tag "@PC" --max-estimate 30
  of tasks list --status next --detailed
  of tasks list --status blocked --tag "Waiting For"
  of tasks list --completed-since "7d ago"`);
}

function printTasksForecastHelp(): void {
  console.log(`Usage: of tasks forecast [options]

Show overdue tasks, upcoming due tasks, and tasks becoming available (deferred) within N days.

Options:
  --days <n>    Number of days including today (default: 7)

Examples:
  of tasks forecast
  of tasks forecast --days 3`);
}

function printTasksHelp(): void {
  console.log(`Usage: of tasks <subcommand> [options]

Subcommands:
  list [options]       Query tasks by status, tag, estimate, or dates
  forecast [options]   Show overdue, upcoming due, and deferred tasks
  flagged              List flagged tasks
  overdue              List overdue tasks
  today                List tasks due today (including overdue)

Run 'of tasks <subcommand> --help' for details.`);
}
