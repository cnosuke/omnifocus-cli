import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TaskUpdateOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    // Validate all references before mutating
    var targetProject = null;
    if (input.moveToProject !== undefined) {
      targetProject = flattenedProjects.byName(input.moveToProject);
      if (!targetProject) {
        return JSON.stringify({ success: false, error: "Project not found: " + input.moveToProject });
      }
    }

    var targetParent = null;
    if (input.moveToParentId !== undefined) {
      targetParent = Task.byIdentifier(input.moveToParentId);
      if (!targetParent) {
        return JSON.stringify({ success: false, error: "Parent task not found: " + input.moveToParentId });
      }
      var cursor = targetParent;
      while (cursor) {
        if (cursor.id.primaryKey === task.id.primaryKey) {
          return JSON.stringify({ success: false, error: "Cannot move a task under itself or its descendant" });
        }
        cursor = cursor.parent;
      }
    }

    var tagsToAdd = input.addTags && input.addTags.length > 0 ? resolveTags(input.addTags) : [];
    var tagsToRemove = input.removeTags && input.removeTags.length > 0 ? resolveTags(input.removeTags) : [];
    var newRepetition =
      input.repetitionRule !== undefined && input.repetitionRule !== null
        ? buildRepetitionRule(input.repetitionRule)
        : null;

    if (targetProject) {
      moveTasks([task], targetProject);
    } else if (targetParent) {
      moveTasks([task], targetParent);
    } else if (input.moveToInbox) {
      moveTasks([task], inbox.ending);
    }

    if (input.name !== undefined) task.name = input.name;
    if (input.note !== undefined) task.note = input.note;
    if (input.appendNote !== undefined) task.appendStringToNote(input.appendNote);
    if (input.dueDate !== undefined) {
      task.dueDate = input.dueDate === null ? null : new Date(input.dueDate);
    }
    if (input.deferDate !== undefined) {
      task.deferDate = input.deferDate === null ? null : new Date(input.deferDate);
    }
    if (input.estimatedMinutes !== undefined) {
      task.estimatedMinutes = input.estimatedMinutes;
    }
    if (input.flagged !== undefined) task.flagged = input.flagged;
    if (input.sequential !== undefined) task.sequential = input.sequential;
    if (input.clearTags) task.clearTags();
    if (tagsToRemove.length > 0) task.removeTags(tagsToRemove);
    if (tagsToAdd.length > 0) task.addTags(tagsToAdd);
    if (input.repetitionRule !== undefined) {
      task.repetitionRule = newRepetition;
    }

    return JSON.stringify({ success: true, task: formatTaskDetail(task) });`);

export function buildTaskUpdateArgs(options: TaskUpdateOptions): JxaRunnerOptions {
  return buildJsonArgs(options);
}

export { SCRIPT as TASK_UPDATE_SCRIPT };
