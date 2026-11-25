import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TaskDropOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    var id = task.id.primaryKey;
    var name = task.name;
    task.drop(Boolean(input.allOccurrences));

    return JSON.stringify({
      success: true,
      task: { id: id, name: name, dropped: true }
    });`);

export function buildTaskDropArgs(options: TaskDropOptions): JxaRunnerOptions {
  return buildJsonArgs(options);
}

export { SCRIPT as TASK_DROP_SCRIPT };
