import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TagsListOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var targetStatus = input.status ? resolveTagStatus(input.status) : null;
    var allTags = flattenedTags;
    var result = [];

    for (var i = 0; i < allTags.length; i++) {
      var tag = allTags[i];
      if (targetStatus && tag.status !== targetStatus) continue;
      result.push(formatTagInfo(tag));
    }

    return JSON.stringify({ success: true, tags: result, totalCount: result.length });`);

export function buildTagsListArgs(options: TagsListOptions): JxaRunnerOptions {
  const payload: TagsListOptions = {};
  if (options.status) payload.status = options.status;
  return buildJsonArgs(payload);
}

export { SCRIPT as TAGS_LIST_SCRIPT };
