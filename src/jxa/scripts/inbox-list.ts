import { wrapJxaScript, DEFAULT_TASK_LIMIT } from '../helpers.js';

export function buildInboxListScript(mode: 'brief' | 'detailed'): string {
  const formatter = mode === 'detailed' ? 'formatTaskDetail' : 'formatTaskBrief';
  return wrapJxaScript(`
    var allTasks = doc.inboxTasks();
    var result = [];
    var total = 0;

    for (var i = 0; i < allTasks.length; i++) {
      if (allTasks[i].completed()) continue;
      total++;
      if (result.length >= ${DEFAULT_TASK_LIMIT}) continue;
      result.push(${formatter}(allTasks[i]));
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);
}
