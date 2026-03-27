export const JXA_HELPERS = `
ObjC.import('Foundation');

function getApp() { return Application("OmniFocus"); }
function getDoc(app) { return app.defaultDocument; }

function isOmniFocusRunning() {
  var se = Application("System Events");
  var procs = se.processes.whose({ name: "OmniFocus" });
  return procs.length > 0;
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
  var brief = formatTaskBrief(task);
  var proj = task.containingProject();
  var taskTags = task.tags();
  var tagNames = [];
  for (var i = 0; i < taskTags.length; i++) {
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
  var now = new Date();
  var lower = dateStr.toLowerCase().trim();

  if (lower === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
  if (lower === "tomorrow") { var d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(17,0,0,0); return d; }
  if (lower === "next week") { var d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(17,0,0,0); return d; }

  var daysMatch = lower.match(/^\\+(\\d+)d$/);
  if (daysMatch) { var d = new Date(now); d.setDate(d.getDate() + parseInt(daysMatch[1])); d.setHours(17,0,0,0); return d; }

  var weeksMatch = lower.match(/^\\+(\\d+)w$/);
  if (weeksMatch) { var d = new Date(now); d.setDate(d.getDate() + parseInt(weeksMatch[1]) * 7); d.setHours(17,0,0,0); return d; }

  var parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function findProject(doc, name) {
  var projects = doc.flattenedProjects();
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].name() === name) return projects[i];
  }
  return null;
}

function findTag(doc, name) {
  var tags = doc.flattenedTags();
  for (var i = 0; i < tags.length; i++) {
    if (tags[i].name() === name) return tags[i];
  }
  return null;
}

function findTask(doc, taskId) {
  var tasks = doc.flattenedTasks();
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id() === taskId) return tasks[i];
  }
  return null;
}
`;
