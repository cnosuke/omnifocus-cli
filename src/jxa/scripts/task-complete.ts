import { wrapJxaScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';

const SCRIPT = wrapJxaScript(`
    var argv = getArgv();
    var taskId = argv[argv.length - 1];
    var task = findTask(doc, taskId);

    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + taskId });
    }

    app.markComplete(task);

    return JSON.stringify({
      success: true,
      task: { id: task.id(), name: task.name(), completed: task.completed() }
    });`);

export function buildTaskCompleteArgs(taskId: string): JxaRunnerOptions {
  return {
    args: [taskId],
  };
}

export { SCRIPT as TASK_COMPLETE_SCRIPT };
