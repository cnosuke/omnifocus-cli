import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs } from '../arg-utils.js';
import { FOLDERS_LIST_SCRIPT, buildFoldersListArgs } from '../../jxa/scripts/folders-list.js';
import { FOLDERS_ADD_SCRIPT, buildFoldersAddArgs } from '../../jxa/scripts/folders-add.js';
import {
  parseFolderStatus,
  type FolderAddOptions,
  type FoldersListResponse,
  type SingleFolderResponse,
} from '../../types/index.js';

export async function foldersList(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      status: { type: 'string' },
    },
    'of folders list --help',
  );

  if (values.help) {
    printFoldersListHelp();
    return;
  }

  expectPositionalCount(positionals, 0, 'of folders list --help');

  const status = values.status !== undefined ? parseFolderStatus(values.status) : undefined;
  await runAndPrint<FoldersListResponse>(FOLDERS_LIST_SCRIPT, buildFoldersListArgs({ status }));
}

export async function foldersAdd(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      parent: { type: 'string' },
    },
    'of folders add --help',
  );

  if (values.help) {
    printFoldersAddHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of folders add --help');
  const name = positionals[0];
  if (!name) {
    throw new Error("Folder name is required. Run 'of folders add --help' for usage.");
  }

  const options: FolderAddOptions = {};
  if (values.parent !== undefined) options.parent = values.parent;

  await runAndPrint<SingleFolderResponse>(FOLDERS_ADD_SCRIPT, buildFoldersAddArgs(name, options));
}

export function runFolders(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'list':
      return foldersList(args.slice(1));
    case 'add':
      return foldersAdd(args.slice(1));
    case '--help':
    case '-h':
      printFoldersHelp();
      return Promise.resolve();
    default:
      throw new Error(
        `Unknown folders subcommand '${sub ?? ''}'. Run 'of folders --help' for usage.`,
      );
  }
}

function printFoldersListHelp(): void {
  console.log(`Usage: of folders list [options]

List folders (areas of responsibility) in OmniFocus.

Options:
  --status <status>    Filter by status: active, dropped

Examples:
  of folders list
  of folders list --status active`);
}

function printFoldersAddHelp(): void {
  console.log(`Usage: of folders add <name> [options]

Create a new folder in OmniFocus.

Arguments:
  <name>               Folder name (required)

Options:
  --parent <name>      Create under parent folder

Examples:
  of folders add "Work"
  of folders add "Q2" --parent "Work"`);
}

function printFoldersHelp(): void {
  console.log(`Usage: of folders <subcommand> [arguments]

Subcommands:
  list [options]          List folders
  add <name> [options]    Create a new folder

Run 'of folders <subcommand> --help' for details.`);
}
