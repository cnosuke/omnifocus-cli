import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TaskAddOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var project = null;
    var parentTask = null;

    if (input.project) {
      project = flattenedProjects.byName(input.project);
      if (!project) {
        return JSON.stringify({ success: false, error: "Project not found: " + input.project });
      }
    }

    if (input.parentId) {
      parentTask = Task.byIdentifier(input.parentId);
      if (!parentTask) {
        return JSON.stringify({ success: false, error: "Parent task not found: " + input.parentId });
      }
    }

    var tags = input.tags && input.tags.length > 0 ? resolveTags(input.tags) : [];
    var repetitionRule = input.repetitionRule ? buildRepetitionRule(input.repetitionRule) : null;

    var task;
    if (parentTask) {
      task = new Task(input.name, parentTask);
    } else if (project) {
      task = new Task(input.name, project);
    } else {
      task = new Task(input.name);
    }

    if (input.dueDate) task.dueDate = new Date(input.dueDate);
    if (input.deferDate) task.deferDate = new Date(input.deferDate);
    if (input.flagged !== undefined) task.flagged = input.flagged;
    if (input.note !== undefined) task.note = input.note;
    if (input.estimatedMinutes !== undefined) task.estimatedMinutes = input.estimatedMinutes;
    if (input.sequential !== undefined) task.sequential = input.sequential;
    if (repetitionRule) task.repetitionRule = repetitionRule;
    if (tags.length > 0) task.addTags(tags);

    return JSON.stringify({ success: true, task: formatTaskBrief(task) });`);

export function buildTaskAddArgs(name: string, options: TaskAddOptions): JxaRunnerOptions {
  return buildJsonArgs({ name, ...options });
}

export { SCRIPT as TASK_ADD_SCRIPT };
