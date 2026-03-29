#!/usr/bin/env node
import { execFile } from "node:child_process";
//#region src/jxa/runner.ts
const DEFAULT_TIMEOUT_MS = 3e4;
function runJxa(script, options = {}) {
	const { args = [], timeout = DEFAULT_TIMEOUT_MS } = options;
	return new Promise((resolve, reject) => {
		execFile("osascript", [
			"-l",
			"JavaScript",
			"-e",
			script,
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
//#region src/jxa/helpers.ts
const JXA_HELPERS = `
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
function wrapJxaScript(body) {
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
//#endregion
//#region src/jxa/scripts/inbox-list.ts
function buildInboxListScript(mode) {
	return wrapJxaScript(`
    var allTasks = doc.inboxTasks();
    var result = [];
    var total = 0;

    for (var i = 0; i < allTasks.length; i++) {
      if (allTasks[i].completed()) continue;
      total++;
      if (result.length >= 50) continue;
      result.push(${mode === "detailed" ? "formatTaskDetail" : "formatTaskBrief"}(allTasks[i]));
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);
}
//#endregion
//#region src/cli/commands/inbox.ts
async function inboxList(args) {
	let mode = "brief";
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--detailed") mode = "detailed";
		else if (arg === "--help" || arg === "-h") {
			printInboxListHelp();
			return;
		} else throw new Error(`Unknown flag '${arg}'. Run 'of inbox list --help' for usage.`);
	}
	await runAndPrint(buildInboxListScript(mode));
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
//#region src/cli/arg-utils.ts
function requireFlagValue(flag, args, index) {
	const value = args[index];
	if (value === void 0) throw new Error(`${flag} requires a value`);
	return value;
}
function requireInteger(flag, value) {
	const n = Number(value);
	if (!Number.isInteger(n) || n < 0) throw new Error(`${flag} must be a positive integer, got '${value}'`);
	return n;
}
function requirePositionalArg(args, current, existing, helpCommand) {
	if (current.startsWith("-")) throw new Error(`Unknown flag '${current}'. Run '${helpCommand}' for usage.`);
	if (existing) throw new Error(`Unexpected argument '${current}'. Run '${helpCommand}' for usage.`);
	return current;
}
//#endregion
//#region src/jxa/scripts/task-add.ts
const SCRIPT$6 = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var taskName = argv[argv.length - 2];
    var opts = JSON.parse(argv[argv.length - 1]);
    var task;

    if (opts.project) {
      var project = findProject(doc, opts.project);
      if (!project) {
        return JSON.stringify({ success: false, error: "Project not found: " + opts.project });
      }
      task = app.Task({ name: taskName });
      project.rootTask.tasks.push(task);
    } else {
      task = app.InboxTask({ name: taskName });
      doc.inboxTasks.push(task);
    }

    if (opts.dueDate) {
      var due = parseDate(opts.dueDate);
      if (due) task.dueDate = due;
    }
    if (opts.deferDate) {
      var defer = parseDate(opts.deferDate);
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
      for (var i = 0; i < opts.tags.length; i++) {
        var tag = findTag(doc, opts.tags[i]);
        if (tag) {
          app.add(tag, { to: task.tags });
        }
      }
    }

    return JSON.stringify({ success: true, task: formatTaskBrief(task) });`);
function buildTaskAddArgs(name, options) {
	return { args: [name, JSON.stringify(options)] };
}
//#endregion
//#region src/jxa/scripts/task-complete.ts
const SCRIPT$5 = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var taskId = argv[argv.length - 1];
    var task = findTask(doc, taskId);

    if (!task) {
      return JSON.stringify({ success: false, error: "Task not found: " + taskId });
    }

    app.markComplete(task);

    return JSON.stringify({
      success: true,
      task: { id: task.id(), name: task.name(), completed: task.completed() }
    });`);
function buildTaskCompleteArgs(taskId) {
	return { args: [taskId] };
}
//#endregion
//#region src/jxa/scripts/task-search.ts
const SCRIPT$4 = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var keyword = argv[argv.length - 2];
    var opts = JSON.parse(argv[argv.length - 1]);
    var limit = opts.limit || 50;
    var searchLower = keyword.toLowerCase();
    var tasks = doc.flattenedTasks();
    var result = [];

    for (var i = 0; i < tasks.length && result.length < limit; i++) {
      var t = tasks[i];
      if (t.completed()) continue;
      if (opts.flagged !== undefined && t.flagged() !== opts.flagged) continue;
      if (opts.project) {
        var proj = t.containingProject();
        if (!proj || proj.name() !== opts.project) continue;
      }
      var name = t.name().toLowerCase();
      var note = (t.note() || "").toLowerCase();
      if (name.indexOf(searchLower) !== -1 || note.indexOf(searchLower) !== -1) {
        result.push(formatTaskBrief(t));
      }
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: result.length });`);
function buildTaskSearchArgs(keyword, options) {
	return { args: [keyword, JSON.stringify(options)] };
}
//#endregion
//#region src/cli/commands/task.ts
async function taskAdd(args) {
	let name = "";
	const options = {};
	const tags = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "--project":
				options.project = requireFlagValue("--project", args, ++i);
				break;
			case "--due":
				options.dueDate = requireFlagValue("--due", args, ++i);
				break;
			case "--defer":
				options.deferDate = requireFlagValue("--defer", args, ++i);
				break;
			case "--flagged":
				options.flagged = true;
				break;
			case "--note":
				options.note = requireFlagValue("--note", args, ++i);
				break;
			case "--estimate":
				options.estimatedMinutes = requireInteger("--estimate", requireFlagValue("--estimate", args, ++i));
				break;
			case "--tag":
				tags.push(requireFlagValue("--tag", args, ++i));
				break;
			case "--help":
			case "-h":
				printTaskAddHelp();
				return;
			default: name = requirePositionalArg(args, arg, name, "of task add --help");
		}
	}
	if (!name) throw new Error("Task name is required. Run 'of task add --help' for usage.");
	if (tags.length > 0) options.tags = tags;
	await runAndPrint(SCRIPT$6, buildTaskAddArgs(name, options));
}
async function taskComplete(args) {
	let taskId = "";
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--help" || arg === "-h") {
			printTaskCompleteHelp();
			return;
		}
		taskId = requirePositionalArg(args, arg, taskId, "of task complete --help");
	}
	if (!taskId) throw new Error("Task ID is required. Run 'of task complete --help' for usage.");
	await runAndPrint(SCRIPT$5, buildTaskCompleteArgs(taskId));
}
async function taskSearch(args) {
	let keyword = "";
	const options = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "--project":
				options.project = requireFlagValue("--project", args, ++i);
				break;
			case "--flagged":
				options.flagged = true;
				break;
			case "--limit":
				options.limit = requireInteger("--limit", requireFlagValue("--limit", args, ++i));
				break;
			case "--help":
			case "-h":
				printTaskSearchHelp();
				return;
			default: keyword = requirePositionalArg(args, arg, keyword, "of task search --help");
		}
	}
	if (!keyword) throw new Error("Search keyword is required. Run 'of task search --help' for usage.");
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
	return wrapJxaScript(`
    ${setup}
    var tasks = doc.flattenedTasks();
    var result = [];
    var total = 0;

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.completed()) continue;
      ${filterCondition}
    }

    return JSON.stringify({ success: true, tasks: result, totalCount: total });`);
}
function buildTasksFlaggedScript() {
	return buildFilterScript(`
      if (t.flagged()) {
        total++;
        if (result.length < 50) result.push(formatTaskBrief(t));
      }`);
}
function buildTasksOverdueScript() {
	return buildFilterScript(`
      var due = t.dueDate();
      if (!due) continue;
      if (due < startOfToday) {
        total++;
        if (result.length < 50) result.push(formatTaskBrief(t));
      }`, "var now = new Date();\n    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);");
}
function buildTasksTodayScript() {
	return buildFilterScript(`
      var due = t.dueDate();
      if (!due) continue;
      if (due <= endOfToday) {
        total++;
        if (result.length < 50) result.push(formatTaskBrief(t));
      }`, "var now = new Date();\n    var endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);");
}
//#endregion
//#region src/cli/commands/tasks.ts
async function runSimpleTasksCommand(args, commandName, buildScript) {
	for (const arg of args) {
		if (arg === "--help" || arg === "-h") {
			console.log(`Usage: of tasks ${commandName}\n\nList ${commandName} tasks.\n\nExamples:\n  of tasks ${commandName}`);
			return;
		}
		throw new Error(`Unknown argument '${arg}'. Run 'of tasks ${commandName} --help' for usage.`);
	}
	await runAndPrint(buildScript());
}
function runTasks(args) {
	const sub = args[0];
	switch (sub) {
		case "flagged": return runSimpleTasksCommand(args.slice(1), "flagged", buildTasksFlaggedScript);
		case "overdue": return runSimpleTasksCommand(args.slice(1), "overdue", buildTasksOverdueScript);
		case "today": return runSimpleTasksCommand(args.slice(1), "today", buildTasksTodayScript);
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
  today      List tasks due today

Run 'of tasks <subcommand> --help' for details.`);
}
//#endregion
//#region src/jxa/scripts/perspectives-list.ts
function buildPerspectivesListScript() {
	return wrapJxaScript(`
    var names = doc.perspectiveNames();
    var result = [];
    for (var i = 0; i < names.length; i++) {
      result.push(names[i]);
    }

    return JSON.stringify({ success: true, perspectiveNames: result, totalCount: result.length });`);
}
//#endregion
//#region src/cli/commands/perspectives.ts
async function perspectivesList(args) {
	for (const arg of args) {
		if (arg === "--help" || arg === "-h") {
			printPerspectivesListHelp();
			return;
		}
		throw new Error(`Unknown argument '${arg}'. Run 'of perspectives list --help' for usage.`);
	}
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
//#region src/types/index.ts
const PROJECT_STATUS_MAP = {
	active: "active status",
	"on-hold": "on hold status",
	done: "done status",
	dropped: "dropped status"
};
const VALID_PROJECT_STATUSES = Object.keys(PROJECT_STATUS_MAP);
function mapProjectStatus(status) {
	const mapped = PROJECT_STATUS_MAP[status];
	if (!mapped) throw new Error(`Invalid status '${status}'. Must be one of: ${VALID_PROJECT_STATUSES.join(", ")}`);
	return mapped;
}
//#endregion
//#region src/jxa/scripts/projects-list.ts
const SCRIPT$3 = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var opts = JSON.parse(argv[argv.length - 1]);
    var projects = doc.flattenedProjects();
    var result = [];
    var total = 0;

    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];

      if (opts.status) {
        var pStatus = String(p.status());
        if (pStatus !== opts.status) continue;
      }

      if (opts.folder) {
        var folder = p.parentFolder();
        var folderName = folder ? folder.name() : null;
        if (folderName !== opts.folder) continue;
      }

      total++;
      if (result.length < 50) {
        result.push(formatProjectBrief(p));
      }
    }

    return JSON.stringify({ success: true, projects: result, totalCount: total });`);
function buildProjectsListArgs(options) {
	const opts = {};
	if (options.status) opts.status = mapProjectStatus(options.status);
	if (options.folder) opts.folder = options.folder;
	return { args: [JSON.stringify(opts)] };
}
//#endregion
//#region src/jxa/scripts/projects-show.ts
const SCRIPT$2 = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var opts = JSON.parse(argv[argv.length - 1]);
    var projectName = opts.name;
    var project = findProject(doc, projectName);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + projectName });
    }

    var projectData = opts.detailed ? formatProjectDetail(project) : formatProjectBrief(project);
    var response = { success: true, project: projectData };

    if (opts.includeTasks) {
      var tasks = project.flattenedTasks();
      var taskList = [];
      for (var i = 0; i < tasks.length && taskList.length < 50; i++) {
        if (!tasks[i].completed()) {
          taskList.push(opts.detailed ? formatTaskDetail(tasks[i]) : formatTaskBrief(tasks[i]));
        }
      }
      response.tasks = taskList;
    }

    return JSON.stringify(response);`);
