import { buildJsonArgs, wrapOmniScript } from '../helpers.js';
import type { JxaRunnerOptions } from '../types.js';
import type { FolderAddOptions } from '../../types/index.js';

const SCRIPT = wrapOmniScript(`
    var parentFolder = null;
    if (input.parent) {
      parentFolder = flattenedFolders.byName(input.parent);
      if (!parentFolder) {
        return JSON.stringify({ success: false, error: "Parent folder not found: " + input.parent });
      }
    }

    var folder = parentFolder
      ? new Folder(input.name, parentFolder.ending)
      : new Folder(input.name, library.ending);

    return JSON.stringify({ success: true, folder: formatFolderInfo(folder) });`);

export function buildFoldersAddArgs(name: string, options: FolderAddOptions): JxaRunnerOptions {
  return buildJsonArgs({ name, ...options });
}

export { SCRIPT as FOLDERS_ADD_SCRIPT };
