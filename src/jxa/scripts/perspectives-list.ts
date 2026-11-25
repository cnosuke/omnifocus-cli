import { wrapOmniScript } from '../helpers.js';

export function buildPerspectivesListScript(): string {
  return wrapOmniScript(`
    var names = Perspective.all.map(function(p) { return p.name; });

    return JSON.stringify({ success: true, perspectiveNames: names, totalCount: names.length });`);
}
