import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TaskAddOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var project = null;
    if (input.project) {
      project = flattenedProjects.byName(input.project);
      if (!project) {
        return JSON.stringify({ success: false, error: "Project not found: " + input.project });
      }
    }

    var tags = input.tags && input.tags.length > 0 ? resolveTags(input.tags) : [];

    var task = project ? new Task(input.name, project) : new Task(input.name);

    if (input.dueDate) task.dueDate = new Date(input.dueDate);
    if (input.deferDate) task.deferDate = new Date(input.deferDate);
    if (input.flagged !== undefined) task.flagged = input.flagged;
    if (input.note !== undefined) task.note = input.note;
    if (input.estimatedMinutes !== undefined) task.estimatedMinutes = input.estimatedMinutes;
    if (tags.length > 0) task.addTags(tags);

    return JSON.stringify({ success: true, task: formatTaskBrief(task) });`);

export function buildTaskAddArgs(name: string, options: TaskAddOptions): JxaRunnerOptions {
  return buildJsonArgs({ name, ...options });
}

export { SCRIPT as TASK_ADD_SCRIPT };
