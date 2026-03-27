import { JXA_HELPERS } from '../helpers.js';

export function buildTasksOverdueScript(): string {
  return `${JXA_HELPERS}
(function() {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: "OmniFocus is not running" });
    }
    var app = getApp();
    var doc = getDoc(app);
    var now = new Date();
    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    var tasks = doc.flattenedTasks();
    var result = [];

    for (var i = 0; i < tasks.length && result.length < 50; i++) {
      var t = tasks[i];
      if (t.completed()) continue;
      var due = t.dueDate();
      if (!due) continue;
      if (due < startOfToday) {
        result.push(formatTaskBrief(t));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: result.length });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();`;
}
