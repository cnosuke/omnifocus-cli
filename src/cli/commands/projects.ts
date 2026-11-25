import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs, parsePositiveInteger } from '../arg-utils.js';
import { parseDateToIso } from '../date.js';
import { PROJECTS_LIST_SCRIPT, buildProjectsListArgs } from '../../jxa/scripts/projects-list.js';
import { PROJECTS_SHOW_SCRIPT, buildProjectsShowArgs } from '../../jxa/scripts/projects-show.js';
import { PROJECTS_ADD_SCRIPT, buildProjectsAddArgs } from '../../jxa/scripts/projects-add.js';
import {
  PROJECTS_UPDATE_SCRIPT,
  buildProjectsUpdateArgs,
} from '../../jxa/scripts/projects-update.js';
import {
  PROJECTS_STATUS_SCRIPT,
  buildProjectsStatusArgs,
} from '../../jxa/scripts/projects-status.js';
import {
  parseProjectStatus,
  parseReviewInterval,
  type ProjectAddOptions,
  type ProjectBrief,
  type ProjectDetail,
  type ProjectUpdateOptions,
  type ProjectsListResponse,
  type SingleProjectResponse,
} from '../../types/index.js';

function assertExclusive(flags: Array<[string, boolean]>): void {
  const active = flags.filter(([, set]) => set).map(([name]) => name);
  if (active.length > 1) {
    throw new Error(`Cannot combine ${active.join(' and ')}`);
  }
}

export async function projectsList(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      status: { type: 'string' },
      folder: { type: 'string' },
      stalled: { type: 'boolean' },
      limit: { type: 'string' },
    },
    'of projects list --help',
  );

  if (values.help) {
    printProjectsListHelp();
    return;
  }

  expectPositionalCount(positionals, 0, 'of projects list --help');

  const status = values.status !== undefined ? parseProjectStatus(values.status) : undefined;
  const limit =
    values.limit !== undefined ? parsePositiveInteger('--limit', values.limit) : undefined;
  await runAndPrint<ProjectsListResponse>(
    PROJECTS_LIST_SCRIPT,
    buildProjectsListArgs({
      status,
      folder: values.folder,
      stalled: Boolean(values.stalled) || undefined,
      limit,
    }),
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
      'single-actions': { type: 'boolean' },
      tag: { type: 'string', multiple: true },
      folder: { type: 'string' },
      'review-interval': { type: 'string' },
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

  assertExclusive([
    ['--sequential', Boolean(values.sequential)],
    ['--single-actions', Boolean(values['single-actions'])],
  ]);

  const options: ProjectAddOptions = {};
  if (values.due !== undefined) options.dueDate = parseDateToIso(values.due);
  if (values.defer !== undefined) options.deferDate = parseDateToIso(values.defer);
  if (values.flagged) options.flagged = true;
  if (values.note !== undefined) options.note = values.note;
  if (values.sequential) options.sequential = true;
  if (values['single-actions']) options.singleActions = true;
  if (values.tag && values.tag.length > 0) options.tags = values.tag;
  if (values.folder !== undefined) options.folder = values.folder;
  if (values['review-interval'] !== undefined) {
    options.reviewInterval = parseReviewInterval(values['review-interval']);
  }

  await runAndPrint<SingleProjectResponse<ProjectBrief>>(
    PROJECTS_ADD_SCRIPT,
    buildProjectsAddArgs(name, options),
  );
}

