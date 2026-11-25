import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';

const SCRIPT = wrapOmniScript(`
    var project = flattenedProjects.byName(input.name);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + input.name });
    }

    project.lastReviewDate = new Date();

    return JSON.stringify({ success: true, project: formatProjectDetail(project) });`);

export function buildReviewMarkArgs(name: string): JxaRunnerOptions {
  return buildJsonArgs({ name });
}

export { SCRIPT as REVIEW_MARK_SCRIPT };
