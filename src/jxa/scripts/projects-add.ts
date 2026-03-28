import { wrapJxaScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { ProjectAddOptions } from '../../types/index.js';

const SCRIPT = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var projectName = argv[argv.length - 2];
    var opts = JSON.parse(argv[argv.length - 1]);

    var project = app.Project({ name: projectName });

    if (opts.folder) {
      var folder = findFolder(doc, opts.folder);
      if (!folder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + opts.folder });
      }
      folder.projects.push(project);
    } else {
      doc.projects.push(project);
    }

    if (opts.dueDate) {
      var due = parseDate(opts.dueDate);
      if (due) project.dueDate = due;
    }
    if (opts.deferDate) {
      var defer = parseDate(opts.deferDate);
      if (defer) project.deferDate = defer;
    }
    if (opts.flagged !== undefined) {
      project.flagged = opts.flagged;
    }
    if (opts.note) {
      project.note = opts.note;
    }
    if (opts.sequential !== undefined) {
      project.sequential = opts.sequential;
    }
    if (opts.tags && opts.tags.length > 0) {
      for (var i = 0; i < opts.tags.length; i++) {
        var tag = findTag(doc, opts.tags[i]);
        if (tag) {
          app.add(tag, { to: project.tags });
        }
      }
    }

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);

export function buildProjectsAddArgs(name: string, options: ProjectAddOptions): JxaRunnerOptions {
  return { args: [name, JSON.stringify(options)] };
}

export { SCRIPT as PROJECTS_ADD_SCRIPT };
