(() => {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: "OmniFocus is not running" });
    }

    const app = getApp();
    const doc = getDoc(app);
    const keyword = getArg(4, null);

    if (!keyword) {
      return JSON.stringify({ success: false, error: "Search keyword is required" });
    }

    const opts = parseJsonArg(5, {});
    const limit = opts.limit || 50;
    const searchLower = keyword.toLowerCase();
    const tasks = doc.flattenedTasks();
    const result = [];

    for (let i = 0; i < tasks.length && result.length < limit; i++) {
      const t = tasks[i];
      if (t.completed()) continue;

      if (opts.flagged !== undefined && t.flagged() !== opts.flagged) continue;

      if (opts.project) {
        const proj = t.containingProject();
        if (!proj || proj.name() !== opts.project) continue;
      }

      const name = t.name().toLowerCase();
      const note = (t.note() || "").toLowerCase();

      if (name.indexOf(searchLower) !== -1 || note.indexOf(searchLower) !== -1) {
        result.push(formatTaskBrief(t));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: result.length });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
