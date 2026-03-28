import { runAndPrint } from '../run-and-print.js';
import { requireFlagValue, requirePositionalArg } from '../arg-utils.js';
import { PROJECTS_LIST_SCRIPT, buildProjectsListArgs } from '../../jxa/scripts/projects-list.js';
import { PROJECTS_SHOW_SCRIPT, buildProjectsShowArgs } from '../../jxa/scripts/projects-show.js';
import { PROJECTS_ADD_SCRIPT, buildProjectsAddArgs } from '../../jxa/scripts/projects-add.js';
import {
  PROJECTS_STATUS_SCRIPT,
  buildProjectsStatusArgs,
} from '../../jxa/scripts/projects-status.js';
import type { ProjectAddOptions } from '../../types/index.js';

const VALID_STATUSES = ['active', 'on-hold', 'done', 'dropped'];

export async function projectsList(args: string[]): Promise<void> {
  let status: string | undefined;
  let folder: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--status':
        status = requireFlagValue('--status', args, ++i);
        break;
      case '--folder':
        folder = requireFlagValue('--folder', args, ++i);
        break;
      case '--help':
      case '-h':
        printProjectsListHelp();
        return;
      default:
        throw new Error(`Unknown argument '${arg}'. Run 'of projects list --help' for usage.`);
    }
  }

  await runAndPrint(PROJECTS_LIST_SCRIPT, buildProjectsListArgs({ status, folder }));
}

export async function projectsShow(args: string[]): Promise<void> {
  let name = '';
  let detailed = false;
  let includeTasks = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--detailed':
        detailed = true;
        break;
      case '--tasks':
        includeTasks = true;
        break;
      case '--help':
      case '-h':
        printProjectsShowHelp();
        return;
      default:
        name = requirePositionalArg(args, arg, name, 'of projects show --help');
    }
  }

  if (!name) {
    throw new Error("Project name is required. Run 'of projects show --help' for usage.");
  }

  await runAndPrint(PROJECTS_SHOW_SCRIPT, buildProjectsShowArgs({ name, detailed, includeTasks }));
}

export async function projectsAdd(args: string[]): Promise<void> {
  let name = '';
  const options: ProjectAddOptions = {};
  const tags: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--due':
        options.dueDate = requireFlagValue('--due', args, ++i);
        break;
      case '--defer':
        options.deferDate = requireFlagValue('--defer', args, ++i);
        break;
      case '--flagged':
        options.flagged = true;
        break;
      case '--note':
        options.note = requireFlagValue('--note', args, ++i);
        break;
      case '--sequential':
        options.sequential = true;
        break;
      case '--tag':
        tags.push(requireFlagValue('--tag', args, ++i));
        break;
      case '--folder':
        options.folder = requireFlagValue('--folder', args, ++i);
        break;
      case '--help':
      case '-h':
        printProjectsAddHelp();
        return;
      default:
        name = requirePositionalArg(args, arg, name, 'of projects add --help');
    }
  }

  if (!name) {
    throw new Error("Project name is required. Run 'of projects add --help' for usage.");
  }

  if (tags.length > 0) {
    options.tags = tags;
  }

  await runAndPrint(PROJECTS_ADD_SCRIPT, buildProjectsAddArgs(name, options));
}

export async function projectsStatus(args: string[]): Promise<void> {
  let name = '';
  let status = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printProjectsStatusHelp();
      return;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag '${arg}'. Run 'of projects status --help' for usage.`);
    }
    if (!name) {
      name = arg;
    } else if (!status) {
      status = arg;
    } else {
      throw new Error(`Unexpected argument '${arg}'. Run 'of projects status --help' for usage.`);
    }
  }

  if (!name) {
    throw new Error("Project name is required. Run 'of projects status --help' for usage.");
  }
  if (!status) {
    throw new Error("Status is required. Run 'of projects status --help' for usage.");
  }
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  await runAndPrint(PROJECTS_STATUS_SCRIPT, buildProjectsStatusArgs(name, status));
}

export function runProjects(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'list':
      return projectsList(args.slice(1));
    case 'show':
      return projectsShow(args.slice(1));
    case 'add':
      return projectsAdd(args.slice(1));
    case 'status':
      return projectsStatus(args.slice(1));
    case '--help':
    case '-h':
      printProjectsHelp();
      return Promise.resolve();
    default:
      throw new Error(
        `Unknown projects subcommand '${sub ?? ''}'. Run 'of projects --help' for usage.`,
      );
  }
}

function printProjectsListHelp(): void {
  console.log(`Usage: of projects list [options]

List projects in OmniFocus.

Options:
  --status <status>    Filter by status (active, on-hold, done, dropped)
  --folder <name>      Filter by folder name

Examples:
  of projects list
  of projects list --status active
  of projects list --folder "Work"`);
}

function printProjectsShowHelp(): void {
  console.log(`Usage: of projects show <name> [options]

Show project details.

Arguments:
  <name>               Project name (required)

Options:
  --detailed           Show full project details
  --tasks              Include project tasks

Examples:
  of projects show "My Project"
  of projects show "My Project" --detailed --tasks`);
}

function printProjectsAddHelp(): void {
  console.log(`Usage: of projects add <name> [options]

Create a new project in OmniFocus.

Arguments:
  <name>               Project name (required)

Options:
  --due <date>         Due date (e.g. "2026-03-15", "tomorrow")
  --defer <date>       Defer date
  --flagged            Mark as flagged
  --note <text>        Add a note
  --sequential         Make tasks sequential
  --tag <name>         Add a tag (repeatable)
  --folder <name>      Place in folder

Examples:
  of projects add "New Project"
  of projects add "Work Project" --folder "Work" --due "next week" --sequential`);
}

function printProjectsStatusHelp(): void {
  console.log(`Usage: of projects status <name> <status>

Change a project's status.

Arguments:
  <name>               Project name (required)
  <status>             New status: active, on-hold, done, dropped

Examples:
  of projects status "My Project" on-hold
  of projects status "Old Project" done`);
}

function printProjectsHelp(): void {
  console.log(`Usage: of projects <subcommand> [arguments]

Subcommands:
  list [options]                    List projects
  show <name> [options]             Show project details
  add <name> [options]              Create a new project
  status <name> <status>            Change project status

Run 'of projects <subcommand> --help' for details.`);
}
