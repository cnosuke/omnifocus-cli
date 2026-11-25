import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs } from '../arg-utils.js';
import {
  buildTasksFlaggedScript,
  buildTasksOverdueScript,
  buildTasksTodayScript,
} from '../../jxa/scripts/tasks-filter.js';
import type { TaskBrief, TasksListResponse } from '../../types/index.js';

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

export function runTasks(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
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

function printTasksHelp(): void {
  console.log(`Usage: of tasks <subcommand>

Subcommands:
  flagged    List flagged tasks
  overdue    List overdue tasks
  today      List tasks due today (including overdue)

Run 'of tasks <subcommand> --help' for details.`);
}
