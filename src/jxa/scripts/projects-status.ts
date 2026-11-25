import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { ProjectStatus } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var project = flattenedProjects.byName(input.name);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + input.name });
    }

    project.status = resolveProjectStatus(input.status);

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);

export function buildProjectsStatusArgs(name: string, status: ProjectStatus): JxaRunnerOptions {
  return buildJsonArgs({ name, status });
}

export { SCRIPT as PROJECTS_STATUS_SCRIPT };
