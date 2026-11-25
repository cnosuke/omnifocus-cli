#!/usr/bin/env node
import { execFile } from "node:child_process";
import { parseArgs } from "node:util";
//#region src/jxa/runner.ts
const DEFAULT_TIMEOUT_MS = 3e4;
function runJxa(script, options = {}) {
	const { args = [], timeout = DEFAULT_TIMEOUT_MS } = options;
	return new Promise((resolve, reject) => {
		const child = execFile("osascript", [
			"-l",
			"JavaScript",
			"-",
			...args
		], { timeout }, (error, stdout, stderr) => {
			if (error && !stdout) {
				reject(/* @__PURE__ */ new Error(`osascript failed: ${stderr || error.message}`));
				return;
			}
			resolve({
				stdout: stdout.trim(),
				exitCode: error ? 1 : 0
			});
		});
		child.stdin?.on("error", reject);
		child.stdin?.end(script);
	});
}
//#endregion
//#region src/jxa/parse.ts
function parseJxaOutput(result) {
	let parsed;
	try {
		parsed = JSON.parse(result.stdout);
	} catch {
		throw new Error(`Invalid JSON from osascript: ${result.stdout}`);
	}
	if (typeof parsed !== "object" || parsed === null || !("success" in parsed)) throw new Error(`Invalid response from osascript: missing 'success' field`);
	const response = parsed;
	if (!response.success) throw new Error(response.error);
	return response;
}
//#endregion
//#region src/cli/run-and-print.ts
async function runAndPrint(script, options) {
	const response = parseJxaOutput(await runJxa(script, options));
	console.log(JSON.stringify(response, null, 2));
}
//#endregion
//#region src/cli/arg-utils.ts
function parsePositiveInteger(flag, value) {
	const n = Number(value);
	if (!Number.isInteger(n) || n <= 0) throw new Error(`${flag} must be a positive integer, got '${value}'`);
	return n;
}
function parseCommandArgs(args, options, helpCommand) {
	const mergedOptions = {
		help: {
			type: "boolean",
			short: "h"
		},
		...options
	};
	try {
		const parsed = parseArgs({
			args,
			options: mergedOptions,
			allowPositionals: true,
			strict: true
		});
		return {
			values: parsed.values,
			positionals: parsed.positionals
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`${message}. Run '${helpCommand}' for usage.`);
	}
}
function expectPositionalCount(positionals, max, helpCommand) {
	if (positionals.length > max) throw new Error(`Unexpected argument '${positionals[max]}'. Run '${helpCommand}' for usage.`);
}
//#endregion
//#region src/jxa/helpers.ts
const OMNI_HELPERS = `
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
function wrapOmniScript(omniBody) {
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
function buildJsonArgs(payload) {
	return { args: [JSON.stringify(payload)] };
}
//#endregion
//#region src/jxa/scripts/inbox-list.ts
function buildInboxListScript(mode) {
	return wrapOmniScript(`
    var tasks = inbox;
    var result = [];
    var total = 0;

    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      if (!isTaskActive(task)) continue;
      total++;
      if (result.length >= 50) continue;
      result.push(${mode === "detailed" ? "formatTaskDetail" : "formatTaskBrief"}(task));
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);
}
//#endregion
//#region src/cli/commands/inbox.ts
async function inboxList(args) {
	const { values, positionals } = parseCommandArgs(args, { detailed: { type: "boolean" } }, "of inbox list --help");
	if (values.help) {
		printInboxListHelp();
		return;
	}
	expectPositionalCount(positionals, 0, "of inbox list --help");
	await runAndPrint(buildInboxListScript(values.detailed ? "detailed" : "brief"));
}
function runInbox(args) {
	const sub = args[0];
	switch (sub) {
		case "list": return inboxList(args.slice(1));
		case "--help":
		case "-h":
			printInboxHelp();
			return Promise.resolve();
		default: throw new Error(`Unknown inbox subcommand '${sub ?? ""}'. Run 'of inbox --help' for usage.`);
	}
}
function printInboxListHelp() {
	console.log(`Usage: of inbox list [--detailed]

List tasks in the OmniFocus inbox.

Options:
  --detailed    Show full task details (default: brief)

Examples:
  of inbox list
  of inbox list --detailed`);
}
function printInboxHelp() {
	console.log(`Usage: of inbox <subcommand>

Subcommands:
  list [--detailed]    List inbox tasks

Run 'of inbox list --help' for details.`);
}
//#endregion
//#region src/cli/date.ts
const DEFAULT_HOUR = 17;
function resolveBoundaryDate(year, monthIndex, day, boundary) {
	if (boundary === "start") return new Date(year, monthIndex, day, 0, 0, 0, 0);
	if (boundary === "end") return new Date(year, monthIndex, day, 23, 59, 59, 999);
	return new Date(year, monthIndex, day, DEFAULT_HOUR, 0, 0, 0);
}
function parseDateWithBoundary(input, now = /* @__PURE__ */ new Date(), boundary = "default") {
	const trimmed = input.trim();
	if (!trimmed) throw new Error("Invalid date: value cannot be empty");
	const lower = trimmed.toLowerCase();
	if (lower === "today") return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate(), boundary);
	if (lower === "tomorrow") return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + 1, boundary);
	if (lower === "yesterday") return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() - 1, boundary);
	if (lower === "next week") return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + 7, boundary);
	const daysMatch = lower.match(/^([+-])(\d+)d$/);
	if (daysMatch) {
		const offset = (daysMatch[1] === "-" ? -1 : 1) * Number(daysMatch[2]);
		return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + offset, boundary);
	}
	const weeksMatch = lower.match(/^([+-])(\d+)w$/);
	if (weeksMatch) {
		const offset = (weeksMatch[1] === "-" ? -1 : 1) * Number(weeksMatch[2]) * 7;
		return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + offset, boundary);
	}
	const agoMatch = lower.match(/^(\d+)([dw])\s+ago$/);
	if (agoMatch) {
		const mult = agoMatch[2] === "w" ? 7 : 1;
		const offset = -Number(agoMatch[1]) * mult;
		return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + offset, boundary);
	}
	const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (dateOnlyMatch) {
		const year = Number(dateOnlyMatch[1]);
		const month = Number(dateOnlyMatch[2]);
		const day = Number(dateOnlyMatch[3]);
		const parsed = resolveBoundaryDate(year, month - 1, day, boundary);
		if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) throw new Error(`Invalid date '${input}'`);
		return parsed;
	}
	const parsed = new Date(trimmed);
	if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date '${input}'`);
	return parsed;
}
function parseDateInput(input, now = /* @__PURE__ */ new Date()) {
	return parseDateWithBoundary(input, now, "default");
}
function parseDateToIso(input, now = /* @__PURE__ */ new Date()) {
	return parseDateInput(input, now).toISOString();
}
function parseDateBoundaryToIso(input, boundary, now = /* @__PURE__ */ new Date()) {
	return parseDateWithBoundary(input, now, boundary).toISOString();
}
//#endregion
//#region src/jxa/scripts/task-add.ts
const SCRIPT$22 = wrapOmniScript(`
    var project = null;
    var parentTask = null;

    if (input.project) {
      project = flattenedProjects.byName(input.project);
      if (!project) {
        return JSON.stringify({ success: false, error: "Project not found: " + input.project });
      }
    }

    if (input.parentId) {
      parentTask = Task.byIdentifier(input.parentId);
      if (!parentTask) {
        return JSON.stringify({ success: false, error: "Parent task not found: " + input.parentId });
      }
    }

    var tags = input.tags && input.tags.length > 0 ? resolveTags(input.tags) : [];
    var repetitionRule = input.repetitionRule ? buildRepetitionRule(input.repetitionRule) : null;

    var task;
    if (parentTask) {
      task = new Task(input.name, parentTask);
    } else if (project) {
      task = new Task(input.name, project);
    } else {
      task = new Task(input.name);
    }

    if (input.dueDate) task.dueDate = new Date(input.dueDate);
    if (input.deferDate) task.deferDate = new Date(input.deferDate);
    if (input.flagged !== undefined) task.flagged = input.flagged;
    if (input.note !== undefined) task.note = input.note;
    if (input.estimatedMinutes !== undefined) task.estimatedMinutes = input.estimatedMinutes;
    if (input.sequential !== undefined) task.sequential = input.sequential;
    if (repetitionRule) task.repetitionRule = repetitionRule;
    if (tags.length > 0) task.addTags(tags);

    return JSON.stringify({ success: true, task: formatTaskBrief(task) });`);
function buildTaskAddArgs(name, options) {
	return buildJsonArgs({
		name,
		...options
	});
}
//#endregion
//#region src/jxa/scripts/task-show.ts
const SCRIPT$21 = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    var response = { success: true, task: formatTaskDetail(task) };

    if (input.includeChildren) {
      var children = task.tasks;
      var childList = [];
      for (var i = 0; i < children.length && childList.length < 50; i++) {
        if (isTaskActive(children[i])) {
          childList.push(formatTaskBrief(children[i]));
        }
      }
      response.children = childList;
    }

    return JSON.stringify(response);`);
