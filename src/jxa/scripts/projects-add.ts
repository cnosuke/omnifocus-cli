import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { ProjectAddOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var folder = null;
    if (input.folder) {
      folder = flattenedFolders.byName(input.folder);
      if (!folder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + input.folder });
      }
    }

    var tags = input.tags && input.tags.length > 0 ? resolveTags(input.tags) : [];

    var project = folder ? new Project(input.name, folder.ending) : new Project(input.name);

    if (input.dueDate) project.dueDate = new Date(input.dueDate);
    if (input.deferDate) project.deferDate = new Date(input.deferDate);
    if (input.flagged !== undefined) project.flagged = input.flagged;
    if (input.note !== undefined) project.note = input.note;
    if (input.singleActions) {
      project.containsSingletonActions = true;
      project.sequential = false;
    } else if (input.sequential !== undefined) {
      project.sequential = input.sequential;
    }
    if (input.reviewInterval) {
      applyReviewInterval(project, input.reviewInterval);
    }
    if (tags.length > 0) project.addTags(tags);

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);

export function buildProjectsAddArgs(name: string, options: ProjectAddOptions): JxaRunnerOptions {
  return buildJsonArgs({ name, ...options });
}

export { SCRIPT as PROJECTS_ADD_SCRIPT };
