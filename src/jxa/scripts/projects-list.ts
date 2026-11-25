import { buildJsonArgs, DEFAULT_TASK_LIMIT, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { ProjectsListOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var targetStatus = input.status ? resolveProjectStatus(input.status) : null;
    var limit = input.limit || ${DEFAULT_TASK_LIMIT};
    var projects = flattenedProjects;
    var result = [];
    var total = 0;

    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];

      if (targetStatus && p.status !== targetStatus) continue;

      if (input.folder) {
        var folder = p.parentFolder;
        var folderName = folder ? folder.name : null;
        if (folderName !== input.folder) continue;
      }

      if (input.stalled && !isProjectStalled(p)) continue;

      total++;
      if (result.length < limit) {
        result.push(formatProjectBrief(p));
      }
    }

    return JSON.stringify({ success: true, projects: result, totalCount: total });`);

export function buildProjectsListArgs(options: ProjectsListOptions): JxaRunnerOptions {
  const payload: ProjectsListOptions = {};
  if (options.status) payload.status = options.status;
  if (options.folder) payload.folder = options.folder;
  if (options.stalled) payload.stalled = true;
  if (options.limit !== undefined) payload.limit = options.limit;
  return buildJsonArgs(payload);
}

export { SCRIPT as PROJECTS_LIST_SCRIPT };
