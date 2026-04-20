import { wrapJxaScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import { mapProjectStatus } from '../../types/index.js';

const SCRIPT = wrapJxaScript(`
    var argv = getArgv();
    var projectName = argv[argv.length - 2];
    var newStatus = argv[argv.length - 1];
    var project = findProject(doc, projectName);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + projectName });
    }

    project.status = newStatus;

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);

export function buildProjectsStatusArgs(name: string, status: string): JxaRunnerOptions {
  return { args: [name, mapProjectStatus(status)] };
}

export { SCRIPT as PROJECTS_STATUS_SCRIPT };
