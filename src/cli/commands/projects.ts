import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs } from '../arg-utils.js';
import { parseDateToIso } from '../date.js';
import { PROJECTS_LIST_SCRIPT, buildProjectsListArgs } from '../../jxa/scripts/projects-list.js';
import { PROJECTS_SHOW_SCRIPT, buildProjectsShowArgs } from '../../jxa/scripts/projects-show.js';
import { PROJECTS_ADD_SCRIPT, buildProjectsAddArgs } from '../../jxa/scripts/projects-add.js';
import {
  PROJECTS_STATUS_SCRIPT,
  buildProjectsStatusArgs,
} from '../../jxa/scripts/projects-status.js';
import {
  parseProjectStatus,
  type ProjectAddOptions,
  type ProjectBrief,
  type ProjectDetail,
  type ProjectsListResponse,
  type SingleProjectResponse,
} from '../../types/index.js';

export async function projectsList(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      status: { type: 'string' },
      folder: { type: 'string' },
    },
    'of projects list --help',
  );

  if (values.help) {
    printProjectsListHelp();
    return;
  }

  expectPositionalCount(positionals, 0, 'of projects list --help');

  const status = values.status !== undefined ? parseProjectStatus(values.status) : undefined;
  await runAndPrint<ProjectsListResponse>(
    PROJECTS_LIST_SCRIPT,
    buildProjectsListArgs({ status, folder: values.folder }),
  );
}

export async function projectsShow(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      detailed: { type: 'boolean' },
      tasks: { type: 'boolean' },
    },
    'of projects show --help',
  );

  if (values.help) {
    printProjectsShowHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of projects show --help');
  const name = positionals[0];
  if (!name) {
    throw new Error("Project name is required. Run 'of projects show --help' for usage.");
  }

  await runAndPrint<SingleProjectResponse<ProjectBrief | ProjectDetail>>(
    PROJECTS_SHOW_SCRIPT,
    buildProjectsShowArgs({
      name,
      detailed: Boolean(values.detailed),
      includeTasks: Boolean(values.tasks),
    }),
  );
}

export async function projectsAdd(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      due: { type: 'string' },
      defer: { type: 'string' },
      flagged: { type: 'boolean' },
      note: { type: 'string' },
      sequential: { type: 'boolean' },
      tag: { type: 'string', multiple: true },
      folder: { type: 'string' },
    },
    'of projects add --help',
  );

  if (values.help) {
    printProjectsAddHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of projects add --help');
  const name = positionals[0];
  if (!name) {
    throw new Error("Project name is required. Run 'of projects add --help' for usage.");
  }

  const options: ProjectAddOptions = {};
  if (values.due !== undefined) options.dueDate = parseDateToIso(values.due);
  if (values.defer !== undefined) options.deferDate = parseDateToIso(values.defer);
  if (values.flagged) options.flagged = true;
  if (values.note !== undefined) options.note = values.note;
  if (values.sequential) options.sequential = true;
  if (values.tag && values.tag.length > 0) options.tags = values.tag;
  if (values.folder !== undefined) options.folder = values.folder;

  await runAndPrint<SingleProjectResponse<ProjectBrief>>(
    PROJECTS_ADD_SCRIPT,
    buildProjectsAddArgs(name, options),
  );
}

export async function projectsStatus(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args, {}, 'of projects status --help');

  if (values.help) {
    printProjectsStatusHelp();
    return;
  }

  expectPositionalCount(positionals, 2, 'of projects status --help');
  const [name, rawStatus] = positionals;
  if (!name) {
    throw new Error("Project name is required. Run 'of projects status --help' for usage.");
  }
  if (!rawStatus) {
    throw new Error("Status is required. Run 'of projects status --help' for usage.");
  }

  const status = parseProjectStatus(rawStatus);
  await runAndPrint<SingleProjectResponse<ProjectBrief>>(
    PROJECTS_STATUS_SCRIPT,
    buildProjectsStatusArgs(name, status),
  );
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
  --tasks              Include remaining (incomplete) tasks

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