function buildTaskShowArgs(options) {
	return buildJsonArgs(options);
}
//#endregion
//#region src/jxa/scripts/task-update.ts
const SCRIPT$20 = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    // Validate all references before mutating
    var targetProject = null;
    if (input.moveToProject !== undefined) {
      targetProject = flattenedProjects.byName(input.moveToProject);
      if (!targetProject) {
        return JSON.stringify({ success: false, error: "Project not found: " + input.moveToProject });
      }
    }

    var targetParent = null;
    if (input.moveToParentId !== undefined) {
      targetParent = Task.byIdentifier(input.moveToParentId);
      if (!targetParent) {
        return JSON.stringify({ success: false, error: "Parent task not found: " + input.moveToParentId });
      }
      var cursor = targetParent;
      while (cursor) {
        if (cursor.id.primaryKey === task.id.primaryKey) {
          return JSON.stringify({ success: false, error: "Cannot move a task under itself or its descendant" });
        }
        cursor = cursor.parent;
      }
    }

    var tagsToAdd = input.addTags && input.addTags.length > 0 ? resolveTags(input.addTags) : [];
    var tagsToRemove = input.removeTags && input.removeTags.length > 0 ? resolveTags(input.removeTags) : [];
    var newRepetition =
      input.repetitionRule !== undefined && input.repetitionRule !== null
        ? buildRepetitionRule(input.repetitionRule)
        : null;

    if (targetProject) {
      moveTasks([task], targetProject);
    } else if (targetParent) {
      moveTasks([task], targetParent);
    } else if (input.moveToInbox) {
      moveTasks([task], inbox.ending);
    }

    if (input.name !== undefined) task.name = input.name;
    if (input.note !== undefined) task.note = input.note;
    if (input.appendNote !== undefined) task.appendStringToNote(input.appendNote);
    if (input.dueDate !== undefined) {
      task.dueDate = input.dueDate === null ? null : new Date(input.dueDate);
    }
    if (input.deferDate !== undefined) {
      task.deferDate = input.deferDate === null ? null : new Date(input.deferDate);
    }
    if (input.estimatedMinutes !== undefined) {
      task.estimatedMinutes = input.estimatedMinutes;
    }
    if (input.flagged !== undefined) task.flagged = input.flagged;
    if (input.sequential !== undefined) task.sequential = input.sequential;
    if (input.clearTags) task.clearTags();
    if (tagsToRemove.length > 0) task.removeTags(tagsToRemove);
    if (tagsToAdd.length > 0) task.addTags(tagsToAdd);
    if (input.repetitionRule !== undefined) {
      task.repetitionRule = newRepetition;
    }

    return JSON.stringify({ success: true, task: formatTaskDetail(task) });`);
function buildTaskUpdateArgs(options) {
	return buildJsonArgs(options);
}
//#endregion
//#region src/jxa/scripts/task-complete.ts
const SCRIPT$19 = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);

    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    var completed = task.markComplete();

    return JSON.stringify({
      success: true,
      task: {
        id: completed.id.primaryKey,
        name: completed.name,
        completed: completed.completed
      }
    });`);
function buildTaskCompleteArgs(taskId) {
	return buildJsonArgs({ taskId });
}
//#endregion
//#region src/jxa/scripts/task-uncomplete.ts
const SCRIPT$18 = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    task.markIncomplete();

    return JSON.stringify({
      success: true,
      task: {
        id: task.id.primaryKey,
        name: task.name,
        completed: task.completed
      }
    });`);
function buildTaskUncompleteArgs(taskId) {
	return buildJsonArgs({ taskId });
}
//#endregion
//#region src/jxa/scripts/task-drop.ts
const SCRIPT$17 = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    var id = task.id.primaryKey;
    var name = task.name;
    task.drop(Boolean(input.allOccurrences));

    return JSON.stringify({
      success: true,
      task: { id: id, name: name, dropped: true }
    });`);
function buildTaskDropArgs(options) {
	return buildJsonArgs(options);
}
//#endregion
//#region src/jxa/scripts/task-delete.ts
const SCRIPT$16 = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    var id = task.id.primaryKey;
    var name = task.name;
    deleteObject(task);

    return JSON.stringify({
      success: true,
      deleted: { id: id, name: name }
    });`);
function buildTaskDeleteArgs(taskId) {
	return buildJsonArgs({ taskId });
}
//#endregion
//#region src/jxa/scripts/task-to-project.ts
const SCRIPT$15 = wrapOmniScript(`
    var task = Task.byIdentifier(input.taskId);
    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + input.taskId });
    }

    if (task.project !== null) {
      return JSON.stringify({ success: false, error: "Task is already a project root: " + input.taskId });
    }

    var folder = null;
    if (input.folder) {
      folder = flattenedFolders.byName(input.folder);
      if (!folder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + input.folder });
      }
    }

    var position = folder ? folder.ending : library.ending;
    var projects = convertTasksToProjects([task], position);
    if (!projects || projects.length === 0) {
      return JSON.stringify({ success: false, error: "Failed to convert task to project: " + input.taskId });
    }

    return JSON.stringify({ success: true, project: formatProjectBrief(projects[0]) });`);
function buildTaskToProjectArgs(options) {
	return buildJsonArgs(options);
}
//#endregion
//#region src/jxa/scripts/task-search.ts
const SCRIPT$14 = wrapOmniScript(`
    var limit = input.limit || 50;
    var searchLower = input.keyword.toLowerCase();
    var tasks = flattenedTasks;
    var result = [];
    var total = 0;

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.project !== null) continue;
      if (!isTaskActive(t)) continue;
      if (input.flagged !== undefined && t.flagged !== input.flagged) continue;
      if (input.project) {
        var proj = t.containingProject;
        if (!proj || proj.name !== input.project) continue;
      }
      var name = t.name.toLowerCase();
      var note = (t.note || "").toLowerCase();
      if (name.indexOf(searchLower) !== -1 || note.indexOf(searchLower) !== -1) {
        total++;
        if (result.length < limit) result.push(formatTaskBrief(t));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);
