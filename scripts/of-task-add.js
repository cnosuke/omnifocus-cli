(() => {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: 'OmniFocus is not running' });
    }

    const app = getApp();
    const doc = getDoc(app);
    const taskName = getArg(4, null);

    if (!taskName) {
      return JSON.stringify({ success: false, error: 'Task name is required' });
    }

    const opts = parseJsonArg(5, {});
    var task;

    if (opts.project) {
      const project = findProject(doc, opts.project);
      if (!project) {
        return JSON.stringify({ success: false, error: 'Project not found: ' + opts.project });
      }
      task = app.Task({ name: taskName });
      project.rootTask.tasks.push(task);
    } else {
      task = app.InboxTask({ name: taskName });
      doc.inboxTasks.push(task);
    }

    if (opts.dueDate) {
      const due = parseDate(opts.dueDate);
      if (due) task.dueDate = due;
    }

    if (opts.deferDate) {
      const defer = parseDate(opts.deferDate);
      if (defer) task.deferDate = defer;
    }

    if (opts.flagged !== undefined) {
      task.flagged = opts.flagged;
    }

    if (opts.note) {
      task.note = opts.note;
    }

    if (opts.estimatedMinutes !== undefined) {
      task.estimatedMinutes = opts.estimatedMinutes;
    }

    if (opts.tags && opts.tags.length > 0) {
      for (let i = 0; i < opts.tags.length; i++) {
        const tag = findTag(doc, opts.tags[i]);
        if (tag) {
          app.add(tag, { to: task.tags });
        }
      }
    }

    return JSON.stringify({
      success: true,
      task: formatTaskBrief(task),
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();
