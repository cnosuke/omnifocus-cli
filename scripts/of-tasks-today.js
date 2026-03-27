(() => {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: 'OmniFocus is not running' });
    }

    const app = getApp();
    const doc = getDoc(app);
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const tasks = doc.flattenedTasks();
    const result = [];

    for (let i = 0; i < tasks.length && result.length < 50; i++) {
      const t = tasks[i];
      if (t.completed()) continue;
      const due = t.dueDate();
      if (!due) continue;
      if (due <= endOfToday) {
        result.push(formatTaskBrief(t));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: result.length });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
