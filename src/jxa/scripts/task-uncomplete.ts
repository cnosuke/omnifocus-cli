import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';

const SCRIPT = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    task.markIncomplete();

    return JSON.stringify({
      success: true,
      task: {
        id: task.id.primaryKey,
        name: task.name,
        completed: task.completed
      }
    });`);

export function buildTaskUncompleteArgs(taskId: string): JxaRunnerOptions {
  return buildJsonArgs({ taskId });
}

export { SCRIPT as TASK_UNCOMPLETE_SCRIPT };
