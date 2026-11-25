import type { JxaRunnerOptions } from './types.js';

export const DEFAULT_TASK_LIMIT = 50;

export const OMNI_HELPERS = `
function isTaskActive(task) {
  return !task.completed && task.taskStatus !== Task.Status.Dropped;
}

function formatTaskBrief(task) {
  return {
    id: task.id.primaryKey,
    name: task.name,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    flagged: task.flagged,
    completed: task.completed
  };
}

function formatTaskDetail(task) {
  var proj = task.containingProject;
  return Object.assign(formatTaskBrief(task), {
    note: task.note || "",
    deferDate: task.deferDate ? task.deferDate.toISOString() : null,
    completionDate: task.completionDate ? task.completionDate.toISOString() : null,
    estimatedMinutes: task.estimatedMinutes,
    inInbox: task.inInbox,
    tags: task.tags.map(function(t) { return t.name; }),
    projectName: proj ? proj.name : null
  });
}

function normalizeProjectStatus(status) {
  if (status === Project.Status.Active) return "active";
  if (status === Project.Status.OnHold) return "on-hold";
  if (status === Project.Status.Done) return "done";
  if (status === Project.Status.Dropped) return "dropped";
  return String(status);
}

function resolveProjectStatus(status) {
  switch (status) {
    case "active": return Project.Status.Active;
    case "on-hold": return Project.Status.OnHold;
    case "done": return Project.Status.Done;
    case "dropped": return Project.Status.Dropped;
    default: throw new Error("Invalid status: " + status);
  }
}

function resolveTags(tagNames) {
  var allTags = flattenedTags;
  var resolved = [];
  for (var i = 0; i < tagNames.length; i++) {
    var tag = allTags.byName(tagNames[i]);
    if (!tag) {
      throw new Error("Tag not found: " + tagNames[i]);
    }
    resolved.push(tag);
  }
  return resolved;
}

function countRemainingTasks(project) {
  var tasks = project.flattenedTasks;
  var count = 0;
  for (var i = 0; i < tasks.length; i++) {
    if (isTaskActive(tasks[i])) count++;
  }
  return count;
}

function formatProjectBrief(project) {
  var folder = project.parentFolder;
  return {
    id: project.id.primaryKey,
    name: project.name,
    status: normalizeProjectStatus(project.status),
    dueDate: project.dueDate ? project.dueDate.toISOString() : null,
    deferDate: project.deferDate ? project.deferDate.toISOString() : null,
    flagged: project.flagged,
    taskCount: countRemainingTasks(project),
    folderName: folder ? folder.name : null
  };
}

function formatProjectDetail(project) {
  return Object.assign(formatProjectBrief(project), {
    note: project.note || "",
    completionDate: project.completionDate ? project.completionDate.toISOString() : null,
    estimatedMinutes: project.estimatedMinutes,
    sequential: project.sequential,
    tags: project.tags.map(function(t) { return t.name; })
  });
}
`;

export function wrapOmniScript(omniBody: string): string {
  const fullOmniCode = `${OMNI_HELPERS}
(function(input) {
  try {
${omniBody}
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})`;

  return `function run(argv) {
  try {
    var app = Application("OmniFocus");
    if (!app.running()) {
      return JSON.stringify({ success: false, error: "OmniFocus is not running" });
    }
    var inputJson = argv.length > 0 ? String(argv[0]) : "{}";
    var escapedInput = JSON.stringify(inputJson)
      .replace(/\\u2028/g, "\\\\u2028")
      .replace(/\\u2029/g, "\\\\u2029");
    var omniSource = ${JSON.stringify(fullOmniCode)} + "(JSON.parse(" + escapedInput + "));";
    var result = app.evaluateJavascript(omniSource);
    if (typeof result !== "string") {
      return JSON.stringify({ success: false, error: "Unexpected response from OmniFocus" });
    }
    return result;
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
}`;
}

export function buildJsonArgs(payload: object): JxaRunnerOptions {
  return { args: [JSON.stringify(payload)] };
}
