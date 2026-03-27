import { runJxa } from '../../jxa/runner.js';
import { parseJxaOutput } from '../../jxa/parse.js';
import { buildInboxListScript } from '../../jxa/scripts/inbox-list.js';
import type { TaskBrief, TaskDetail } from '../../types/index.js';

export async function inboxList(args: string[]): Promise<void> {
  let mode: 'brief' | 'detailed' = 'brief';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--detailed') {
      mode = 'detailed';
    } else if (arg === '--help' || arg === '-h') {
      printInboxListHelp();
      return;
    } else {
      throw new Error(`Unknown flag '${arg}'. Run 'of inbox list --help' for usage.`);
    }
  }

  const script = buildInboxListScript(mode);
  const result = await runJxa(script);
  const response = parseJxaOutput<TaskBrief | TaskDetail>(result);
  console.log(JSON.stringify(response, null, 2));
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
      throw new Error(
        `Unknown inbox subcommand '${sub ?? ''}'. Run 'of inbox --help' for usage.`,
      );
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
