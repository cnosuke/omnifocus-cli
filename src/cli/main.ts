import { runInbox } from './commands/inbox.js';
import { runTask } from './commands/task.js';
import { runTasks } from './commands/tasks.js';
import { runPerspectives } from './commands/perspectives.js';
import { runProjects } from './commands/projects.js';
import { runReview } from './commands/review.js';
import { runTags } from './commands/tags.js';
import { runFolders } from './commands/folders.js';

const HELP_TEXT = `of - OmniFocus CLI

Usage: of <command> [arguments]

Commands:
  inbox list [--detailed]              List inbox tasks
  task add <name> [options]            Add a new task
  task show <id> [--children]          Show detailed task info
  task update <id> [options]           Update task properties or move container
  task complete <id>                   Mark task as complete
  task uncomplete <id>                 Mark task as incomplete
  task drop <id> [--all-occurrences]   Drop task
  task delete <id>                     Permanently delete task
  task to-project <id> [options]       Convert task to project
  task search <keyword> [options]      Search tasks
  tasks list [options]                 Query tasks by status, tag, estimate, dates
  tasks forecast [--days <n>]          Show overdue, due, and deferred tasks
  tasks flagged                        List flagged tasks
  tasks overdue                        List overdue tasks
  tasks today                          List tasks due today (including overdue)
  projects list [options]              List projects (supports --stalled)
  projects show <name> [options]       Show project details
  projects add <name> [options]        Create a new project
  projects update <name> [options]     Update project properties or folder
  projects status <name> <status>      Change project status
  review list [options]                List projects due for review
  review mark <name>                   Mark a project as reviewed
  tags list [options]                  List tags
  tags add <name> [options]            Create a new tag
  tags status <name> <status>          Change tag status
  folders list [options]               List folders
  folders add <name> [options]         Create a new folder
  perspectives list                    List all perspectives

Run 'of <command> --help' for command details.`;

export async function main(args: string[]): Promise<void> {
  const cmd = args[0];

  switch (cmd) {
    case 'inbox':
      await runInbox(args.slice(1));
      break;
    case 'task':
      await runTask(args.slice(1));
      break;
    case 'tasks':
      await runTasks(args.slice(1));
      break;
    case 'perspectives':
      await runPerspectives(args.slice(1));
      break;
    case 'projects':
      await runProjects(args.slice(1));
      break;
    case 'review':
      await runReview(args.slice(1));
      break;
    case 'tags':
      await runTags(args.slice(1));
      break;
    case 'folders':
      await runFolders(args.slice(1));
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP_TEXT);
      break;
    default:
      throw new Error(`Unknown command '${cmd}'. Run 'of --help' for usage.`);
  }
}
