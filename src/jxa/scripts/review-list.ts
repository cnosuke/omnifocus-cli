import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { ReviewListOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var targetStatus = input.status ? resolveProjectStatus(input.status) : null;
    var now = new Date();
    var projects = flattenedProjects;
    var dueForReview = [];

    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      if (targetStatus) {
        if (p.status !== targetStatus) continue;
      } else {
        if (p.status !== Project.Status.Active && p.status !== Project.Status.OnHold) continue;
      }

      var nextReview = p.nextReviewDate;
      if (nextReview && nextReview <= now) {
        dueForReview.push({ sortKey: nextReview.getTime(), project: p });
      }
    }

    dueForReview.sort(function(a, b) {
      return a.sortKey - b.sortKey;
    });

    var result = dueForReview.map(function(item) {
      return formatProjectDetail(item.project);
    });

    return JSON.stringify({ success: true, projects: result, totalCount: result.length });`);

export function buildReviewListArgs(options: ReviewListOptions): JxaRunnerOptions {
  const payload: ReviewListOptions = {};
  if (options.status) payload.status = options.status;
  return buildJsonArgs(payload);
}

export { SCRIPT as REVIEW_LIST_SCRIPT };
