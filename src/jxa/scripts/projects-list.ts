import { wrapJxaScript, DEFAULT_TASK_LIMIT } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';

const SCRIPT = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var opts = JSON.parse(argv[argv.length - 1]);
    var projects = doc.flattenedProjects();
    var result = [];
    var total = 0;

    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];

      if (opts.status) {
        var pStatus = String(p.status());
        if (pStatus !== opts.status) continue;
      }

      if (opts.folder) {
        var folder = null;
        try { folder = p.parentFolder(); } catch(e) {}
        var folderName = folder ? folder.name() : null;
        if (folderName !== opts.folder) continue;
      }

      total++;
      if (result.length < ${DEFAULT_TASK_LIMIT}) {
        result.push(formatProjectBrief(p));
      }
    }

    return JSON.stringify({ success: true, projects: result, totalCount: total });`);

export interface ProjectsListOptions {
  status?: string;
  folder?: string;
}

const STATUS_MAP: Record<string, string> = {
  active: 'active status',
  'on-hold': 'on hold status',
  done: 'done status',
  dropped: 'dropped status',
};

export function buildProjectsListArgs(options: ProjectsListOptions): JxaRunnerOptions {
  const opts: Record<string, string | undefined> = {};

  if (options.status) {
    const mapped = STATUS_MAP[options.status];
    if (!mapped) {
      throw new Error(
        `Invalid status '${options.status}'. Must be one of: active, on-hold, done, dropped`,
      );
    }
    opts.status = mapped;
  }

  if (options.folder) {
    opts.folder = options.folder;
  }

  return { args: [JSON.stringify(opts)] };
}

export { SCRIPT as PROJECTS_LIST_SCRIPT };
