import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TaskToProjectOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    if (task.project !== null) {
      return JSON.stringify({ success: false, error: "Task is already a project root: " + input.taskId });
    }

    var folder = null;
    if (input.folder) {
      folder = flattenedFolders.byName(input.folder);
      if (!folder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + input.folder });
      }
    }

    var position = folder ? folder.ending : library.ending;
    var projects = convertTasksToProjects([task], position);
    if (!projects || projects.length === 0) {
      return JSON.stringify({ success: false, error: "Failed to convert task to project: " + input.taskId });
    }

    return JSON.stringify({ success: true, project: formatProjectBrief(projects[0]) });`);

export function buildTaskToProjectArgs(options: TaskToProjectOptions): JxaRunnerOptions {
  return buildJsonArgs(options);
}

export { SCRIPT as TASK_TO_PROJECT_SCRIPT };