export async function projectsUpdate(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      name: { type: 'string' },
      note: { type: 'string' },
      'append-note': { type: 'string' },
      due: { type: 'string' },
      'clear-due': { type: 'boolean' },
      defer: { type: 'string' },
      'clear-defer': { type: 'boolean' },
      flagged: { type: 'boolean' },
      unflagged: { type: 'boolean' },
      sequential: { type: 'boolean' },
      parallel: { type: 'boolean' },
      'single-actions': { type: 'boolean' },
      'add-tag': { type: 'string', multiple: true },
      'remove-tag': { type: 'string', multiple: true },
      'clear-tags': { type: 'boolean' },
      folder: { type: 'string' },
      'top-level': { type: 'boolean' },
      'review-interval': { type: 'string' },
      'next-review': { type: 'string' },
    },
    'of projects update --help',
  );

  if (values.help) {
    printProjectsUpdateHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of projects update --help');
  const name = positionals[0];
  if (!name) {
    throw new Error("Project name is required. Run 'of projects update --help' for usage.");
  }

  assertExclusive([
    ['--note', values.note !== undefined],
    ['--append-note', values['append-note'] !== undefined],
  ]);
  assertExclusive([
    ['--due', values.due !== undefined],
    ['--clear-due', Boolean(values['clear-due'])],
  ]);
  assertExclusive([
    ['--defer', values.defer !== undefined],
    ['--clear-defer', Boolean(values['clear-defer'])],
  ]);
  assertExclusive([
    ['--flagged', Boolean(values.flagged)],
    ['--unflagged', Boolean(values.unflagged)],
  ]);
  assertExclusive([
    ['--sequential', Boolean(values.sequential)],
    ['--parallel', Boolean(values.parallel)],
    ['--single-actions', Boolean(values['single-actions'])],
  ]);
  assertExclusive([
    ['--folder', values.folder !== undefined],
    ['--top-level', Boolean(values['top-level'])],
  ]);

  const options: ProjectUpdateOptions = { name };
  let hasChange = false;

  if (values.name !== undefined) {
    options.newName = values.name;
    hasChange = true;
  }
  if (values.note !== undefined) {
    options.note = values.note;
    hasChange = true;
  }
  if (values['append-note'] !== undefined) {
    options.appendNote = values['append-note'];
    hasChange = true;
  }
  if (values.due !== undefined) {
    options.dueDate = parseDateToIso(values.due);
    hasChange = true;
  } else if (values['clear-due']) {
    options.dueDate = null;
    hasChange = true;
  }
  if (values.defer !== undefined) {
    options.deferDate = parseDateToIso(values.defer);
    hasChange = true;
  } else if (values['clear-defer']) {
    options.deferDate = null;
    hasChange = true;
  }
  if (values.flagged) {
    options.flagged = true;
    hasChange = true;
  } else if (values.unflagged) {
    options.flagged = false;
    hasChange = true;
  }
  if (values['single-actions']) {
    options.singleActions = true;
    hasChange = true;
  } else if (values.sequential) {
    options.sequential = true;
    hasChange = true;
  } else if (values.parallel) {
    options.sequential = false;
    options.singleActions = false;
    hasChange = true;
  }
  if (values['clear-tags']) {
    options.clearTags = true;
    hasChange = true;
  }
  if (values['add-tag'] && values['add-tag'].length > 0) {
    options.addTags = values['add-tag'];
    hasChange = true;
  }
  if (values['remove-tag'] && values['remove-tag'].length > 0) {
    options.removeTags = values['remove-tag'];
    hasChange = true;
  }
  if (values.folder !== undefined) {
    options.folder = values.folder;
    hasChange = true;
  } else if (values['top-level']) {
    options.topLevel = true;
    hasChange = true;
  }
  if (values['review-interval'] !== undefined) {
    options.reviewInterval = parseReviewInterval(values['review-interval']);
    hasChange = true;
  }
  if (values['next-review'] !== undefined) {
    options.nextReviewDate = parseDateToIso(values['next-review']);
    hasChange = true;
  }

  if (!hasChange) {
    throw new Error(
      "At least one update option is required. Run 'of projects update --help' for usage.",
    );
  }

  await runAndPrint<SingleProjectResponse<ProjectDetail>>(
    PROJECTS_UPDATE_SCRIPT,
    buildProjectsUpdateArgs(options),
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
    case 'update':
      return projectsUpdate(args.slice(1));
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
  --stalled            Only active projects with no available next action
  --limit <n>          Max number of results (default: 50)

Examples:
  of projects list
  of projects list --status active
  of projects list --folder "Work"
  of projects list --stalled`);
}

function printProjectsShowHelp(): void {
  console.log(`Usage: of projects show <name> [options]

Show project details.

Arguments:
  <name>               Project name (required)

Options:
  --detailed           Show full project details (including review info & next task)
  --tasks              Include remaining (incomplete) tasks

Examples:
  of projects show "My Project"
  of projects show "My Project" --detailed --tasks`);
}

function printProjectsAddHelp(): void {
  console.log(`Usage: of projects add <name> [options]

Create a new project in OmniFocus.

Arguments:
  <name>                        Project name (required)

Options:
  --due <date>                  Due date (e.g. "2026-03-15", "tomorrow")
  --defer <date>                Defer date
  --flagged                     Mark as flagged
  --note <text>                 Add a note
  --sequential                  Make tasks sequential
  --single-actions              Make this a single-actions list
  --tag <name>                  Add a tag (repeatable)
  --folder <name>               Place in folder
  --review-interval <interval>  Review interval (e.g. "7d", "2w", "1m", "1y")

Examples:
  of projects add "New Project"
  of projects add "Work Project" --folder "Work" --due "next week" --sequential
  of projects add "Misc Errands" --single-actions --review-interval 2w`);
}

function printProjectsUpdateHelp(): void {
  console.log(`Usage: of projects update <name> [options]

Update a project's properties, folder, type, tags, or review settings.

Arguments:
  <name>                        Project name (required)

Options:
  --name <new-name>             Rename project
  --note <text>                 Replace note
  --append-note <text>          Append text to note
  --due <date> / --clear-due    Set or clear due date
  --defer <date> / --clear-defer Set or clear defer date
  --flagged / --unflagged       Set or clear flag
  --sequential / --parallel / --single-actions  Set project type
  --add-tag <name>              Add a tag (repeatable)
  --remove-tag <name>           Remove a tag (repeatable)
  --clear-tags                  Remove all tags
  --folder <name> / --top-level Move project to folder or library top level
  --review-interval <interval>  Set review interval (e.g. "7d", "2w", "1m")
  --next-review <date>          Set next review date

Examples:
  of projects update "My Project" --folder "Work" --review-interval 1w
  of projects update "Old Name" --name "New Name" --single-actions`);
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
  update <name> [options]           Update project properties or folder
  status <name> <status>            Change project status

Run 'of projects <subcommand> --help' for details.`);
}
