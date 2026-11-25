import type { JxaRunnerOptions } from './types.js';

export const DEFAULT_TASK_LIMIT = 50;

export const OMNI_HELPERS = `
function isTaskActive(task) {
  return !task.completed && task.taskStatus !== Task.Status.Dropped;
}

function isTaskAvailable(task) {
  var s = task.taskStatus;
  return (
    s === Task.Status.Available ||
    s === Task.Status.Next ||
    s === Task.Status.DueSoon ||
    s === Task.Status.Overdue
  );
}

function normalizeTaskStatus(status) {
  if (status === Task.Status.Available) return "available";
  if (status === Task.Status.Next) return "next";
  if (status === Task.Status.Blocked) return "blocked";
  if (status === Task.Status.DueSoon) return "due-soon";
  if (status === Task.Status.Overdue) return "overdue";
  if (status === Task.Status.Completed) return "completed";
  if (status === Task.Status.Dropped) return "dropped";
  return String(status);
}

function normalizeRepetitionMethod(method) {
  if (method === Task.RepetitionMethod.Fixed) return "fixed";
  if (method === Task.RepetitionMethod.DueDate) return "due-date";
  if (method === Task.RepetitionMethod.DeferUntilDate) return "defer-until-date";
  return String(method);
}

function resolveRepetitionMethod(method) {
  switch (method) {
    case "fixed": return Task.RepetitionMethod.Fixed;
    case "due-date": return Task.RepetitionMethod.DueDate;
    case "defer-until-date": return Task.RepetitionMethod.DeferUntilDate;
    default: throw new Error("Invalid repetition method: " + method);
  }
}

function buildRepetitionRule(rule) {
  return new Task.RepetitionRule(rule.ruleString, resolveRepetitionMethod(rule.method));
}

function formatRepetitionRule(rule) {
  if (!rule) return null;
  return {
    ruleString: rule.ruleString,
    method: normalizeRepetitionMethod(rule.method)
  };
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
  var parent = task.parent;
  var parentId = parent && parent.project === null ? parent.id.primaryKey : null;
  return Object.assign(formatTaskBrief(task), {
    note: task.note || "",
    deferDate: task.deferDate ? task.deferDate.toISOString() : null,
    completionDate: task.completionDate ? task.completionDate.toISOString() : null,
    estimatedMinutes: task.estimatedMinutes,
    inInbox: task.inInbox,
    tags: task.tags.map(function(t) { return t.name; }),
    projectName: proj ? proj.name : null,
    taskStatus: normalizeTaskStatus(task.taskStatus),
    parentId: parentId,
    hasChildren: Boolean(task.hasChildren),
    sequential: Boolean(task.sequential),
    repetitionRule: formatRepetitionRule(task.repetitionRule)
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

function isProjectStalled(project) {
  if (project.status !== Project.Status.Active) return false;
  if (!project.containsSingletonActions) {
    return project.nextTask === null;
  }
  var tasks = project.flattenedTasks;
  for (var i = 0; i < tasks.length; i++) {
    if (isTaskAvailable(tasks[i])) return false;
  }
  return true;
}

function applyReviewInterval(project, interval) {
  var ri = project.reviewInterval;
  ri.steps = interval.steps;
  ri.unit = interval.unit;
  project.reviewInterval = ri;
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
  var next = project.nextTask;
  var ri = project.reviewInterval;
  return Object.assign(formatProjectBrief(project), {
    note: project.note || "",
    completionDate: project.completionDate ? project.completionDate.toISOString() : null,
    estimatedMinutes: project.estimatedMinutes,
    sequential: Boolean(project.sequential),
    singleActions: Boolean(project.containsSingletonActions),
    tags: project.tags.map(function(t) { return t.name; }),
    lastReviewDate: project.lastReviewDate ? project.lastReviewDate.toISOString() : null,
    nextReviewDate: project.nextReviewDate ? project.nextReviewDate.toISOString() : null,
    reviewInterval: ri ? { steps: ri.steps, unit: ri.unit } : null,
    nextTask: next ? { id: next.id.primaryKey, name: next.name } : null
  });
}

function normalizeTagStatus(status) {
  if (status === Tag.Status.Active) return "active";
  if (status === Tag.Status.OnHold) return "on-hold";
  if (status === Tag.Status.Dropped) return "dropped";
  return String(status);
}

function resolveTagStatus(status) {
  switch (status) {
    case "active": return Tag.Status.Active;
    case "on-hold": return Tag.Status.OnHold;
    case "dropped": return Tag.Status.Dropped;
    default: throw new Error("Invalid tag status: " + status);
  }
}

function formatTagInfo(tag) {
  var parent = tag.parent;
  return {
    id: tag.id.primaryKey,
    name: tag.name,
    status: normalizeTagStatus(tag.status),
    parentName: parent ? parent.name : null,
    allowsNextAction: Boolean(tag.allowsNextAction),
    availableTaskCount: tag.availableTasks.length,
    remainingTaskCount: tag.remainingTasks.length
  };
}

function normalizeFolderStatus(status) {
  if (status === Folder.Status.Active) return "active";
  if (status === Folder.Status.Dropped) return "dropped";
  return String(status);
}

function resolveFolderStatus(status) {
  switch (status) {
    case "active": return Folder.Status.Active;
    case "dropped": return Folder.Status.Dropped;
    default: throw new Error("Invalid folder status: " + status);
  }
}

function formatFolderInfo(folder) {
  var parent = folder.parent;
  return {
    id: folder.id.primaryKey,
    name: folder.name,
    status: normalizeFolderStatus(folder.status),
    parentName: parent ? parent.name : null,
    projectCount: folder.projects.length
  };
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
