import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';

const SCRIPT = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);

    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    var completed = task.markComplete();

    return JSON.stringify({
      success: true,
      task: {
        id: completed.id.primaryKey,
        name: completed.name,
        completed: completed.completed
      }
    });`);

export function buildTaskCompleteArgs(taskId: string): JxaRunnerOptions {
  return buildJsonArgs({ taskId });
}

export { SCRIPT as TASK_COMPLETE_SCRIPT };
