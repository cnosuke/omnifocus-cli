import { buildJsonArgs, DEFAULT_TASK_LIMIT, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TaskShowOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    var response = { success: true, task: formatTaskDetail(task) };

    if (input.includeChildren) {
      var children = task.tasks;
      var childList = [];
      for (var i = 0; i < children.length && childList.length < ${DEFAULT_TASK_LIMIT}; i++) {
        if (isTaskActive(children[i])) {
          childList.push(formatTaskBrief(children[i]));
        }
      }
      response.children = childList;
    }

    return JSON.stringify(response);`);

export function buildTaskShowArgs(options: TaskShowOptions): JxaRunnerOptions {
  return buildJsonArgs(options);
}

export { SCRIPT as TASK_SHOW_SCRIPT };
