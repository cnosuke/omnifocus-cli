import { runAndPrint } from '../run-and-print.js';
import { expectPositionalCount, parseCommandArgs } from '../arg-utils.js';
import { REVIEW_LIST_SCRIPT, buildReviewListArgs } from '../../jxa/scripts/review-list.js';
import { REVIEW_MARK_SCRIPT, buildReviewMarkArgs } from '../../jxa/scripts/review-mark.js';
import {
  parseReviewStatus,
  type ProjectDetail,
  type ProjectsListResponse,
  type SingleProjectResponse,
} from '../../types/index.js';

export async function reviewList(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(
    args,
    {
      status: { type: 'string' },
    },
    'of review list --help',
  );

  if (values.help) {
    printReviewListHelp();
    return;
  }

  expectPositionalCount(positionals, 0, 'of review list --help');

  const status = values.status !== undefined ? parseReviewStatus(values.status) : undefined;
  await runAndPrint<ProjectsListResponse<ProjectDetail>>(
    REVIEW_LIST_SCRIPT,
    buildReviewListArgs({ status }),
  );
}

export async function reviewMark(args: string[]): Promise<void> {
  const { values, positionals } = parseCommandArgs(args, {}, 'of review mark --help');

  if (values.help) {
    printReviewMarkHelp();
    return;
  }

  expectPositionalCount(positionals, 1, 'of review mark --help');
  const name = positionals[0];
  if (!name) {
    throw new Error("Project name is required. Run 'of review mark --help' for usage.");
  }

  await runAndPrint<SingleProjectResponse<ProjectDetail>>(
    REVIEW_MARK_SCRIPT,
    buildReviewMarkArgs(name),
  );
}

export function runReview(args: string[]): Promise<void> {
  const sub = args[0];

  switch (sub) {
    case 'list':
      return reviewList(args.slice(1));
    case 'mark':
      return reviewMark(args.slice(1));
    case '--help':
    case '-h':
      printReviewHelp();
      return Promise.resolve();
    default:
      throw new Error(
        `Unknown review subcommand '${sub ?? ''}'. Run 'of review --help' for usage.`,
      );
  }
}

function printReviewListHelp(): void {
  console.log(`Usage: of review list [options]

List projects currently due for review (nextReviewDate <= now), sorted oldest first.

Options:
  --status <status>    Filter by status: active, on-hold (default: both)

Examples:
  of review list
  of review list --status active`);
}

function printReviewMarkHelp(): void {
  console.log(`Usage: of review mark <project-name>

Mark a project as reviewed now (updates lastReviewDate and advances nextReviewDate).

Arguments:
  <project-name>    Project name (required)

Examples:
  of review mark "Q1 Launch"`);
}

function printReviewHelp(): void {
  console.log(`Usage: of review <subcommand> [arguments]

Subcommands:
  list [options]          List projects due for review
  mark <project-name>     Mark a project as reviewed

Run 'of review <subcommand> --help' for details.`);
}
