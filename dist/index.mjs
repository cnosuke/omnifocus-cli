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
function parseDateInput(input, now = /* @__PURE__ */ new Date()) {
	const trimmed = input.trim();
	if (!trimmed) throw new Error("Invalid date: value cannot be empty");
	const lower = trimmed.toLowerCase();
	if (lower === "today") return localDateWithDefaultTime(now, 0);
	if (lower === "tomorrow") return localDateWithDefaultTime(now, 1);
	if (lower === "next week") return localDateWithDefaultTime(now, 7);
	const daysMatch = lower.match(/^\+(\d+)d$/);
	if (daysMatch) return localDateWithDefaultTime(now, Number(daysMatch[1]));
	const weeksMatch = lower.match(/^\+(\d+)w$/);
	if (weeksMatch) return localDateWithDefaultTime(now, Number(weeksMatch[1]) * 7);
	const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (dateOnlyMatch) {
		const year = Number(dateOnlyMatch[1]);
		const month = Number(dateOnlyMatch[2]);
		const day = Number(dateOnlyMatch[3]);
		const parsed = new Date(year, month - 1, day, DEFAULT_HOUR, 0, 0, 0);
		if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) throw new Error(`Invalid date '${input}'`);
		return parsed;
	}
	const parsed = new Date(trimmed);
	if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date '${input}'`);
	return parsed;
}
function parseDateToIso(input, now = /* @__PURE__ */ new Date()) {
	return parseDateInput(input, now).toISOString();
}
function localDateWithDefaultTime(base, offsetDays) {
	return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays, DEFAULT_HOUR, 0, 0, 0);
}
//#endregion
//#region src/jxa/scripts/task-add.ts
const SCRIPT$6 = wrapOmniScript(`
    var project = null;
    if (input.project) {
      project = flattenedProjects.byName(input.project);
      if (!project) {
        return JSON.stringify({ success: false, error: "Project not found: " + input.project });
      }
    }

    var tags = input.tags && input.tags.length > 0 ? resolveTags(input.tags) : [];

    var task = project ? new Task(input.name, project) : new Task(input.name);

    if (input.dueDate) task.dueDate = new Date(input.dueDate);
    if (input.deferDate) task.deferDate = new Date(input.deferDate);
    if (input.flagged !== undefined) task.flagged = input.flagged;
    if (input.note !== undefined) task.note = input.note;
    if (input.estimatedMinutes !== undefined) task.estimatedMinutes = input.estimatedMinutes;
    if (tags.length > 0) task.addTags(tags);

    return JSON.stringify({ success: true, task: formatTaskBrief(task) });`);
function buildTaskAddArgs(name, options) {
	return buildJsonArgs({
		name,
		...options
	});
}
//#endregion
//#region src/jxa/scripts/task-complete.ts
const SCRIPT$5 = wrapOmniScript(`
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
//#region src/jxa/scripts/task-search.ts
const SCRIPT$4 = wrapOmniScript(`
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
//#region src/cli/commands/task.ts
async function taskAdd(args) {
	const { values, positionals } = parseCommandArgs(args, {
		project: { type: "string" },
		due: { type: "string" },
		defer: { type: "string" },
		flagged: { type: "boolean" },
		note: { type: "string" },
		estimate: { type: "string" },
		tag: {
			type: "string",
			multiple: true
		}
	}, "of task add --help");
	if (values.help) {
		printTaskAddHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of task add --help");
	const name = positionals[0];
	if (!name) throw new Error("Task name is required. Run 'of task add --help' for usage.");
	const options = {};
	if (values.project !== void 0) options.project = values.project;
	if (values.due !== void 0) options.dueDate = parseDateToIso(values.due);
	if (values.defer !== void 0) options.deferDate = parseDateToIso(values.defer);
	if (values.flagged) options.flagged = true;
	if (values.note !== void 0) options.note = values.note;
	if (values.estimate !== void 0) options.estimatedMinutes = parsePositiveInteger("--estimate", values.estimate);
	if (values.tag && values.tag.length > 0) options.tags = values.tag;
	await runAndPrint(SCRIPT$6, buildTaskAddArgs(name, options));
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
	await runAndPrint(SCRIPT$5, buildTaskCompleteArgs(taskId));
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
	await runAndPrint(SCRIPT$4, buildTaskSearchArgs(keyword, options));
}
function runTask(args) {
	const sub = args[0];
	switch (sub) {
		case "add": return taskAdd(args.slice(1));
		case "complete": return taskComplete(args.slice(1));
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
  <name>                  Task name (required)

Options:
  --project <name>        Assign to project
  --due <date>            Due date (e.g. "2026-03-15", "tomorrow")
  --defer <date>          Defer date
  --flagged               Mark as flagged
  --note <text>           Add a note
  --estimate <minutes>    Estimated duration in minutes
  --tag <name>            Add a tag (repeatable)

Examples:
  of task add "Buy groceries"
  of task add "Write report" --project "Work" --due "2026-03-15" --flagged
  of task add "Read book" --tag "personal" --tag "reading" --estimate 60`);
}
function printTaskCompleteHelp() {
	console.log(`Usage: of task complete <id>

Mark a task as complete.

Arguments:
  <id>    Task ID (required)

Examples:
  of task complete "nPaAZJbFJcj"`);
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
  complete <id>                   Mark task as complete
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
function runTasks(args) {
	const sub = args[0];
	switch (sub) {
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
function printTasksHelp() {
	console.log(`Usage: of tasks <subcommand>

Subcommands:
  flagged    List flagged tasks
  overdue    List overdue tasks
  today      List tasks due today (including overdue)

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
const SCRIPT$3 = wrapOmniScript(`
    var targetStatus = input.status ? resolveProjectStatus(input.status) : null;
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

      total++;
      if (result.length < 50) {
        result.push(formatProjectBrief(p));
      }
    }

    return JSON.stringify({ success: true, projects: result, totalCount: total });`);
function buildProjectsListArgs(options) {
	const payload = {};
	if (options.status) payload.status = options.status;
	if (options.folder) payload.folder = options.folder;
	return buildJsonArgs(payload);
}
//#endregion
//#region src/jxa/scripts/projects-show.ts
const SCRIPT$2 = wrapOmniScript(`
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
const SCRIPT$1 = wrapOmniScript(`
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
    if (input.sequential !== undefined) project.sequential = input.sequential;
    if (tags.length > 0) project.addTags(tags);

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);
function buildProjectsAddArgs(name, options) {
	return buildJsonArgs({
		name,
		...options
	});
}
//#endregion
//#region src/jxa/scripts/projects-status.ts
const SCRIPT = wrapOmniScript(`
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
//#region src/types/index.ts
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
//#endregion
//#region src/cli/commands/projects.ts
async function projectsList(args) {
	const { values, positionals } = parseCommandArgs(args, {
		status: { type: "string" },
		folder: { type: "string" }
	}, "of projects list --help");
	if (values.help) {
		printProjectsListHelp();
		return;
	}
	expectPositionalCount(positionals, 0, "of projects list --help");
	await runAndPrint(SCRIPT$3, buildProjectsListArgs({
		status: values.status !== void 0 ? parseProjectStatus(values.status) : void 0,
		folder: values.folder
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
	await runAndPrint(SCRIPT$2, buildProjectsShowArgs({
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
		tag: {
			type: "string",
			multiple: true
		},
		folder: { type: "string" }
	}, "of projects add --help");
	if (values.help) {
		printProjectsAddHelp();
		return;
	}
	expectPositionalCount(positionals, 1, "of projects add --help");
	const name = positionals[0];
	if (!name) throw new Error("Project name is required. Run 'of projects add --help' for usage.");
	const options = {};
	if (values.due !== void 0) options.dueDate = parseDateToIso(values.due);
	if (values.defer !== void 0) options.deferDate = parseDateToIso(values.defer);
	if (values.flagged) options.flagged = true;
	if (values.note !== void 0) options.note = values.note;
	if (values.sequential) options.sequential = true;
	if (values.tag && values.tag.length > 0) options.tags = values.tag;
	if (values.folder !== void 0) options.folder = values.folder;
	await runAndPrint(SCRIPT$1, buildProjectsAddArgs(name, options));
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
	await runAndPrint(SCRIPT, buildProjectsStatusArgs(name, parseProjectStatus(rawStatus)));
}
function runProjects(args) {
	const sub = args[0];
	switch (sub) {
		case "list": return projectsList(args.slice(1));
		case "show": return projectsShow(args.slice(1));
		case "add": return projectsAdd(args.slice(1));
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

Examples:
  of projects list
  of projects list --status active
  of projects list --folder "Work"`);
}
function printProjectsShowHelp() {
	console.log(`Usage: of projects show <name> [options]

Show project details.

Arguments:
  <name>               Project name (required)

Options:
  --detailed           Show full project details
  --tasks              Include remaining (incomplete) tasks

Examples:
  of projects show "My Project"
  of projects show "My Project" --detailed --tasks`);
}
function printProjectsAddHelp() {
	console.log(`Usage: of projects add <name> [options]

Create a new project in OmniFocus.

Arguments:
  <name>               Project name (required)

Options:
  --due <date>         Due date (e.g. "2026-03-15", "tomorrow")
  --defer <date>       Defer date
  --flagged            Mark as flagged
  --note <text>        Add a note
  --sequential         Make tasks sequential
  --tag <name>         Add a tag (repeatable)
  --folder <name>      Place in folder

Examples:
  of projects add "New Project"
  of projects add "Work Project" --folder "Work" --due "next week" --sequential`);
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
  status <name> <status>            Change project status

Run 'of projects <subcommand> --help' for details.`);
}
//#endregion
//#region src/cli/main.ts
const HELP_TEXT = `of - OmniFocus CLI

Usage: of <command> [arguments]

Commands:
  inbox list [--detailed]              List inbox tasks
  task add <name> [options]            Add a new task
  task complete <id>                   Mark task as complete
  task search <keyword> [options]      Search tasks
  tasks flagged                        List flagged tasks
  tasks overdue                        List overdue tasks
  tasks today                          List tasks due today (including overdue)
  perspectives list                    List all perspectives
  projects list [options]              List projects
  projects show <name> [options]       Show project details
  projects add <name> [options]        Create a new project
  projects status <name> <status>      Change project status

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
