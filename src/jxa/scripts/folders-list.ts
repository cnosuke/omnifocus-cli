import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { FoldersListOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var targetStatus = input.status ? resolveFolderStatus(input.status) : null;
    var allFolders = flattenedFolders;
    var result = [];

    for (var i = 0; i < allFolders.length; i++) {
      var folder = allFolders[i];
      if (targetStatus && folder.status !== targetStatus) continue;
      result.push(formatFolderInfo(folder));
    }

    return JSON.stringify({ success: true, folders: result, totalCount: result.length });`);

export function buildFoldersListArgs(options: FoldersListOptions): JxaRunnerOptions {
  const payload: FoldersListOptions = {};
  if (options.status) payload.status = options.status;
  return buildJsonArgs(payload);
}

export { SCRIPT as FOLDERS_LIST_SCRIPT };
