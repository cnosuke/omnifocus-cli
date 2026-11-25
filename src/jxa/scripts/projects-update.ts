import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { ProjectUpdateOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var project = flattenedProjects.byName(input.name);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + input.name });
    }

    // Validate references before mutating
    var targetFolder = null;
    if (input.folder !== undefined) {
      targetFolder = flattenedFolders.byName(input.folder);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + input.folder });
      }
    }

    var tagsToAdd = input.addTags && input.addTags.length > 0 ? resolveTags(input.addTags) : [];
    var tagsToRemove = input.removeTags && input.removeTags.length > 0 ? resolveTags(input.removeTags) : [];

    if (targetFolder) {
      moveSections([project], targetFolder.ending);
    } else if (input.topLevel) {
      moveSections([project], library.ending);
    }

    if (input.newName !== undefined) project.name = input.newName;
    if (input.note !== undefined) project.note = input.note;
    if (input.appendNote !== undefined) project.appendStringToNote(input.appendNote);
    if (input.dueDate !== undefined) {
      project.dueDate = input.dueDate === null ? null : new Date(input.dueDate);
    }
    if (input.deferDate !== undefined) {
      project.deferDate = input.deferDate === null ? null : new Date(input.deferDate);
    }
    if (input.flagged !== undefined) project.flagged = input.flagged;
    if (input.singleActions === true) {
      project.containsSingletonActions = true;
      project.sequential = false;
    } else if (input.sequential === true) {
      project.containsSingletonActions = false;
      project.sequential = true;
    } else if (input.sequential === false && input.singleActions === false) {
      project.containsSingletonActions = false;
      project.sequential = false;
    }
    if (input.clearTags) project.clearTags();
    if (tagsToRemove.length > 0) project.removeTags(tagsToRemove);
    if (tagsToAdd.length > 0) project.addTags(tagsToAdd);
    if (input.reviewInterval) {
      applyReviewInterval(project, input.reviewInterval);
    }
    if (input.nextReviewDate !== undefined) {
      project.nextReviewDate = new Date(input.nextReviewDate);
    }

    return JSON.stringify({ success: true, project: formatProjectDetail(project) });`);

export function buildProjectsUpdateArgs(options: ProjectUpdateOptions): JxaRunnerOptions {
  return buildJsonArgs(options);
}

export { SCRIPT as PROJECTS_UPDATE_SCRIPT };
