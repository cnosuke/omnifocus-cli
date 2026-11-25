import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs } from '../arg-utils.js';
import { buildPerspectivesListScript } from '../../jxa/scripts/perspectives-list.js';
import type { PerspectivesListResponse } from '../../types/index.js';

export async function perspectivesList(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args, {}, 'of perspectives list --help');

  if (values.help) {
    printPerspectivesListHelp();
    return;
  }

  expectPositionalCount(positionals, 0, 'of perspectives list --help');

  await runAndPrint<PerspectivesListResponse>(buildPerspectivesListScript());
}

export function runPerspectives(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'list':
      return perspectivesList(args.slice(1));
    case '--help':
    case '-h':
      printPerspectivesHelp();
      return Promise.resolve();
    default:
      throw new Error(
        `Unknown perspectives subcommand '${sub ?? ''}'. Run 'of perspectives --help' for usage.`,
      );
  }
}

function printPerspectivesListHelp(): void {
  console.log(`Usage: of perspectives list

List all available perspectives in OmniFocus.

Examples:
  of perspectives list`);
}

function printPerspectivesHelp(): void {
  console.log(`Usage: of perspectives <subcommand>

Subcommands:
  list    List all perspectives

Run 'of perspectives list --help' for details.`);
}
