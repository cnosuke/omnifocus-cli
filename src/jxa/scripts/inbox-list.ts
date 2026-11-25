import { DEFAULT_TASK_LIMIT, wrapOmniScript } from '../helpers.js';

export function buildInboxListScript(mode: 'brief' | 'detailed'): string {
  const formatter = mode === 'detailed' ? 'formatTaskDetail' : 'formatTaskBrief';
  return wrapOmniScript(`
    var tasks = inbox;
    var result = [];
    var total = 0;

    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      if (!isTaskActive(task)) continue;
      total++;
      if (result.length >= ${DEFAULT_TASK_LIMIT}) continue;
      result.push(${formatter}(task));
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);
}
