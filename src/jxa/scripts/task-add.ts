import { wrapJxaScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TaskAddOptions } from '../../types/index.js';

const SCRIPT = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var taskName = argv[argv.length - 2];
    var opts = JSON.parse(argv[argv.length - 1]);
    var task;

    if (opts.project) {
      var project = findProject(doc, opts.project);
      if (!project) {
        return JSON.stringify({ success: false, error: "Project not found: " + opts.project });
      }
      task = app.Task({ name: taskName });
      project.rootTask.tasks.push(task);
    } else {
      task = app.InboxTask({ name: taskName });
      doc.inboxTasks.push(task);
    }

    if (opts.dueDate) {
      var due = parseDate(opts.dueDate);
      if (due) task.dueDate = due;
    }
    if (opts.deferDate) {
      var defer = parseDate(opts.deferDate);
      if (defer) task.deferDate = defer;
    }
    if (opts.flagged !== undefined) {
      task.flagged = opts.flagged;
    }
    if (opts.note) {
      task.note = opts.note;
    }
    if (opts.estimatedMinutes !== undefined) {
      task.estimatedMinutes = opts.estimatedMinutes;
    }
    if (opts.tags && opts.tags.length > 0) {
      for (var i = 0; i < opts.tags.length; i++) {
        var tag = findTag(doc, opts.tags[i]);
        if (tag) {
          app.add(tag, { to: task.tags });
        }
      }
    }

    return JSON.stringify({ success: true, task: formatTaskBrief(task) });`);

export function buildTaskAddArgs(
  name: string,
  options: TaskAddOptions,
): JxaRunnerOptions {
  return {
    args: [name, JSON.stringify(options)],
  };
}

export { SCRIPT as TASK_ADD_SCRIPT };