function buildTaskSearchArgs(keyword, options) {
	return buildJsonArgs({
		keyword,
		...options
	});
}
//#endregion
//#region src/types/index.ts
const VALID_TASK_FILTER_STATUSES = [
	"available",
	"next",
	"blocked",
	"remaining",
	"completed",
	"dropped"
];
function parseTaskFilterStatus(status) {
	if (VALID_TASK_FILTER_STATUSES.includes(status)) return status;
	throw new Error(`Invalid task status '${status}'. Must be one of: ${VALID_TASK_FILTER_STATUSES.join(", ")}`);
}
const VALID_REPETITION_METHODS = [
	"fixed",
	"due-date",
	"defer-until-date"
];
function parseRepetitionMethod(method) {
	if (VALID_REPETITION_METHODS.includes(method)) return method;
	throw new Error(`Invalid repeat method '${method}'. Must be one of: ${VALID_REPETITION_METHODS.join(", ")}`);
}
const REVIEW_UNIT_MAP = {
	d: "days",
	w: "weeks",
	m: "months",
	y: "years"
};
function parseReviewInterval(input) {
	const match = input.trim().match(/^(\d+)([dwmy])$/i);
	if (!match) throw new Error(`Invalid review interval '${input}'. Expected format like '7d', '2w', '1m', or '1y'`);
	const steps = Number(match[1]);
	if (!Number.isInteger(steps) || steps <= 0) throw new Error(`Invalid review interval '${input}'. Steps must be a positive integer`);
	return {
		steps,
		unit: REVIEW_UNIT_MAP[match[2].toLowerCase()]
	};
}
const VALID_PROJECT_STATUSES = [
	"active",
	"on-hold",
	"done",
	"dropped"
];
function parseProjectStatus(status) {
	if (VALID_PROJECT_STATUSES.includes(status)) return status;
	throw new Error(`Invalid status '${status}'. Must be one of: ${VALID_PROJECT_STATUSES.join(", ")}`);
}
const VALID_REVIEW_STATUSES = ["active", "on-hold"];
function parseReviewStatus(status) {
	if (VALID_REVIEW_STATUSES.includes(status)) return status;
	throw new Error(`Invalid review status '${status}'. Must be one of: ${VALID_REVIEW_STATUSES.join(", ")}`);
}
const VALID_TAG_STATUSES = [
	"active",
	"on-hold",
	"dropped"
];
function parseTagStatus(status) {
	if (VALID_TAG_STATUSES.includes(status)) return status;
	throw new Error(`Invalid tag status '${status}'. Must be one of: ${VALID_TAG_STATUSES.join(", ")}`);
}
const VALID_FOLDER_STATUSES = ["active", "dropped"];
function parseFolderStatus(status) {
	if (VALID_FOLDER_STATUSES.includes(status)) return status;
	throw new Error(`Invalid folder status '${status}'. Must be one of: ${VALID_FOLDER_STATUSES.join(", ")}`);
}
//#endregion
//#region src/cli/commands/task.ts
function assertExclusive$1(flags) {
	const active = flags.filter(([, set]) => set).map(([name]) => name);
	if (active.length > 1) throw new Error(`Cannot combine ${active.join(" and ")}`);
}
async function taskAdd(args) {
	const { values, positionals } = parseCommandArgs(args, {
		project: { type: "string" },
		parent: { type: "string" },
		due: { type: "string" },
		defer: { type: "string" },
		flagged: { type: "boolean" },
		note: { type: "string" },
		estimate: { type: "string" },
		tag: {
			type: "string",
			multiple: true
		},
		sequential: { type: "boolean" },
		repeat: { type: "string" },
		"repeat-method": { type: "string" }
	}, "of task add --help");
	if (values.help) {
		printTaskAddHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task add --help");
	const name = positionals[0];
	if (!name) throw new Error("Task name is required. Run 'of task add --help' for usage.");
	assertExclusive$1([["--project", values.project !== void 0], ["--parent", values.parent !== void 0]]);
	if (values["repeat-method"] !== void 0 && values.repeat === void 0) throw new Error("--repeat-method requires --repeat");
	const options = {};
	if (values.project !== void 0) options.project = values.project;
	if (values.parent !== void 0) options.parentId = values.parent;
	if (values.due !== void 0) options.dueDate = parseDateToIso(values.due);
	if (values.defer !== void 0) options.deferDate = parseDateToIso(values.defer);
	if (values.flagged) options.flagged = true;
	if (values.note !== void 0) options.note = values.note;
	if (values.estimate !== void 0) options.estimatedMinutes = parsePositiveInteger("--estimate", values.estimate);
	if (values.tag && values.tag.length > 0) options.tags = values.tag;
	if (values.sequential) options.sequential = true;
	if (values.repeat !== void 0) {
		const method = values["repeat-method"] !== void 0 ? parseRepetitionMethod(values["repeat-method"]) : "fixed";
		options.repetitionRule = {
			ruleString: values.repeat,
			method
		};
	}
	await runAndPrint(SCRIPT$22, buildTaskAddArgs(name, options));
}
async function taskShow(args) {
	const { values, positionals } = parseCommandArgs(args, { children: { type: "boolean" } }, "of task show --help");
	if (values.help) {
		printTaskShowHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task show --help");
	const taskId = positionals[0];
	if (!taskId) throw new Error("Task ID is required. Run 'of task show --help' for usage.");
	await runAndPrint(SCRIPT$21, buildTaskShowArgs({
		taskId,
		includeChildren: Boolean(values.children)
	}));
}
async function taskUpdate(args) {
	const { values, positionals } = parseCommandArgs(args, {
		name: { type: "string" },
		note: { type: "string" },
		"append-note": { type: "string" },
		due: { type: "string" },
		"clear-due": { type: "boolean" },
		defer: { type: "string" },
		"clear-defer": { type: "boolean" },
		estimate: { type: "string" },
		"clear-estimate": { type: "boolean" },
		flagged: { type: "boolean" },
		unflagged: { type: "boolean" },
		sequential: { type: "boolean" },
		parallel: { type: "boolean" },
		"add-tag": {
			type: "string",
			multiple: true
		},
		"remove-tag": {
			type: "string",
			multiple: true
		},
		"clear-tags": { type: "boolean" },
		project: { type: "string" },
		parent: { type: "string" },
		inbox: { type: "boolean" },
		repeat: { type: "string" },
		"repeat-method": { type: "string" },
		"clear-repeat": { type: "boolean" }
	}, "of task update --help");
	if (values.help) {
		printTaskUpdateHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task update --help");
	const taskId = positionals[0];
	if (!taskId) throw new Error("Task ID is required. Run 'of task update --help' for usage.");
	assertExclusive$1([["--note", values.note !== void 0], ["--append-note", values["append-note"] !== void 0]]);
	assertExclusive$1([["--due", values.due !== void 0], ["--clear-due", Boolean(values["clear-due"])]]);
	assertExclusive$1([["--defer", values.defer !== void 0], ["--clear-defer", Boolean(values["clear-defer"])]]);
	assertExclusive$1([["--estimate", values.estimate !== void 0], ["--clear-estimate", Boolean(values["clear-estimate"])]]);
	assertExclusive$1([["--flagged", Boolean(values.flagged)], ["--unflagged", Boolean(values.unflagged)]]);
	assertExclusive$1([["--sequential", Boolean(values.sequential)], ["--parallel", Boolean(values.parallel)]]);
	assertExclusive$1([
		["--project", values.project !== void 0],
		["--parent", values.parent !== void 0],
		["--inbox", Boolean(values.inbox)]
	]);
	assertExclusive$1([["--repeat", values.repeat !== void 0], ["--clear-repeat", Boolean(values["clear-repeat"])]]);
	if (values["repeat-method"] !== void 0 && values.repeat === void 0) throw new Error("--repeat-method requires --repeat");
	const options = { taskId };
	let hasChange = false;
	if (values.name !== void 0) {
		options.name = values.name;
		hasChange = true;
	}
	if (values.note !== void 0) {
		options.note = values.note;
		hasChange = true;
	}
	if (values["append-note"] !== void 0) {
		options.appendNote = values["append-note"];
		hasChange = true;
	}
	if (values.due !== void 0) {
		options.dueDate = parseDateToIso(values.due);
		hasChange = true;
	} else if (values["clear-due"]) {
		options.dueDate = null;
		hasChange = true;
	}
	if (values.defer !== void 0) {
		options.deferDate = parseDateToIso(values.defer);
		hasChange = true;
	} else if (values["clear-defer"]) {
		options.deferDate = null;
		hasChange = true;
	}
	if (values.estimate !== void 0) {
		options.estimatedMinutes = parsePositiveInteger("--estimate", values.estimate);
		hasChange = true;
	} else if (values["clear-estimate"]) {
		options.estimatedMinutes = null;
		hasChange = true;
	}
	if (values.flagged) {
		options.flagged = true;
		hasChange = true;
	} else if (values.unflagged) {
		options.flagged = false;
		hasChange = true;
	}
	if (values.sequential) {
		options.sequential = true;
		hasChange = true;
	} else if (values.parallel) {
		options.sequential = false;
		hasChange = true;
	}
	if (values["clear-tags"]) {
		options.clearTags = true;
		hasChange = true;
	}
	if (values["add-tag"] && values["add-tag"].length > 0) {
		options.addTags = values["add-tag"];
		hasChange = true;
	}
	if (values["remove-tag"] && values["remove-tag"].length > 0) {
		options.removeTags = values["remove-tag"];
		hasChange = true;
	}
	if (values.project !== void 0) {
		options.moveToProject = values.project;
		hasChange = true;
	} else if (values.parent !== void 0) {
		options.moveToParentId = values.parent;
		hasChange = true;
	} else if (values.inbox) {
		options.moveToInbox = true;
		hasChange = true;
	}
	if (values.repeat !== void 0) {
		const method = values["repeat-method"] !== void 0 ? parseRepetitionMethod(values["repeat-method"]) : "fixed";
		options.repetitionRule = {
			ruleString: values.repeat,
			method
		};
		hasChange = true;
	} else if (values["clear-repeat"]) {
		options.repetitionRule = null;
		hasChange = true;
	}
	if (!hasChange) throw new Error("At least one update option is required. Run 'of task update --help' for usage.");
	await runAndPrint(SCRIPT$20, buildTaskUpdateArgs(options));
}
async function taskComplete(args) {
	const { values, positionals } = parseCommandArgs(args, {}, "of task complete --help");
	if (values.help) {
		printTaskCompleteHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task complete --help");
	const taskId = positionals[0];
	if (!taskId) throw new Error("Task ID is required. Run 'of task complete --help' for usage.");
	await runAndPrint(SCRIPT$19, buildTaskCompleteArgs(taskId));
}
async function taskUncomplete(args) {
	const { values, positionals } = parseCommandArgs(args, {}, "of task uncomplete --help");
	if (values.help) {
		printTaskUncompleteHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task uncomplete --help");
	const taskId = positionals[0];
	if (!taskId) throw new Error("Task ID is required. Run 'of task uncomplete --help' for usage.");
	await runAndPrint(SCRIPT$18, buildTaskUncompleteArgs(taskId));
}
async function taskDrop(args) {
	const { values, positionals } = parseCommandArgs(args, { "all-occurrences": { type: "boolean" } }, "of task drop --help");
	if (values.help) {
		printTaskDropHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task drop --help");
	const taskId = positionals[0];
	if (!taskId) throw new Error("Task ID is required. Run 'of task drop --help' for usage.");
	await runAndPrint(SCRIPT$17, buildTaskDropArgs({
		taskId,
		allOccurrences: Boolean(values["all-occurrences"])
	}));
}
async function taskDelete(args) {
	const { values, positionals } = parseCommandArgs(args, {}, "of task delete --help");
	if (values.help) {
		printTaskDeleteHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task delete --help");
	const taskId = positionals[0];
	if (!taskId) throw new Error("Task ID is required. Run 'of task delete --help' for usage.");
	await runAndPrint(SCRIPT$16, buildTaskDeleteArgs(taskId));
}
async function taskToProject(args) {
	const { values, positionals } = parseCommandArgs(args, { folder: { type: "string" } }, "of task to-project --help");
	if (values.help) {
		printTaskToProjectHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task to-project --help");
	const taskId = positionals[0];
	if (!taskId) throw new Error("Task ID is required. Run 'of task to-project --help' for usage.");
	await runAndPrint(SCRIPT$15, buildTaskToProjectArgs({
		taskId,
		folder: values.folder
	}));
}
async function taskSearch(args) {
	const { values, positionals } = parseCommandArgs(args, {
		project: { type: "string" },
		flagged: { type: "boolean" },
		limit: { type: "string" }
	}, "of task search --help");
	if (values.help) {
		printTaskSearchHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task search --help");
	const keyword = positionals[0];
	if (!keyword) throw new Error("Search keyword is required. Run 'of task search --help' for usage.");
	const options = {};
	if (values.project !== void 0) options.project = values.project;
	if (values.flagged) options.flagged = true;
	if (values.limit !== void 0) options.limit = parsePositiveInteger("--limit", values.limit);
	await runAndPrint(SCRIPT$14, buildTaskSearchArgs(keyword, options));
}
function runTask(args) {
	const sub = args[0];
	switch (sub) {
		case "add": return taskAdd(args.slice(1));
		case "show": return taskShow(args.slice(1));
		case "update": return taskUpdate(args.slice(1));
		case "complete": return taskComplete(args.slice(1));
		case "uncomplete": return taskUncomplete(args.slice(1));
		case "drop": return taskDrop(args.slice(1));
		case "delete": return taskDelete(args.slice(1));
		case "to-project": return taskToProject(args.slice(1));
		case "search": return taskSearch(args.slice(1));
		case "--help":
		case "-h":
			printTaskHelp();
			return Promise.resolve();
		default: throw new Error(`Unknown task subcommand '${sub ?? ""}'. Run 'of task --help' for usage.`);
	}
}
function printTaskAddHelp() {
	console.log(`Usage: of task add <name> [options]

Add a new task to OmniFocus.

Arguments:
  <name>                        Task name (required)

Options:
  --project <name>              Assign to project (exclusive with --parent)
  --parent <id>                 Create as subtask under parent task ID
  --due <date>                  Due date (e.g. "2026-03-15", "tomorrow")
  --defer <date>                Defer date
  --flagged                     Mark as flagged
  --note <text>                 Add a note
  --estimate <minutes>          Estimated duration in minutes
  --tag <name>                  Add a tag (repeatable)
  --sequential                  Make child tasks sequential
  --repeat <ics-rule>           Recurrence rule (e.g. "FREQ=WEEKLY;INTERVAL=1")
  --repeat-method <method>      fixed (default), due-date, defer-until-date

Examples:
  of task add "Buy groceries"
  of task add "Write report" --project "Work" --due "2026-03-15" --flagged
  of task add "Draft outline" --parent "nPaAZJbFJcj" --estimate 30
  of task add "Weekly review" --repeat "FREQ=WEEKLY;INTERVAL=1" --repeat-method fixed`);
}
function printTaskShowHelp() {
	console.log(`Usage: of task show <id> [options]

Show detailed information for a task.

Arguments:
  <id>            Task ID (required)

Options:
  --children      Include active child tasks

Examples:
  of task show "nPaAZJbFJcj"
  of task show "nPaAZJbFJcj" --children`);
}
function printTaskUpdateHelp() {
	console.log(`Usage: of task update <id> [options]

Update a task's properties, tags, or container (project/parent/inbox).

Arguments:
  <id>                          Task ID (required)

Options:
  --name <name>                 Rename task
  --note <text>                 Replace note
  --append-note <text>          Append text to note
  --due <date> / --clear-due    Set or clear due date
  --defer <date> / --clear-defer Set or clear defer date
  --estimate <min> / --clear-estimate Set or clear estimated minutes
  --flagged / --unflagged       Set or clear flag
  --sequential / --parallel     Set child task ordering
  --add-tag <name>              Add a tag (repeatable)
  --remove-tag <name>           Remove a tag (repeatable)
  --clear-tags                  Remove all tags
  --project <name>              Move task to project
  --parent <id>                 Move task under parent task ID
  --inbox                       Move task back to inbox
  --repeat <ics-rule>           Set recurrence rule
  --repeat-method <method>      fixed (default), due-date, defer-until-date
  --clear-repeat                Remove recurrence rule

Examples:
  of task update "nPaAZJbFJcj" --project "Work" --add-tag "@PC" --estimate 15
  of task update "nPaAZJbFJcj" --defer "+3d" --clear-due --unflagged`);
}
function printTaskCompleteHelp() {
	console.log(`Usage: of task complete <id>

Mark a task as complete.

Arguments:
  <id>    Task ID (required)

Examples:
  of task complete "nPaAZJbFJcj"`);
}
function printTaskUncompleteHelp() {
	console.log(`Usage: of task uncomplete <id>

Mark a completed task as incomplete.

Arguments:
  <id>    Task ID (required)

Examples:
  of task uncomplete "nPaAZJbFJcj"`);
}
function printTaskDropHelp() {
	console.log(`Usage: of task drop <id> [options]

Drop a task (mark as will not be worked on).

Arguments:
  <id>                 Task ID (required)

Options:
  --all-occurrences    Stop repeating (drop all future occurrences)

Examples:
  of task drop "nPaAZJbFJcj"
  of task drop "nPaAZJbFJcj" --all-occurrences`);
}
function printTaskDeleteHelp() {
	console.log(`Usage: of task delete <id>

Permanently delete a task from OmniFocus.

Arguments:
  <id>    Task ID (required)

Examples:
  of task delete "nPaAZJbFJcj"`);
}
function printTaskToProjectHelp() {
	console.log(`Usage: of task to-project <id> [options]

Convert a task (and its subtasks) into a new project.

Arguments:
  <id>                Task ID (required)

Options:
  --folder <name>     Place the new project in this folder

Examples:
  of task to-project "nPaAZJbFJcj"
  of task to-project "nPaAZJbFJcj" --folder "Work"`);
}
function printTaskSearchHelp() {
	console.log(`Usage: of task search <keyword> [options]

Search for tasks by keyword.

Arguments:
  <keyword>               Search keyword (required)

Options:
  --project <name>        Filter by project
  --flagged               Only flagged tasks
  --limit <n>             Max number of results

Examples:
  of task search "report"
  of task search "meeting" --project "Work" --flagged --limit 10`);
}
function printTaskHelp() {
	console.log(`Usage: of task <subcommand> [arguments]

Subcommands:
  add <name> [options]            Add a new task
  show <id> [options]             Show detailed task info
  update <id> [options]           Update task properties or move container
  complete <id>                   Mark task as complete
  uncomplete <id>                 Mark task as incomplete
  drop <id> [options]             Drop task
  delete <id>                     Permanently delete task
  to-project <id> [options]       Convert task to project
  search <keyword> [options]      Search tasks

Run 'of task <subcommand> --help' for details.`);
}
//#endregion
//#region src/jxa/scripts/tasks-filter.ts
function buildFilterScript(filterCondition, setup = "") {
	return wrapOmniScript(`
    ${setup}
    var tasks = flattenedTasks;
    var result = [];
    var total = 0;

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.project !== null) continue;
      if (!isTaskActive(t)) continue;
      ${filterCondition}
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);
}
function buildTasksFlaggedScript() {
	return buildFilterScript(`
      if (t.flagged) {
        total++;
        if (result.length < 50) result.push(formatTaskBrief(t));
      }`);
}
function buildTasksOverdueScript() {
	return buildFilterScript(`
      var due = t.dueDate;
      if (!due) continue;
      if (due < startOfToday) {
        total++;
        if (result.length < 50) result.push(formatTaskBrief(t));
      }`, "var now = new Date();\n    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);");
}
function buildTasksTodayScript() {
	return buildFilterScript(`
      var due = t.dueDate;
      if (!due) continue;
      if (due <= endOfToday) {
        total++;
        if (result.length < 50) result.push(formatTaskBrief(t));
      }`, "var now = new Date();\n    var endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);");
}
//#endregion
//#region src/jxa/scripts/tasks-list.ts
const SCRIPT$13 = wrapOmniScript(`
    var statusFilter = input.status || "available";
    var limit = input.limit || 50;

    var targetProjectId = null;
    if (input.project) {
      var proj = flattenedProjects.byName(input.project);
      if (!proj) {
        return JSON.stringify({ success: false, error: "Project not found: " + input.project });
      }
      targetProjectId = proj.id.primaryKey;
    }

    var requiredTagIds = [];
    if (input.tags && input.tags.length > 0) {
      var resolvedTags = resolveTags(input.tags);
      for (var ti = 0; ti < resolvedTags.length; ti++) {
        requiredTagIds.push(resolvedTags[ti].id.primaryKey);
      }
    }

    var dueBefore = input.dueBefore ? new Date(input.dueBefore) : null;
    var deferBefore = input.deferBefore ? new Date(input.deferBefore) : null;
    var completedSince = input.completedSince ? new Date(input.completedSince) : null;

    var tasks = flattenedTasks;
    var result = [];
    var total = 0;

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.project !== null) continue;

      if (statusFilter === "available") {
        if (!isTaskAvailable(t)) continue;
      } else if (statusFilter === "next") {
        if (t.taskStatus !== Task.Status.Next) continue;
      } else if (statusFilter === "blocked") {
        if (t.taskStatus !== Task.Status.Blocked) continue;
      } else if (statusFilter === "remaining") {
        if (!isTaskActive(t)) continue;
      } else if (statusFilter === "completed") {
        if (!t.completed) continue;
      } else if (statusFilter === "dropped") {
        if (t.taskStatus !== Task.Status.Dropped) continue;
      } else {
        return JSON.stringify({ success: false, error: "Invalid task status: " + statusFilter });
      }

      if (targetProjectId !== null) {
        var cp = t.containingProject;
        if (!cp || cp.id.primaryKey !== targetProjectId) continue;
      }

      if (input.flagged !== undefined && t.flagged !== input.flagged) continue;

      if (input.maxEstimate !== undefined) {
        if (t.estimatedMinutes === null || t.estimatedMinutes > input.maxEstimate) continue;
      }

      if (dueBefore !== null) {
        if (!t.dueDate || t.dueDate > dueBefore) continue;
      }

      if (deferBefore !== null) {
        if (!t.deferDate || t.deferDate > deferBefore) continue;
      }

      if (completedSince !== null) {
        if (!t.completionDate || t.completionDate < completedSince) continue;
      }

      if (requiredTagIds.length > 0) {
        var taskTags = t.tags;
        var matchedAll = true;
        for (var r = 0; r < requiredTagIds.length; r++) {
          var found = false;
          for (var k = 0; k < taskTags.length; k++) {
            if (taskTags[k].id.primaryKey === requiredTagIds[r]) {
              found = true;
              break;
            }
          }
          if (!found) {
            matchedAll = false;
            break;
          }
        }
        if (!matchedAll) continue;
      }

      total++;
      if (result.length < limit) {
        result.push(input.detailed ? formatTaskDetail(t) : formatTaskBrief(t));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);
function buildTasksListArgs(options) {
	return buildJsonArgs(options);
}
//#endregion
//#region src/jxa/scripts/tasks-forecast.ts
const SCRIPT$12 = wrapOmniScript(`
    var days = input.days || 7;
    var now = new Date();
    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    var horizonEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + days - 1,
      23,
      59,
      59,
      999
    );

    var tasks = flattenedTasks;
    var overdueItems = [];
    var dueItems = [];
    var deferredItems = [];

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.project !== null) continue;
      if (!isTaskActive(t)) continue;

      var due = t.dueDate;
      if (due) {
        if (due < startOfToday) {
          overdueItems.push({ sortKey: due.getTime(), task: formatTaskBrief(t) });
        } else if (due <= horizonEnd) {
          dueItems.push({ sortKey: due.getTime(), task: formatTaskBrief(t) });
        }
      }

      var defer = t.deferDate;
      if (defer && defer >= startOfToday && defer <= horizonEnd) {
        deferredItems.push({ sortKey: defer.getTime(), task: formatTaskBrief(t) });
      }
    }

    function byDate(a, b) {
      return a.sortKey - b.sortKey;
    }
    overdueItems.sort(byDate);
    dueItems.sort(byDate);
    deferredItems.sort(byDate);

    var limit = 50;
    return JSON.stringify({
      success: true,
      days: days,
      overdue: overdueItems.slice(0, limit).map(function(x) { return x.task; }),
      due: dueItems.slice(0, limit).map(function(x) { return x.task; }),
      deferred: deferredItems.slice(0, limit).map(function(x) { return x.task; })
    });`);
function buildTasksForecastArgs(options) {
	return buildJsonArgs(options);
}
//#endregion
//#region src/cli/commands/tasks.ts
async function runSimpleTasksCommand(args, commandName, description, buildScript) {
	const helpCommand = `of tasks ${commandName} --help`;
	const { values, positionals } = parseCommandArgs(args, {}, helpCommand);
	if (values.help) {
		console.log(`Usage: of tasks ${commandName}\n\n${description}\n\nExamples:\n  of tasks ${commandName}`);
		return;
	}
	expectPositionalCount(positionals, 0, helpCommand);
	await runAndPrint(buildScript());
}
async function tasksList(args) {
	const { values, positionals } = parseCommandArgs(args, {
		status: { type: "string" },
		tag: {
			type: "string",
			multiple: true
		},
		project: { type: "string" },
		flagged: { type: "boolean" },
		"max-estimate": { type: "string" },
		"due-before": { type: "string" },
		"defer-before": { type: "string" },
		"completed-since": { type: "string" },
		detailed: { type: "boolean" },
		limit: { type: "string" }
	}, "of tasks list --help");
	if (values.help) {
		printTasksListHelp();
		return;
	}
	expectPositionalCount(positionals, 0, "of tasks list --help");
	const options = {};
	if (values.status !== void 0) options.status = parseTaskFilterStatus(values.status);
	if (values["completed-since"] !== void 0) {
		if (options.status !== void 0 && options.status !== "completed") throw new Error("--completed-since requires --status completed (or omit --status)");
		options.status = "completed";
		options.completedSince = parseDateBoundaryToIso(values["completed-since"], "start");
	}
	if (values.tag && values.tag.length > 0) options.tags = values.tag;
	if (values.project !== void 0) options.project = values.project;
	if (values.flagged) options.flagged = true;
	if (values["max-estimate"] !== void 0) options.maxEstimate = parsePositiveInteger("--max-estimate", values["max-estimate"]);
	if (values["due-before"] !== void 0) options.dueBefore = parseDateBoundaryToIso(values["due-before"], "end");
	if (values["defer-before"] !== void 0) options.deferBefore = parseDateBoundaryToIso(values["defer-before"], "end");
	if (values.detailed) options.detailed = true;
	if (values.limit !== void 0) options.limit = parsePositiveInteger("--limit", values.limit);
	await runAndPrint(SCRIPT$13, buildTasksListArgs(options));
}
async function tasksForecast(args) {
	const { values, positionals } = parseCommandArgs(args, { days: { type: "string" } }, "of tasks forecast --help");
	if (values.help) {
		printTasksForecastHelp();
		return;
	}
	expectPositionalCount(positionals, 0, "of tasks forecast --help");
	const days = values.days !== void 0 ? parsePositiveInteger("--days", values.days) : void 0;
	await runAndPrint(SCRIPT$12, buildTasksForecastArgs(days !== void 0 ? { days } : {}));
}
function runTasks(args) {
	const sub = args[0];
	switch (sub) {
		case "list": return tasksList(args.slice(1));
		case "forecast": return tasksForecast(args.slice(1));
		case "flagged": return runSimpleTasksCommand(args.slice(1), "flagged", "List flagged tasks.", buildTasksFlaggedScript);
		case "overdue": return runSimpleTasksCommand(args.slice(1), "overdue", "List overdue tasks.", buildTasksOverdueScript);
		case "today": return runSimpleTasksCommand(args.slice(1), "today", "List tasks due today (including overdue tasks).", buildTasksTodayScript);
		case "--help":
		case "-h":
			printTasksHelp();
			return Promise.resolve();
		default: throw new Error(`Unknown tasks subcommand '${sub ?? ""}'. Run 'of tasks --help' for usage.`);
	}
}
function printTasksListHelp() {
	console.log(`Usage: of tasks list [options]

Query tasks by availability status, context tags, estimate, or date range.

Options:
  --status <status>         available (default), next, blocked, remaining, completed, dropped
  --tag <name>              Filter by tag (repeatable, AND match)
  --project <name>          Filter by project name
  --flagged                 Only flagged tasks
  --max-estimate <minutes>  Tasks with estimated duration <= minutes
  --due-before <date>       Tasks due on or before date
  --defer-before <date>     Tasks deferred on or before date
  --completed-since <date>  Tasks completed on or after date (implies --status completed)
  --detailed                Return full task details
  --limit <n>               Max number of results (default: 50)

Examples:
  of tasks list --tag "@PC" --max-estimate 30
  of tasks list --status next --detailed
  of tasks list --status blocked --tag "Waiting For"
  of tasks list --completed-since "7d ago"`);
}
function printTasksForecastHelp() {
	console.log(`Usage: of tasks forecast [options]

Show overdue tasks, upcoming due tasks, and tasks becoming available (deferred) within N days.

Options:
  --days <n>    Number of days including today (default: 7)

Examples:
  of tasks forecast
  of tasks forecast --days 3`);
}
function printTasksHelp() {
	console.log(`Usage: of tasks <subcommand> [options]

Subcommands:
  list [options]       Query tasks by status, tag, estimate, or dates
  forecast [options]   Show overdue, upcoming due, and deferred tasks
  flagged              List flagged tasks
  overdue              List overdue tasks
  today                List tasks due today (including overdue)

Run 'of tasks <subcommand> --help' for details.`);
}
//#endregion
//#region src/jxa/scripts/perspectives-list.ts
function buildPerspectivesListScript() {
	return wrapOmniScript(`
    var names = Perspective.all.map(function(p) { return p.name; });

    return JSON.stringify({ success: true, perspectiveNames: names, totalCount: names.length });`);
}
//#endregion
//#region src/cli/commands/perspectives.ts
async function perspectivesList(args) {
	const { values, positionals } = parseCommandArgs(args, {}, "of perspectives list --help");
	if (values.help) {
		printPerspectivesListHelp();
		return;
	}
	expectPositionalCount(positionals, 0, "of perspectives list --help");
	await runAndPrint(buildPerspectivesListScript());
}
function runPerspectives(args) {
	const sub = args[0];
	switch (sub) {
		case "list": return perspectivesList(args.slice(1));
		case "--help":
		case "-h":
			printPerspectivesHelp();
			return Promise.resolve();
		default: throw new Error(`Unknown perspectives subcommand '${sub ?? ""}'. Run 'of perspectives --help' for usage.`);
	}
}
function printPerspectivesListHelp() {
	console.log(`Usage: of perspectives list

List all available perspectives in OmniFocus.

Examples:
  of perspectives list`);
}
function printPerspectivesHelp() {
	console.log(`Usage: of perspectives <subcommand>

Subcommands:
  list    List all perspectives

Run 'of perspectives list --help' for details.`);
}
//#endregion
//#region src/jxa/scripts/projects-list.ts
const SCRIPT$11 = wrapOmniScript(`
    var targetStatus = input.status ? resolveProjectStatus(input.status) : null;
    var limit = input.limit || 50;
    var projects = flattenedProjects;
    var result = [];
    var total = 0;

    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];

      if (targetStatus && p.status !== targetStatus) continue;

      if (input.folder) {
        var folder = p.parentFolder;
        var folderName = folder ? folder.name : null;
        if (folderName !== input.folder) continue;
      }

      if (input.stalled && !isProjectStalled(p)) continue;

      total++;
      if (result.length < limit) {
        result.push(formatProjectBrief(p));
      }
    }

    return JSON.stringify({ success: true, projects: result, totalCount: total });`);
function buildProjectsListArgs(options) {
	const payload = {};
	if (options.status) payload.status = options.status;
	if (options.folder) payload.folder = options.folder;
	if (options.stalled) payload.stalled = true;
	if (options.limit !== void 0) payload.limit = options.limit;
	return buildJsonArgs(payload);
}
//#endregion
//#region src/jxa/scripts/projects-show.ts
const SCRIPT$10 = wrapOmniScript(`
    var project = flattenedProjects.byName(input.name);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + input.name });
    }

    var projectData = input.detailed ? formatProjectDetail(project) : formatProjectBrief(project);
    var response = { success: true, project: projectData };

    if (input.includeTasks) {
      var tasks = project.flattenedTasks;
      var taskList = [];
      for (var i = 0; i < tasks.length && taskList.length < 50; i++) {
        if (isTaskActive(tasks[i])) {
          taskList.push(input.detailed ? formatTaskDetail(tasks[i]) : formatTaskBrief(tasks[i]));
        }
      }
      response.tasks = taskList;
    }

    return JSON.stringify(response);`);
function buildProjectsShowArgs(options) {
	return buildJsonArgs(options);
}
//#endregion
//#region src/jxa/scripts/projects-add.ts
const SCRIPT$9 = wrapOmniScript(`
    var folder = null;
    if (input.folder) {
      folder = flattenedFolders.byName(input.folder);
      if (!folder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + input.folder });
      }
    }

    var tags = input.tags && input.tags.length > 0 ? resolveTags(input.tags) : [];

    var project = folder ? new Project(input.name, folder.ending) : new Project(input.name);

    if (input.dueDate) project.dueDate = new Date(input.dueDate);
    if (input.deferDate) project.deferDate = new Date(input.deferDate);
    if (input.flagged !== undefined) project.flagged = input.flagged;
    if (input.note !== undefined) project.note = input.note;
    if (input.singleActions) {
      project.containsSingletonActions = true;
      project.sequential = false;
    } else if (input.sequential !== undefined) {
      project.sequential = input.sequential;
    }
    if (input.reviewInterval) {
      applyReviewInterval(project, input.reviewInterval);
    }
    if (tags.length > 0) project.addTags(tags);

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);
function buildProjectsAddArgs(name, options) {
	return buildJsonArgs({
		name,
		...options
	});
}
//#endregion
//#region src/jxa/scripts/projects-update.ts
const SCRIPT$8 = wrapOmniScript(`
    var project = flattenedProjects.byName(input.name);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + input.name });
    }

    // Validate references before mutating
    var targetFolder = null;
    if (input.folder !== undefined) {
      targetFolder = flattenedFolders.byName(input.folder);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + input.folder });
      }
    }

    var tagsToAdd = input.addTags && input.addTags.length > 0 ? resolveTags(input.addTags) : [];
    var tagsToRemove = input.removeTags && input.removeTags.length > 0 ? resolveTags(input.removeTags) : [];

    if (targetFolder) {
      moveSections([project], targetFolder.ending);
    } else if (input.topLevel) {
      moveSections([project], library.ending);
    }

    if (input.newName !== undefined) project.name = input.newName;
    if (input.note !== undefined) project.note = input.note;
    if (input.appendNote !== undefined) project.appendStringToNote(input.appendNote);
    if (input.dueDate !== undefined) {
      project.dueDate = input.dueDate === null ? null : new Date(input.dueDate);
    }
    if (input.deferDate !== undefined) {
      project.deferDate = input.deferDate === null ? null : new Date(input.deferDate);
    }
    if (input.flagged !== undefined) project.flagged = input.flagged;
    if (input.singleActions === true) {
      project.containsSingletonActions = true;
      project.sequential = false;
    } else if (input.sequential === true) {
      project.containsSingletonActions = false;
      project.sequential = true;
    } else if (input.sequential === false && input.singleActions === false) {
      project.containsSingletonActions = false;
      project.sequential = false;
    }
    if (input.clearTags) project.clearTags();
    if (tagsToRemove.length > 0) project.removeTags(tagsToRemove);
    if (tagsToAdd.length > 0) project.addTags(tagsToAdd);
    if (input.reviewInterval) {
      applyReviewInterval(project, input.reviewInterval);
    }
    if (input.nextReviewDate !== undefined) {
      project.nextReviewDate = new Date(input.nextReviewDate);
    }

    return JSON.stringify({ success: true, project: formatProjectDetail(project) });`);
function buildProjectsUpdateArgs(options) {
	return buildJsonArgs(options);
}
//#endregion
//#region src/jxa/scripts/projects-status.ts
const SCRIPT$7 = wrapOmniScript(`
    var project = flattenedProjects.byName(input.name);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + input.name });
    }

    project.status = resolveProjectStatus(input.status);

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);
function buildProjectsStatusArgs(name, status) {
	return buildJsonArgs({
		name,
		status
	});
}
//#endregion
//#region src/cli/commands/projects.ts
function assertExclusive(flags) {
	const active = flags.filter(([, set]) => set).map(([name]) => name);
	if (active.length > 1) throw new Error(`Cannot combine ${active.join(" and ")}`);
}
async function projectsList(args) {
	const { values, positionals } = parseCommandArgs(args, {
		status: { type: "string" },
		folder: { type: "string" },
		stalled: { type: "boolean" },
		limit: { type: "string" }
	}, "of projects list --help");
	if (values.help) {
		printProjectsListHelp();
		return;
	}
	expectPositionalCount(positionals, 0, "of projects list --help");
	const status = values.status !== void 0 ? parseProjectStatus(values.status) : void 0;
	const limit = values.limit !== void 0 ? parsePositiveInteger("--limit", values.limit) : void 0;
	await runAndPrint(SCRIPT$11, buildProjectsListArgs({
		status,
		folder: values.folder,
		stalled: Boolean(values.stalled) || void 0,
		limit
	}));
}
async function projectsShow(args) {
	const { values, positionals } = parseCommandArgs(args, {
		detailed: { type: "boolean" },
		tasks: { type: "boolean" }
	}, "of projects show --help");
	if (values.help) {
		printProjectsShowHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of projects show --help");
	const name = positionals[0];
	if (!name) throw new Error("Project name is required. Run 'of projects show --help' for usage.");
	await runAndPrint(SCRIPT$10, buildProjectsShowArgs({
		name,
		detailed: Boolean(values.detailed),
		includeTasks: Boolean(values.tasks)
	}));
}
async function projectsAdd(args) {
	const { values, positionals } = parseCommandArgs(args, {
		due: { type: "string" },
		defer: { type: "string" },
		flagged: { type: "boolean" },
		note: { type: "string" },
		sequential: { type: "boolean" },
		"single-actions": { type: "boolean" },
		tag: {
			type: "string",
			multiple: true
		},
		folder: { type: "string" },
		"review-interval": { type: "string" }
	}, "of projects add --help");
	if (values.help) {
		printProjectsAddHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of projects add --help");
	const name = positionals[0];
	if (!name) throw new Error("Project name is required. Run 'of projects add --help' for usage.");
	assertExclusive([["--sequential", Boolean(values.sequential)], ["--single-actions", Boolean(values["single-actions"])]]);
	const options = {};
	if (values.due !== void 0) options.dueDate = parseDateToIso(values.due);
	if (values.defer !== void 0) options.deferDate = parseDateToIso(values.defer);
	if (values.flagged) options.flagged = true;
	if (values.note !== void 0) options.note = values.note;
	if (values.sequential) options.sequential = true;
	if (values["single-actions"]) options.singleActions = true;
	if (values.tag && values.tag.length > 0) options.tags = values.tag;
	if (values.folder !== void 0) options.folder = values.folder;
	if (values["review-interval"] !== void 0) options.reviewInterval = parseReviewInterval(values["review-interval"]);
	await runAndPrint(SCRIPT$9, buildProjectsAddArgs(name, options));
}
async function projectsUpdate(args) {
	const { values, positionals } = parseCommandArgs(args, {
		name: { type: "string" },
		note: { type: "string" },
		"append-note": { type: "string" },
		due: { type: "string" },
		"clear-due": { type: "boolean" },
		defer: { type: "string" },
		"clear-defer": { type: "boolean" },
		flagged: { type: "boolean" },
		unflagged: { type: "boolean" },
		sequential: { type: "boolean" },
		parallel: { type: "boolean" },
		"single-actions": { type: "boolean" },
		"add-tag": {
			type: "string",
			multiple: true
		},
		"remove-tag": {
			type: "string",
			multiple: true
		},
		"clear-tags": { type: "boolean" },
		folder: { type: "string" },
		"top-level": { type: "boolean" },
		"review-interval": { type: "string" },
		"next-review": { type: "string" }
	}, "of projects update --help");
	if (values.help) {
		printProjectsUpdateHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of projects update --help");
	const name = positionals[0];
	if (!name) throw new Error("Project name is required. Run 'of projects update --help' for usage.");
	assertExclusive([["--note", values.note !== void 0], ["--append-note", values["append-note"] !== void 0]]);
	assertExclusive([["--due", values.due !== void 0], ["--clear-due", Boolean(values["clear-due"])]]);
	assertExclusive([["--defer", values.defer !== void 0], ["--clear-defer", Boolean(values["clear-defer"])]]);
	assertExclusive([["--flagged", Boolean(values.flagged)], ["--unflagged", Boolean(values.unflagged)]]);
	assertExclusive([
		["--sequential", Boolean(values.sequential)],
		["--parallel", Boolean(values.parallel)],
		["--single-actions", Boolean(values["single-actions"])]
	]);
	assertExclusive([["--folder", values.folder !== void 0], ["--top-level", Boolean(values["top-level"])]]);
	const options = { name };
	let hasChange = false;
	if (values.name !== void 0) {
		options.newName = values.name;
		hasChange = true;
	}
	if (values.note !== void 0) {
		options.note = values.note;
		hasChange = true;
	}
	if (values["append-note"] !== void 0) {
		options.appendNote = values["append-note"];
		hasChange = true;
	}
	if (values.due !== void 0) {
		options.dueDate = parseDateToIso(values.due);
		hasChange = true;
	} else if (values["clear-due"]) {
		options.dueDate = null;
		hasChange = true;
	}
	if (values.defer !== void 0) {
		options.deferDate = parseDateToIso(values.defer);
		hasChange = true;
	} else if (values["clear-defer"]) {
		options.deferDate = null;
		hasChange = true;
	}
	if (values.flagged) {
		options.flagged = true;
		hasChange = true;
	} else if (values.unflagged) {
		options.flagged = false;
		hasChange = true;
	}
	if (values["single-actions"]) {
		options.singleActions = true;
		hasChange = true;
	} else if (values.sequential) {
		options.sequential = true;
		hasChange = true;
	} else if (values.parallel) {
		options.sequential = false;
		options.singleActions = false;
		hasChange = true;
	}
	if (values["clear-tags"]) {
		options.clearTags = true;
		hasChange = true;
	}
	if (values["add-tag"] && values["add-tag"].length > 0) {
		options.addTags = values["add-tag"];
		hasChange = true;
	}
	if (values["remove-tag"] && values["remove-tag"].length > 0) {
		options.removeTags = values["remove-tag"];
		hasChange = true;
	}
	if (values.folder !== void 0) {
		options.folder = values.folder;
		hasChange = true;
	} else if (values["top-level"]) {
		options.topLevel = true;
		hasChange = true;
	}
	if (values["review-interval"] !== void 0) {
		options.reviewInterval = parseReviewInterval(values["review-interval"]);
		hasChange = true;
	}
	if (values["next-review"] !== void 0) {
		options.nextReviewDate = parseDateToIso(values["next-review"]);
		hasChange = true;
	}
	if (!hasChange) throw new Error("At least one update option is required. Run 'of projects update --help' for usage.");
	await runAndPrint(SCRIPT$8, buildProjectsUpdateArgs(options));
}
async function projectsStatus(args) {
	const { values, positionals } = parseCommandArgs(args, {}, "of projects status --help");
	if (values.help) {
		printProjectsStatusHelp();
		return;
	}
	expectPositionalCount(positionals, 2, "of projects status --help");
	const [name, rawStatus] = positionals;
	if (!name) throw new Error("Project name is required. Run 'of projects status --help' for usage.");
	if (!rawStatus) throw new Error("Status is required. Run 'of projects status --help' for usage.");
	await runAndPrint(SCRIPT$7, buildProjectsStatusArgs(name, parseProjectStatus(rawStatus)));
}
function runProjects(args) {
	const sub = args[0];
	switch (sub) {
		case "list": return projectsList(args.slice(1));
		case "show": return projectsShow(args.slice(1));
		case "add": return projectsAdd(args.slice(1));
		case "update": return projectsUpdate(args.slice(1));
		case "status": return projectsStatus(args.slice(1));
		case "--help":
		case "-h":
			printProjectsHelp();
			return Promise.resolve();
		default: throw new Error(`Unknown projects subcommand '${sub ?? ""}'. Run 'of projects --help' for usage.`);
	}
}
function printProjectsListHelp() {
	console.log(`Usage: of projects list [options]

List projects in OmniFocus.

Options:
  --status <status>    Filter by status (active, on-hold, done, dropped)
  --folder <name>      Filter by folder name
  --stalled            Only active projects with no available next action
  --limit <n>          Max number of results (default: 50)

Examples:
  of projects list
  of projects list --status active
  of projects list --folder "Work"
  of projects list --stalled`);
}
function printProjectsShowHelp() {
	console.log(`Usage: of projects show <name> [options]

Show project details.

Arguments:
  <name>               Project name (required)

Options:
  --detailed           Show full project details (including review info & next task)
  --tasks              Include remaining (incomplete) tasks

Examples:
  of projects show "My Project"
  of projects show "My Project" --detailed --tasks`);
}
function printProjectsAddHelp() {
	console.log(`Usage: of projects add <name> [options]

Create a new project in OmniFocus.

Arguments:
  <name>                        Project name (required)

Options:
  --due <date>                  Due date (e.g. "2026-03-15", "tomorrow")
  --defer <date>                Defer date
  --flagged                     Mark as flagged
  --note <text>                 Add a note
  --sequential                  Make tasks sequential
  --single-actions              Make this a single-actions list
  --tag <name>                  Add a tag (repeatable)
  --folder <name>               Place in folder
  --review-interval <interval>  Review interval (e.g. "7d", "2w", "1m", "1y")

Examples:
  of projects add "New Project"
  of projects add "Work Project" --folder "Work" --due "next week" --sequential
  of projects add "Misc Errands" --single-actions --review-interval 2w`);
}
function printProjectsUpdateHelp() {
	console.log(`Usage: of projects update <name> [options]

Update a project's properties, folder, type, tags, or review settings.

Arguments:
  <name>                        Project name (required)

Options:
  --name <new-name>             Rename project
  --note <text>                 Replace note
  --append-note <text>          Append text to note
  --due <date> / --clear-due    Set or clear due date
  --defer <date> / --clear-defer Set or clear defer date
  --flagged / --unflagged       Set or clear flag
  --sequential / --parallel / --single-actions  Set project type
  --add-tag <name>              Add a tag (repeatable)
  --remove-tag <name>           Remove a tag (repeatable)
  --clear-tags                  Remove all tags
  --folder <name> / --top-level Move project to folder or library top level
  --review-interval <interval>  Set review interval (e.g. "7d", "2w", "1m")
  --next-review <date>          Set next review date

Examples:
  of projects update "My Project" --folder "Work" --review-interval 1w
  of projects update "Old Name" --name "New Name" --single-actions`);
}
function printProjectsStatusHelp() {
	console.log(`Usage: of projects status <name> <status>

Change a project's status.

Arguments:
  <name>               Project name (required)
  <status>             New status: active, on-hold, done, dropped

Examples:
  of projects status "My Project" on-hold
  of projects status "Old Project" done`);
}
function printProjectsHelp() {
	console.log(`Usage: of projects <subcommand> [arguments]

Subcommands:
  list [options]                    List projects
  show <name> [options]             Show project details
  add <name> [options]              Create a new project
  update <name> [options]           Update project properties or folder
  status <name> <status>            Change project status

Run 'of projects <subcommand> --help' for details.`);
}
//#endregion
//#region src/jxa/scripts/review-list.ts
const SCRIPT$6 = wrapOmniScript(`
    var targetStatus = input.status ? resolveProjectStatus(input.status) : null;
    var now = new Date();
    var projects = flattenedProjects;
    var dueForReview = [];

    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      if (targetStatus) {
        if (p.status !== targetStatus) continue;
      } else {
        if (p.status !== Project.Status.Active && p.status !== Project.Status.OnHold) continue;
      }

      var nextReview = p.nextReviewDate;
      if (nextReview && nextReview <= now) {
        dueForReview.push({ sortKey: nextReview.getTime(), project: p });
      }
    }

    dueForReview.sort(function(a, b) {
      return a.sortKey - b.sortKey;
    });

    var result = dueForReview.map(function(item) {
      return formatProjectDetail(item.project);
    });

    return JSON.stringify({ success: true, projects: result, totalCount: result.length });`);
function buildReviewListArgs(options) {
	const payload = {};
	if (options.status) payload.status = options.status;
	return buildJsonArgs(payload);
}
//#endregion
//#region src/jxa/scripts/review-mark.ts
const SCRIPT$5 = wrapOmniScript(`
    var project = flattenedProjects.byName(input.name);
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + input.name });
    }

    project.lastReviewDate = new Date();

    return JSON.stringify({ success: true, project: formatProjectDetail(project) });`);
function buildReviewMarkArgs(name) {
	return buildJsonArgs({ name });
}
//#endregion
//#region src/cli/commands/review.ts
async function reviewList(args) {
	const { values, positionals } = parseCommandArgs(args, { status: { type: "string" } }, "of review list --help");
	if (values.help) {
		printReviewListHelp();
		return;
	}
	expectPositionalCount(positionals, 0, "of review list --help");
	await runAndPrint(SCRIPT$6, buildReviewListArgs({ status: values.status !== void 0 ? parseReviewStatus(values.status) : void 0 }));
}
async function reviewMark(args) {
	const { values, positionals } = parseCommandArgs(args, {}, "of review mark --help");
	if (values.help) {
		printReviewMarkHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of review mark --help");
	const name = positionals[0];
	if (!name) throw new Error("Project name is required. Run 'of review mark --help' for usage.");
	await runAndPrint(SCRIPT$5, buildReviewMarkArgs(name));
}
function runReview(args) {
	const sub = args[0];
	switch (sub) {
		case "list": return reviewList(args.slice(1));
		case "mark": return reviewMark(args.slice(1));
		case "--help":
		case "-h":
			printReviewHelp();
			return Promise.resolve();
		default: throw new Error(`Unknown review subcommand '${sub ?? ""}'. Run 'of review --help' for usage.`);
	}
}
function printReviewListHelp() {
	console.log(`Usage: of review list [options]

List projects currently due for review (nextReviewDate <= now), sorted oldest first.

Options:
  --status <status>    Filter by status: active, on-hold (default: both)

Examples:
  of review list
  of review list --status active`);
}
function printReviewMarkHelp() {
	console.log(`Usage: of review mark <project-name>

Mark a project as reviewed now (updates lastReviewDate and advances nextReviewDate).

Arguments:
  <project-name>    Project name (required)

Examples:
  of review mark "Q1 Launch"`);
}
function printReviewHelp() {
	console.log(`Usage: of review <subcommand> [arguments]

Subcommands:
  list [options]          List projects due for review
  mark <project-name>     Mark a project as reviewed

Run 'of review <subcommand> --help' for details.`);
}
//#endregion
//#region src/jxa/scripts/tags-list.ts
const SCRIPT$4 = wrapOmniScript(`
    var targetStatus = input.status ? resolveTagStatus(input.status) : null;
    var allTags = flattenedTags;
    var result = [];

    for (var i = 0; i < allTags.length; i++) {
      var tag = allTags[i];
      if (targetStatus && tag.status !== targetStatus) continue;
      result.push(formatTagInfo(tag));
    }

    return JSON.stringify({ success: true, tags: result, totalCount: result.length });`);
function buildTagsListArgs(options) {
	const payload = {};
	if (options.status) payload.status = options.status;
	return buildJsonArgs(payload);
}
//#endregion
//#region src/jxa/scripts/tags-add.ts
const SCRIPT$3 = wrapOmniScript(`
    var parentTag = null;
    if (input.parent) {
      parentTag = flattenedTags.byName(input.parent);
      if (!parentTag) {
        return JSON.stringify({ success: false, error: "Parent tag not found: " + input.parent });
      }
    }

    var tag = parentTag ? new Tag(input.name, parentTag.ending) : new Tag(input.name, tags.ending);
    if (input.onHold) {
      tag.status = Tag.Status.OnHold;
    }

    return JSON.stringify({ success: true, tag: formatTagInfo(tag) });`);
function buildTagsAddArgs(name, options) {
	return buildJsonArgs({
		name,
		...options
	});
}
//#endregion
//#region src/jxa/scripts/tags-status.ts
const SCRIPT$2 = wrapOmniScript(`
    var tag = flattenedTags.byName(input.name);
    if (!tag) {
      return JSON.stringify({ success: false, error: "Tag not found: " + input.name });
    }

    tag.status = resolveTagStatus(input.status);

    return JSON.stringify({ success: true, tag: formatTagInfo(tag) });`);
function buildTagsStatusArgs(name, status) {
	return buildJsonArgs({
		name,
		status
	});
}
//#endregion
//#region src/cli/commands/tags.ts
async function tagsList(args) {
	const { values, positionals } = parseCommandArgs(args, { status: { type: "string" } }, "of tags list --help");
	if (values.help) {
		printTagsListHelp();
		return;
	}
	expectPositionalCount(positionals, 0, "of tags list --help");
	await runAndPrint(SCRIPT$4, buildTagsListArgs({ status: values.status !== void 0 ? parseTagStatus(values.status) : void 0 }));
}
async function tagsAdd(args) {
	const { values, positionals } = parseCommandArgs(args, {
		parent: { type: "string" },
		"on-hold": { type: "boolean" }
	}, "of tags add --help");
	if (values.help) {
		printTagsAddHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of tags add --help");
	const name = positionals[0];
	if (!name) throw new Error("Tag name is required. Run 'of tags add --help' for usage.");
	const options = {};
	if (values.parent !== void 0) options.parent = values.parent;
	if (values["on-hold"]) options.onHold = true;
	await runAndPrint(SCRIPT$3, buildTagsAddArgs(name, options));
}
async function tagsStatus(args) {
	const { values, positionals } = parseCommandArgs(args, {}, "of tags status --help");
	if (values.help) {
		printTagsStatusHelp();
		return;
	}
	expectPositionalCount(positionals, 2, "of tags status --help");
	const [name, rawStatus] = positionals;
	if (!name) throw new Error("Tag name is required. Run 'of tags status --help' for usage.");
	if (!rawStatus) throw new Error("Status is required. Run 'of tags status --help' for usage.");
	await runAndPrint(SCRIPT$2, buildTagsStatusArgs(name, parseTagStatus(rawStatus)));
}
function runTags(args) {
	const sub = args[0];
	switch (sub) {
		case "list": return tagsList(args.slice(1));
		case "add": return tagsAdd(args.slice(1));
		case "status": return tagsStatus(args.slice(1));
		case "--help":
		case "-h":
			printTagsHelp();
			return Promise.resolve();
		default: throw new Error(`Unknown tags subcommand '${sub ?? ""}'. Run 'of tags --help' for usage.`);
	}
}
function printTagsListHelp() {
	console.log(`Usage: of tags list [options]

List tags (contexts) in OmniFocus.

Options:
  --status <status>    Filter by status: active, on-hold, dropped

Examples:
  of tags list
  of tags list --status active
  of tags list --status on-hold`);
}
function printTagsAddHelp() {
	console.log(`Usage: of tags add <name> [options]

Create a new tag in OmniFocus.

Arguments:
  <name>               Tag name (required)

Options:
  --parent <name>      Create under parent tag
  --on-hold            Set tag status to on-hold (e.g. Waiting For)

Examples:
  of tags add "@PC"
  of tags add "Waiting For" --on-hold
  of tags add "Alice" --parent "Waiting For"`);
}
function printTagsStatusHelp() {
	console.log(`Usage: of tags status <name> <status>

Change a tag's status.

Arguments:
  <name>               Tag name (required)
  <status>             New status: active, on-hold, dropped

Examples:
  of tags status "Waiting For" on-hold
  of tags status "@Office" active`);
}
function printTagsHelp() {
	console.log(`Usage: of tags <subcommand> [arguments]

Subcommands:
  list [options]            List tags
  add <name> [options]      Create a new tag
  status <name> <status>    Change tag status

Run 'of tags <subcommand> --help' for details.`);
}
//#endregion
//#region src/jxa/scripts/folders-list.ts
const SCRIPT$1 = wrapOmniScript(`
    var targetStatus = input.status ? resolveFolderStatus(input.status) : null;
    var allFolders = flattenedFolders;
    var result = [];

    for (var i = 0; i < allFolders.length; i++) {
      var folder = allFolders[i];
      if (targetStatus && folder.status !== targetStatus) continue;
      result.push(formatFolderInfo(folder));
    }

    return JSON.stringify({ success: true, folders: result, totalCount: result.length });`);
function buildFoldersListArgs(options) {
	const payload = {};
	if (options.status) payload.status = options.status;
	return buildJsonArgs(payload);
}
//#endregion
//#region src/jxa/scripts/folders-add.ts
const SCRIPT = wrapOmniScript(`
    var parentFolder = null;
    if (input.parent) {
      parentFolder = flattenedFolders.byName(input.parent);
      if (!parentFolder) {
        return JSON.stringify({ success: false, error: "Parent folder not found: " + input.parent });
      }
    }

    var folder = parentFolder
      ? new Folder(input.name, parentFolder.ending)
      : new Folder(input.name, library.ending);

    return JSON.stringify({ success: true, folder: formatFolderInfo(folder) });`);
function buildFoldersAddArgs(name, options) {
	return buildJsonArgs({
		name,
		...options
	});
}
//#endregion
//#region src/cli/commands/folders.ts
async function foldersList(args) {
	const { values, positionals } = parseCommandArgs(args, { status: { type: "string" } }, "of folders list --help");
	if (values.help) {
		printFoldersListHelp();
		return;
	}
	expectPositionalCount(positionals, 0, "of folders list --help");
	await runAndPrint(SCRIPT$1, buildFoldersListArgs({ status: values.status !== void 0 ? parseFolderStatus(values.status) : void 0 }));
}
async function foldersAdd(args) {
	const { values, positionals } = parseCommandArgs(args, { parent: { type: "string" } }, "of folders add --help");
	if (values.help) {
		printFoldersAddHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of folders add --help");
	const name = positionals[0];
	if (!name) throw new Error("Folder name is required. Run 'of folders add --help' for usage.");
	const options = {};
	if (values.parent !== void 0) options.parent = values.parent;
	await runAndPrint(SCRIPT, buildFoldersAddArgs(name, options));
}
function runFolders(args) {
	const sub = args[0];
	switch (sub) {
		case "list": return foldersList(args.slice(1));
		case "add": return foldersAdd(args.slice(1));
		case "--help":
		case "-h":
			printFoldersHelp();
			return Promise.resolve();
		default: throw new Error(`Unknown folders subcommand '${sub ?? ""}'. Run 'of folders --help' for usage.`);
	}
}
function printFoldersListHelp() {
	console.log(`Usage: of folders list [options]

List folders (areas of responsibility) in OmniFocus.

Options:
  --status <status>    Filter by status: active, dropped

Examples:
  of folders list
  of folders list --status active`);
}
function printFoldersAddHelp() {
	console.log(`Usage: of folders add <name> [options]

Create a new folder in OmniFocus.

Arguments:
  <name>               Folder name (required)

Options:
  --parent <name>      Create under parent folder

Examples:
  of folders add "Work"
  of folders add "Q2" --parent "Work"`);
}
function printFoldersHelp() {
	console.log(`Usage: of folders <subcommand> [arguments]

Subcommands:
  list [options]          List folders
  add <name> [options]    Create a new folder

Run 'of folders <subcommand> --help' for details.`);
}
//#endregion
//#region src/cli/main.ts
const HELP_TEXT = `of - OmniFocus CLI

Usage: of <command> [arguments]

Commands:
  inbox list [--detailed]              List inbox tasks
  task add <name> [options]            Add a new task
  task show <id> [--children]          Show detailed task info
  task update <id> [options]           Update task properties or move container
  task complete <id>                   Mark task as complete
  task uncomplete <id>                 Mark task as incomplete
  task drop <id> [--all-occurrences]   Drop task
  task delete <id>                     Permanently delete task
  task to-project <id> [options]       Convert task to project
  task search <keyword> [options]      Search tasks
  tasks list [options]                 Query tasks by status, tag, estimate, dates
  tasks forecast [--days <n>]          Show overdue, due, and deferred tasks
  tasks flagged                        List flagged tasks
  tasks overdue                        List overdue tasks
  tasks today                          List tasks due today (including overdue)
  projects list [options]              List projects (supports --stalled)
  projects show <name> [options]       Show project details
  projects add <name> [options]        Create a new project
  projects update <name> [options]     Update project properties or folder
  projects status <name> <status>      Change project status
  review list [options]                List projects due for review
  review mark <name>                   Mark a project as reviewed
  tags list [options]                  List tags
  tags add <name> [options]            Create a new tag
  tags status <name> <status>          Change tag status
  folders list [options]               List folders
  folders add <name> [options]         Create a new folder
  perspectives list                    List all perspectives

Run 'of <command> --help' for command details.`;
async function main(args) {
	const cmd = args[0];
	switch (cmd) {
		case "inbox":
			await runInbox(args.slice(1));
			break;
		case "task":
			await runTask(args.slice(1));
			break;
		case "tasks":
			await runTasks(args.slice(1));
			break;
		case "perspectives":
			await runPerspectives(args.slice(1));
			break;
		case "projects":
			await runProjects(args.slice(1));
			break;
		case "review":
			await runReview(args.slice(1));
			break;
		case "tags":
			await runTags(args.slice(1));
			break;
		case "folders":
			await runFolders(args.slice(1));
			break;
		case "help":
		case "--help":
		case "-h":
		case void 0:
			console.log(HELP_TEXT);
			break;
		default: throw new Error(`Unknown command '${cmd}'. Run 'of --help' for usage.`);
	}
}
//#endregion
//#region src/cli/index.ts
main(process.argv.slice(2)).catch((err) => {
	console.error(`Error: ${err.message}`);
	process.exit(1);
});
//#endregion
export {};
