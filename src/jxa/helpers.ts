export const DEFAULT_TASK_LIMIT = 50;

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

function findFolder(doc, name) {
  var folders = doc.flattenedFolders();
  for (var i = 0; i < folders.length; i++) {
    if (folders[i].name() === name) return folders[i];
  }
  return null;
}

function normalizeProjectStatus(rawStatus) {
  var map = {"active status":"active", "on hold status":"on-hold", "done status":"done", "dropped status":"dropped"};
  return map[String(rawStatus)] || String(rawStatus);
}

function countRemainingTasks(project) {
  var tasks = project.flattenedTasks();
  var count = 0;
  for (var i = 0; i < tasks.length; i++) {
    if (!tasks[i].completed()) count++;
  }
  return count;
}

function formatProjectBrief(project) {
  var folder = project.parentFolder();
  return {
    id: project.id(),
    name: project.name(),
    status: normalizeProjectStatus(project.status()),
    dueDate: project.dueDate() ? project.dueDate().toISOString() : null,
    deferDate: project.deferDate() ? project.deferDate().toISOString() : null,
    flagged: project.flagged(),
    taskCount: countRemainingTasks(project),
    folderName: folder ? folder.name() : null
  };
}

function formatProjectDetail(project) {
  var brief = formatProjectBrief(project);
  var projectTags = project.tags();
  var tagNames = [];
  for (var i = 0; i < projectTags.length; i++) {
    tagNames.push(projectTags[i].name());
  }
  return Object.assign(brief, {
    note: project.note() || "",
    completionDate: project.completionDate() ? project.completionDate().toISOString() : null,
    estimatedMinutes: project.estimatedMinutes(),
    sequential: project.sequential(),
    tags: tagNames
  });
}
`;

export function wrapJxaScript(body: string): string {
  return `${JXA_HELPERS}
(function() {
  try {
    if (!isOmniFocusRunning()) {
      return JSON.stringify({ success: false, error: "OmniFocus is not running" });
    }
    var app = getApp();
    var doc = getDoc(app);
${body}
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})();`;
}
