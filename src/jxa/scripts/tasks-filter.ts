import { wrapJxaScript, DEFAULT_TASK_LIMIT } from '../helpers.js';

function buildFilterScript(filterCondition: string, setup: string = ''): string {
  return wrapJxaScript(`
    ${setup}
    var tasks = doc.flattenedTasks();
    var result = [];
    var total = 0;

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.completed()) continue;
      ${filterCondition}
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);
}

export function buildTasksFlaggedScript(): string {
  return buildFilterScript(`
      if (t.flagged()) {
        total++;
        if (result.length < ${DEFAULT_TASK_LIMIT}) result.push(formatTaskBrief(t));
      }`);
}

export function buildTasksOverdueScript(): string {
  return buildFilterScript(
    `
      var due = t.dueDate();
      if (!due) continue;
      if (due < startOfToday) {
        total++;
        if (result.length < ${DEFAULT_TASK_LIMIT}) result.push(formatTaskBrief(t));
      }`,
    'var now = new Date();\n    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);',
  );
}

export function buildTasksTodayScript(): string {
  return buildFilterScript(
    `
      var due = t.dueDate();
      if (!due) continue;
      if (due <= endOfToday) {
        total++;
        if (result.length < ${DEFAULT_TASK_LIMIT}) result.push(formatTaskBrief(t));
      }`,
    'var now = new Date();\n    var endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);',
  );
}