function buildProjectsShowArgs(options) {
	return { args: [JSON.stringify(options)] };
}
//#endregion
//#region src/jxa/scripts/projects-add.ts
const SCRIPT$1 = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var projectName = argv[argv.length - 2];
    var opts = JSON.parse(argv[argv.length - 1]);

    var project = app.Project({ name: projectName });

    if (opts.folder) {
      var folder = findFolder(doc, opts.folder);
      if (!folder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + opts.folder });
      }
      folder.projects.push(project);
    } else {
      doc.projects.push(project);
    }

    if (opts.dueDate) {
      var due = parseDate(opts.dueDate);
      if (due) project.dueDate = due;
    }
    if (opts.deferDate) {
      var defer = parseDate(opts.deferDate);
      if (defer) project.deferDate = defer;
    }
    if (opts.flagged !== undefined) {
      project.flagged = opts.flagged;
    }
    if (opts.note) {
      project.note = opts.note;
    }
    if (opts.sequential !== undefined) {
      project.sequential = opts.sequential;
    }
    if (opts.tags && opts.tags.length > 0) {
      for (var i = 0; i < opts.tags.length; i++) {
        var tag = findTag(doc, opts.tags[i]);
        if (tag) {
          app.add(tag, { to: project.tags });
        }
      }
    }

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);
function buildProjectsAddArgs(name, options) {
	return { args: [name, JSON.stringify(options)] };
}
//#endregion
//#region src/jxa/scripts/projects-status.ts
const SCRIPT = wrapJxaScript(`
    var argv = ObjC.unwrap($.NSProcessInfo.processInfo.arguments);
    var projectName = argv[argv.length - 2];
    var newStatus = argv[argv.length - 1];
    var project = findProject(doc, projectName);

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: " + projectName });
    }

    project.status = newStatus;

    return JSON.stringify({ success: true, project: formatProjectBrief(project) });`);
