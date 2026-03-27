import { JXA_HELPERS } from '../helpers.js';

export function buildInboxListScript(mode: 'brief' | 'detailed'): string {
  return `${JXA_HELPERS}
(function() {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: "OmniFocus is not running" });
    }
    var app = getApp();
    var doc = getDoc(app);
    var allTasks = doc.inboxTasks();
    var result = [];
    var total = 0;

    for (var i = 0; i < allTasks.length; i++) {
      if (allTasks[i].completed()) continue;
      total++;
      if (result.length >= 50) continue;
      ${mode === 'detailed' ? 'result.push(formatTaskDetail(allTasks[i]));' : 'result.push(formatTaskBrief(allTasks[i]));'}
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();`;
}
