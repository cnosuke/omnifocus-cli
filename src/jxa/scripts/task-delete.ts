import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';

const SCRIPT = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    var id = task.id.primaryKey;
    var name = task.name;
    deleteObject(task);

    return JSON.stringify({
      success: true,
      deleted: { id: id, name: name }
    });`);

export function buildTaskDeleteArgs(taskId: string): JxaRunnerOptions {
  return buildJsonArgs({ taskId });
}

export { SCRIPT as TASK_DELETE_SCRIPT };
