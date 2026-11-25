import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs } from '../arg-utils.js';
import { TAGS_LIST_SCRIPT, buildTagsListArgs } from '../../jxa/scripts/tags-list.js';
import { TAGS_ADD_SCRIPT, buildTagsAddArgs } from '../../jxa/scripts/tags-add.js';
import { TAGS_STATUS_SCRIPT, buildTagsStatusArgs } from '../../jxa/scripts/tags-status.js';
import {
  parseTagStatus,
  type SingleTagResponse,
  type TagAddOptions,
  type TagsListResponse,
} from '../../types/index.js';

export async function tagsList(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      status: { type: 'string' },
    },
    'of tags list --help',
  );

  if (values.help) {
    printTagsListHelp();
    return;
  }

  expectPositionalCount(positionals, 0, 'of tags list --help');

  const status = values.status !== undefined ? parseTagStatus(values.status) : undefined;
  await runAndPrint<TagsListResponse>(TAGS_LIST_SCRIPT, buildTagsListArgs({ status }));
}

export async function tagsAdd(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      parent: { type: 'string' },
      'on-hold': { type: 'boolean' },
    },
    'of tags add --help',
  );

  if (values.help) {
    printTagsAddHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of tags add --help');
  const name = positionals[0];
  if (!name) {
    throw new Error("Tag name is required. Run 'of tags add --help' for usage.");
  }

  const options: TagAddOptions = {};
  if (values.parent !== undefined) options.parent = values.parent;
  if (values['on-hold']) options.onHold = true;

  await runAndPrint<SingleTagResponse>(TAGS_ADD_SCRIPT, buildTagsAddArgs(name, options));
}

export async function tagsStatus(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args, {}, 'of tags status --help');

  if (values.help) {
    printTagsStatusHelp();
    return;
  }

  expectPositionalCount(positionals, 2, 'of tags status --help');
  const [name, rawStatus] = positionals;
  if (!name) {
    throw new Error("Tag name is required. Run 'of tags status --help' for usage.");
  }
  if (!rawStatus) {
    throw new Error("Status is required. Run 'of tags status --help' for usage.");
  }

  const status = parseTagStatus(rawStatus);
  await runAndPrint<SingleTagResponse>(TAGS_STATUS_SCRIPT, buildTagsStatusArgs(name, status));
}

export function runTags(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'list':
      return tagsList(args.slice(1));
    case 'add':
      return tagsAdd(args.slice(1));
    case 'status':
      return tagsStatus(args.slice(1));
    case '--help':
    case '-h':
      printTagsHelp();
      return Promise.resolve();
    default:
      throw new Error(`Unknown tags subcommand '${sub ?? ''}'. Run 'of tags --help' for usage.`);
  }
}

function printTagsListHelp(): void {
  console.log(`Usage: of tags list [options]

List tags (contexts) in OmniFocus.

Options:
  --status <status>    Filter by status: active, on-hold, dropped

Examples:
  of tags list
  of tags list --status active
  of tags list --status on-hold`);
}

function printTagsAddHelp(): void {
  console.log(`Usage: of tags add <name> [options]

Create a new tag in OmniFocus.

Arguments:
  <name>               Tag name (required)

Options:
  --parent <name>      Create under parent tag
  --on-hold            Set tag status to on-hold (e.g. Waiting For)

Examples:
  of tags add "@PC"
  of tags add "Waiting For" --on-hold
  of tags add "Alice" --parent "Waiting For"`);
}

function printTagsStatusHelp(): void {
  console.log(`Usage: of tags status <name> <status>

Change a tag's status.

Arguments:
  <name>               Tag name (required)
  <status>             New status: active, on-hold, dropped

Examples:
  of tags status "Waiting For" on-hold
  of tags status "@Office" active`);
}

function printTagsHelp(): void {
  console.log(`Usage: of tags <subcommand> [arguments]

Subcommands:
  list [options]            List tags
  add <name> [options]      Create a new tag
  status <name> <status>    Change tag status

Run 'of tags <subcommand> --help' for details.`);
}
