import { buildJsonArgs, DEFAULT_TASK_LIMIT, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TasksListOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var statusFilter = input.status || "available";
    var limit = input.limit || ${DEFAULT_TASK_LIMIT};

    var targetProjectId = null;
    if (input.project) {
      var proj = flattenedProjects.byName(input.project);
      if (!proj) {
        return JSON.stringify({ success: false, error: "Project not found: " + input.project });
      }
      targetProjectId = proj.id.primaryKey;
    }

    var requiredTagIds = [];
    if (input.tags && input.tags.length > 0) {
      var resolvedTags = resolveTags(input.tags);
      for (var ti = 0; ti < resolvedTags.length; ti++) {
        requiredTagIds.push(resolvedTags[ti].id.primaryKey);
      }
    }

    var dueBefore = input.dueBefore ? new Date(input.dueBefore) : null;
    var deferBefore = input.deferBefore ? new Date(input.deferBefore) : null;
    var completedSince = input.completedSince ? new Date(input.completedSince) : null;

    var tasks = flattenedTasks;
    var result = [];
    var total = 0;

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.project !== null) continue;

      if (statusFilter === "available") {
        if (!isTaskAvailable(t)) continue;
      } else if (statusFilter === "next") {
        if (t.taskStatus !== Task.Status.Next) continue;
      } else if (statusFilter === "blocked") {
        if (t.taskStatus !== Task.Status.Blocked) continue;
      } else if (statusFilter === "remaining") {
        if (!isTaskActive(t)) continue;
      } else if (statusFilter === "completed") {
        if (!t.completed) continue;
      } else if (statusFilter === "dropped") {
        if (t.taskStatus !== Task.Status.Dropped) continue;
      } else {
        return JSON.stringify({ success: false, error: "Invalid task status: " + statusFilter });
      }

      if (targetProjectId !== null) {
        var cp = t.containingProject;
        if (!cp || cp.id.primaryKey !== targetProjectId) continue;
      }

      if (input.flagged !== undefined && t.flagged !== input.flagged) continue;

      if (input.maxEstimate !== undefined) {
        if (t.estimatedMinutes === null || t.estimatedMinutes > input.maxEstimate) continue;
      }

      if (dueBefore !== null) {
        if (!t.dueDate || t.dueDate > dueBefore) continue;
      }

      if (deferBefore !== null) {
        if (!t.deferDate || t.deferDate > deferBefore) continue;
      }

      if (completedSince !== null) {
        if (!t.completionDate || t.completionDate < completedSince) continue;
      }

      if (requiredTagIds.length > 0) {
        var taskTags = t.tags;
        var matchedAll = true;
        for (var r = 0; r < requiredTagIds.length; r++) {
          var found = false;
          for (var k = 0; k < taskTags.length; k++) {
            if (taskTags[k].id.primaryKey === requiredTagIds[r]) {
              found = true;
              break;
            }
          }
          if (!found) {
            matchedAll = false;
            break;
          }
        }
        if (!matchedAll) continue;
      }

      total++;
      if (result.length < limit) {
        result.push(input.detailed ? formatTaskDetail(t) : formatTaskBrief(t));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);

export function buildTasksListArgs(options: TasksListOptions): JxaRunnerOptions {
  return buildJsonArgs(options);
}

export { SCRIPT as TASKS_LIST_SCRIPT };
