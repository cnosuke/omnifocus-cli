ObjC.import('Foundation');

function getApp() { return Application("OmniFocus"); }
function getDoc(app) { return app.defaultDocument; }

function isOmniFocusRunning() {
  const se = Application("System Events");
  const procs = se.processes.whose({ name: "OmniFocus" });
  return procs.length > 0;
}

function getArg(index, defaultVal) {
  const args = $.NSProcessInfo.processInfo.arguments;
  if (args.count > index) {
    return ObjC.unwrap(args.objectAtIndex(index));
  }
  return defaultVal;
}

function parseJsonArg(index, defaultVal) {
  const raw = getArg(index, null);
  if (!raw) return defaultVal;
  try { return JSON.parse(raw); } catch (e) { return defaultVal; }
}

function formatTaskBrief(task) {
  return {
    id: task.id(),
    name: task.name(),
    dueDate: task.dueDate() ? task.dueDate().toISOString() : null,
    flagged: task.flagged(),
    completed: task.completed()
  };
}

function formatTaskDetail(task) {
  const brief = formatTaskBrief(task);
  const proj = task.containingProject();
  const taskTags = task.tags();
  const tagNames = [];
  for (let i = 0; i < taskTags.length; i++) {
    tagNames.push(taskTags[i].name());
  }
  return Object.assign(brief, {
    note: task.note() || "",
    deferDate: task.deferDate() ? task.deferDate().toISOString() : null,
    completionDate: task.completionDate() ? task.completionDate().toISOString() : null,
    estimatedMinutes: task.estimatedMinutes(),
    inInbox: task.inInbox(),
    tags: tagNames,
    projectName: proj ? proj.name() : null
  });
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const lower = dateStr.toLowerCase().trim();

  if (lower === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
  if (lower === "tomorrow") { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(17,0,0,0); return d; }
  if (lower === "next week") { const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(17,0,0,0); return d; }

  const daysMatch = lower.match(/^\+(\d+)d$/);
  if (daysMatch) { const d = new Date(now); d.setDate(d.getDate() + parseInt(daysMatch[1])); d.setHours(17,0,0,0); return d; }

  const weeksMatch = lower.match(/^\+(\d+)w$/);
  if (weeksMatch) { const d = new Date(now); d.setDate(d.getDate() + parseInt(weeksMatch[1]) * 7); d.setHours(17,0,0,0); return d; }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function findProject(doc, name) {
  const projects = doc.flattenedProjects();
  for (let i = 0; i < projects.length; i++) {
    if (projects[i].name() === name) return projects[i];
  }
  return null;
}

function findTag(doc, name) {
  const tags = doc.flattenedTags();
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].name() === name) return tags[i];
  }
  return null;
}

function findTask(doc, taskId) {
  const tasks = doc.flattenedTasks();
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id() === taskId) return tasks[i];
  }
  return null;
}
