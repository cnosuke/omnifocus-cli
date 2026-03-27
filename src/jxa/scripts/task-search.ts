import { JXA_HELPERS } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TaskSearchOptions } from '../../types/index.js';

const SCRIPT = `${JXA_HELPERS}
(function() {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: "OmniFocus is not running" });
    }
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var keyword = argv[argv.length - 2];
    var opts = JSON.parse(argv[argv.length - 1]);
    var app = getApp();
    var doc = getDoc(app);
    var limit = opts.limit || 50;
    var searchLower = keyword.toLowerCase();
    var tasks = doc.flattenedTasks();
    var result = [];

    for (var i = 0; i < tasks.length && result.length < limit; i++) {
      var t = tasks[i];
      if (t.completed()) continue;
      if (opts.flagged !== undefined && t.flagged() !== opts.flagged) continue;
      if (opts.project) {
        var proj = t.containingProject();
        if (!proj || proj.name() !== opts.project) continue;
      }
      var name = t.name().toLowerCase();
      var note = (t.note() || "").toLowerCase();
      if (name.indexOf(searchLower) !== -1 || note.indexOf(searchLower) !== -1) {
        result.push(formatTaskBrief(t));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: result.length });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();`;

export function buildTaskSearchArgs(
  keyword: string,
  options: TaskSearchOptions,
): JxaRunnerOptions {
  return {
    args: [keyword, JSON.stringify(options)],
  };
}

export { SCRIPT as TASK_SEARCH_SCRIPT };
