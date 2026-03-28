import { wrapJxaScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';

const SCRIPT = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var projectName = argv[argv.length - 2];
    var newStatus = argv[argv.length - 1];
    var project = findProject(doc, projectName);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + projectName });
    }

    project.status = newStatus;

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);

const STATUS_MAP: Record<string, string> = {
  active: 'active status',
  'on-hold': 'on hold status',
  done: 'done status',
  dropped: 'dropped status',
};

export function buildProjectsStatusArgs(name: string, status: string): JxaRunnerOptions {
  const mapped = STATUS_MAP[status];
  if (!mapped) {
    throw new Error(`Invalid status '${status}'. Must be one of: active, on-hold, done, dropped`);
  }
  return { args: [name, mapped] };
}

export { SCRIPT as PROJECTS_STATUS_SCRIPT };
