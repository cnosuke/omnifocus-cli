import { wrapJxaScript, DEFAULT_TASK_LIMIT } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';

const SCRIPT = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var opts = JSON.parse(argv[argv.length - 1]);
    var projectName = opts.name;
    var project = findProject(doc, projectName);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + projectName });
    }

    var projectData = opts.detailed ? formatProjectDetail(project) : formatProjectBrief(project);
    var response = { success: true, project: projectData };

    if (opts.includeTasks) {
      var tasks = project.flattenedTasks();
      var taskList = [];
      for (var i = 0; i < tasks.length && taskList.length < ${DEFAULT_TASK_LIMIT}; i++) {
        if (!tasks[i].completed()) {
          taskList.push(opts.detailed ? formatTaskDetail(tasks[i]) : formatTaskBrief(tasks[i]));
        }
      }
      response.tasks = taskList;
    }

    return JSON.stringify(response);`);

export interface ProjectsShowOptions {
  name: string;
  detailed?: boolean;
  includeTasks?: boolean;
}

export function buildProjectsShowArgs(options: ProjectsShowOptions): JxaRunnerOptions {
  return { args: [JSON.stringify(options)] };
}

export { SCRIPT as PROJECTS_SHOW_SCRIPT };
