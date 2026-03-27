import { runInbox } from './commands/inbox.js';
import { runTask } from './commands/task.js';
import { runTasks } from './commands/tasks.js';

const HELP_TEXT = `of - OmniFocus CLI

Usage: of <command> [arguments]

Commands:
  inbox list [--detailed]              List inbox tasks
  task add <name> [options]            Add a new task
  task complete <id>                   Mark task as complete
  task search <keyword> [options]      Search tasks
  tasks flagged                        List flagged tasks
  tasks overdue                        List overdue tasks
  tasks today                          List tasks due today

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
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP_TEXT);
      break;
    default:
      console.error(`Error: Unknown command '${cmd}'`);
      console.error(HELP_TEXT);
      process.exit(1);
  }
}
