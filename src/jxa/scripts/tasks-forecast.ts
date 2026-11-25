import { buildJsonArgs, DEFAULT_TASK_LIMIT, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TasksForecastOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var days = input.days || 7;
    var now = new Date();
    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    var horizonEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + days - 1,
      23,
      59,
      59,
      999
    );

    var tasks = flattenedTasks;
    var overdueItems = [];
    var dueItems = [];
    var deferredItems = [];

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.project !== null) continue;
      if (!isTaskActive(t)) continue;

      var due = t.dueDate;
      if (due) {
        if (due < startOfToday) {
          overdueItems.push({ sortKey: due.getTime(), task: formatTaskBrief(t) });
        } else if (due <= horizonEnd) {
          dueItems.push({ sortKey: due.getTime(), task: formatTaskBrief(t) });
        }
      }

      var defer = t.deferDate;
      if (defer && defer >= startOfToday && defer <= horizonEnd) {
        deferredItems.push({ sortKey: defer.getTime(), task: formatTaskBrief(t) });
      }
    }

    function byDate(a, b) {
      return a.sortKey - b.sortKey;
    }
    overdueItems.sort(byDate);
    dueItems.sort(byDate);
    deferredItems.sort(byDate);

    var limit = ${DEFAULT_TASK_LIMIT};
    return JSON.stringify({
      success: true,
      days: days,
      overdue: overdueItems.slice(0, limit).map(function(x) { return x.task; }),
      due: dueItems.slice(0, limit).map(function(x) { return x.task; }),
      deferred: deferredItems.slice(0, limit).map(function(x) { return x.task; })
    });`);

export function buildTasksForecastArgs(options: TasksForecastOptions): JxaRunnerOptions {
  return buildJsonArgs(options);
}

export { SCRIPT as TASKS_FORECAST_SCRIPT };
