(() => {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: "OmniFocus is not running" });
    }

    const app = getApp();
    const doc = getDoc(app);
    const mode = getArg(4, "brief");
    const allTasks = doc.inboxTasks();
    const result = [];
    var total = 0;

    for (let i = 0; i < allTasks.length; i++) {
      if (allTasks[i].completed()) continue;
      total++;
      if (result.length >= 50) continue;
      if (mode === "detailed") {
        result.push(formatTaskDetail(allTasks[i]));
      } else {
        result.push(formatTaskBrief(allTasks[i]));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
