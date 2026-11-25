import { buildJsonArgs, DEFAULT_TASK_LIMIT, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { ProjectsShowOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var project = flattenedProjects.byName(input.name);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + input.name });
    }

    var projectData = input.detailed ? formatProjectDetail(project) : formatProjectBrief(project);
    var response = { success: true, project: projectData };

    if (input.includeTasks) {
      var tasks = project.flattenedTasks;
      var taskList = [];
      for (var i = 0; i < tasks.length && taskList.length < ${DEFAULT_TASK_LIMIT}; i++) {
        if (isTaskActive(tasks[i])) {
          taskList.push(input.detailed ? formatTaskDetail(tasks[i]) : formatTaskBrief(tasks[i]));
        }
      }
      response.tasks = taskList;
    }

    return JSON.stringify(response);`);

export function buildProjectsShowArgs(options: ProjectsShowOptions): JxaRunnerOptions {
  return buildJsonArgs(options);
}

export { SCRIPT as PROJECTS_SHOW_SCRIPT };