function buildProjectsStatusArgs(name, status) {
	return { args: [name, mapProjectStatus(status)] };
}
//#endregion
//#region src/cli/commands/projects.ts
async function projectsList(args) {
	let status;
	let folder;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "--status":
				status = requireFlagValue("--status", args, ++i);
				break;
			case "--folder":
				folder = requireFlagValue("--folder", args, ++i);
				break;
			case "--help":
			case "-h":
				printProjectsListHelp();
				return;
			default: throw new Error(`Unknown argument '${arg}'. Run 'of projects list --help' for usage.`);
		}
	}
	await runAndPrint(SCRIPT$3, buildProjectsListArgs({
		status,
		folder
	}));
}
async function projectsShow(args) {
	let name = "";
	let detailed = false;
	let includeTasks = false;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "--detailed":
				detailed = true;
				break;
			case "--tasks":
				includeTasks = true;
				break;
			case "--help":
			case "-h":
				printProjectsShowHelp();
				return;
			default: name = requirePositionalArg(args, arg, name, "of projects show --help");
		}
	}
	if (!name) throw new Error("Project name is required. Run 'of projects show --help' for usage.");
	await runAndPrint(SCRIPT$2, buildProjectsShowArgs({
		name,
		detailed,
		includeTasks
	}));
}
async function projectsAdd(args) {
	let name = "";
	const options = {};
	const tags = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "--due":
				options.dueDate = requireFlagValue("--due", args, ++i);
				break;
			case "--defer":
				options.deferDate = requireFlagValue("--defer", args, ++i);
				break;
			case "--flagged":
				options.flagged = true;
				break;
			case "--note":
				options.note = requireFlagValue("--note", args, ++i);
				break;
			case "--sequential":
				options.sequential = true;
				break;
			case "--tag":
				tags.push(requireFlagValue("--tag", args, ++i));
				break;
			case "--folder":
				options.folder = requireFlagValue("--folder", args, ++i);
				break;
			case "--help":
			case "-h":
				printProjectsAddHelp();
				return;
			default: name = requirePositionalArg(args, arg, name, "of projects add --help");
		}
	}
	if (!name) throw new Error("Project name is required. Run 'of projects add --help' for usage.");
	if (tags.length > 0) options.tags = tags;
	await runAndPrint(SCRIPT$1, buildProjectsAddArgs(name, options));
}
async function projectsStatus(args) {
	let name = "";
	let status = "";
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--help" || arg === "-h") {
			printProjectsStatusHelp();
			return;
		}
		if (arg.startsWith("-")) throw new Error(`Unknown flag '${arg}'. Run 'of projects status --help' for usage.`);
		if (!name) name = arg;
		else if (!status) status = arg;
		else throw new Error(`Unexpected argument '${arg}'. Run 'of projects status --help' for usage.`);
	}
	if (!name) throw new Error("Project name is required. Run 'of projects status --help' for usage.");
	if (!status) throw new Error("Status is required. Run 'of projects status --help' for usage.");
	if (!VALID_PROJECT_STATUSES.includes(status)) throw new Error(`Invalid status '${status}'. Must be one of: ${VALID_PROJECT_STATUSES.join(", ")}`);
	await runAndPrint(SCRIPT, buildProjectsStatusArgs(name, status));
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
  tasks today                          List tasks due today
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
		default:
			console.error(`Error: Unknown command '${cmd}'`);
			console.error(HELP_TEXT);
			process.exit(1);
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
