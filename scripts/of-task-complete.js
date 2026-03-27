(() => {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: 'OmniFocus is not running' });
    }

    const app = getApp();
    const doc = getDoc(app);
    const taskId = getArg(4, null);

    if (!taskId) {
      return JSON.stringify({ success: false, error: 'Task ID is required' });
    }

    const task = findTask(doc, taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: 'Task not found: ' + taskId });
    }

    app.markComplete(task);

    return JSON.stringify({
      success: true,
      task: {
        id: task.id(),
        name: task.name(),
        completed: task.completed(),
      },
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
