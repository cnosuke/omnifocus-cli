import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs } from '../arg-utils.js';
import { buildInboxListScript } from '../../jxa/scripts/inbox-list.js';
import type { TaskBrief, TaskDetail, TasksListResponse } from '../../types/index.js';

export async function inboxList(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    { detailed: { type: 'boolean' } },
    'of inbox list --help',
  );

  if (values.help) {
    printInboxListHelp();
    return;
  }

  expectPositionalCount(positionals, 0, 'of inbox list --help');

  const mode = values.detailed ? 'detailed' : 'brief';
  await runAndPrint<TasksListResponse<TaskBrief | TaskDetail>>(buildInboxListScript(mode));
}

export function runInbox(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'list':
      return inboxList(args.slice(1));
    case '--help':
    case '-h':
      printInboxHelp();
      return Promise.resolve();
    default:
      throw new Error(`Unknown inbox subcommand '${sub ?? ''}'. Run 'of inbox --help' for usage.`);
  }
}

function printInboxListHelp(): void {
  console.log(`Usage: of inbox list [--detailed]

List tasks in the OmniFocus inbox.

Options:
  --detailed    Show full task details (default: brief)

Examples:
  of inbox list
  of inbox list --detailed`);
}

function printInboxHelp(): void {
  console.log(`Usage: of inbox <subcommand>

Subcommands:
  list [--detailed]    List inbox tasks

Run 'of inbox list --help' for details.`);
}
