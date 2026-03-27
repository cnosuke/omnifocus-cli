import { runAndPrint } from '../run-and-print.js';
import {
  buildTasksFlaggedScript,
  buildTasksOverdueScript,
  buildTasksTodayScript,
} from '../../jxa/scripts/tasks-filter.js';

async function runSimpleTasksCommand(
  args: string[],
  commandName: string,
  buildScript: () => string,
): Promise<void> {
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      console.log(
        `Usage: of tasks ${commandName}\n\nList ${commandName} tasks.\n\nExamples:\n  of tasks ${commandName}`,
      );
      return;
    }
    throw new Error(`Unknown argument '${arg}'. Run 'of tasks ${commandName} --help' for usage.`);
  }

  await runAndPrint(buildScript());
}

export function runTasks(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'flagged':
      return runSimpleTasksCommand(args.slice(1), 'flagged', buildTasksFlaggedScript);
    case 'overdue':
      return runSimpleTasksCommand(args.slice(1), 'overdue', buildTasksOverdueScript);
    case 'today':
      return runSimpleTasksCommand(args.slice(1), 'today', buildTasksTodayScript);
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
  today      List tasks due today

Run 'of tasks <subcommand> --help' for details.`);
}
