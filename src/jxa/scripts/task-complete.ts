import { JXA_HELPERS } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';

const SCRIPT = `${JXA_HELPERS}
(function() {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: "OmniFocus is not running" });
    }
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var taskId = argv[argv.length - 1];
    var app = getApp();
    var doc = getDoc(app);
    var task = findTask(doc, taskId);

    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + taskId });
    }

    app.markComplete(task);

    return JSON.stringify({
      success: true,
      task: { id: task.id(), name: task.name(), completed: task.completed() }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();`;

export function buildTaskCompleteArgs(taskId: string): JxaRunnerOptions {
  return {
    args: [taskId],
  };
}

export { SCRIPT as TASK_COMPLETE_SCRIPT };
