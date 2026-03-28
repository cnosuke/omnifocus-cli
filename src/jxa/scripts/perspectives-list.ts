import { wrapJxaScript } from '../helpers.js';

export function buildPerspectivesListScript(): string {
  return wrapJxaScript(`
    var names = doc.perspectiveNames();
    var result = [];
    for (var i = 0; i < names.length; i++) {
      result.push(names[i]);
    }

    return JSON.stringify({ success: true, perspectiveNames: result, totalCount: result.length });`);
}
