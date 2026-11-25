import { buildJsonArgs, DEFAULT_TASK_LIMIT, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TaskSearchOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var limit = input.limit || ${DEFAULT_TASK_LIMIT};
    var searchLower = input.keyword.toLowerCase();
    var tasks = flattenedTasks;
    var result = [];
    var total = 0;

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.project !== null) continue;
      if (!isTaskActive(t)) continue;
      if (input.flagged !== undefined && t.flagged !== input.flagged) continue;
      if (input.project) {
        var proj = t.containingProject;
        if (!proj || proj.name !== input.project) continue;
      }
      var name = t.name.toLowerCase();
      var note = (t.note || "").toLowerCase();
      if (name.indexOf(searchLower) !== -1 || note.indexOf(searchLower) !== -1) {
        total++;
        if (result.length < limit) result.push(formatTaskBrief(t));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);

export function buildTaskSearchArgs(keyword: string, options: TaskSearchOptions): JxaRunnerOptions {
  return buildJsonArgs({ keyword, ...options });
}

export { SCRIPT as TASK_SEARCH_SCRIPT };
