import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { TagAddOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var parentTag = null;
    if (input.parent) {
      parentTag = flattenedTags.byName(input.parent);
      if (!parentTag) {
        return JSON.stringify({ success: false, error: "Parent tag not found: " + input.parent });
      }
    }

    var tag = parentTag ? new Tag(input.name, parentTag.ending) : new Tag(input.name, tags.ending);
    if (input.onHold) {
      tag.status = Tag.Status.OnHold;
    }

    return JSON.stringify({ success: true, tag: formatTagInfo(tag) });`);

export function buildTagsAddArgs(name: string, options: TagAddOptions): JxaRunnerOptions {
  return buildJsonArgs({ name, ...options });
}

export { SCRIPT as TAGS_ADD_SCRIPT };
