import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TagStatus } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var tag = flattenedTags.byName(input.name);
    if (!tag) {
      return JSON.stringify({ success: false, error: "Tag not found: " + input.name });
    }

    tag.status = resolveTagStatus(input.status);

    return JSON.stringify({ success: true, tag: formatTagInfo(tag) });`);

export function buildTagsStatusArgs(name: string, status: TagStatus): JxaRunnerOptions {
  return buildJsonArgs({ name, status });
}

export { SCRIPT as TAGS_STATUS_SCRIPT };
