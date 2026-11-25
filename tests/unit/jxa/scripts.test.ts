import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { buildInboxListScript } from '../../../src/jxa/scripts/inbox-list.js';
import { TASK_ADD_SCRIPT, buildTaskAddArgs } from '../../../src/jxa/scripts/task-add.js';
import {
  TASK_COMPLETE_SCRIPT,
  buildTaskCompleteArgs,
} from '../../../src/jxa/scripts/task-complete.js';
import { TASK_SEARCH_SCRIPT, buildTaskSearchArgs } from '../../../src/jxa/scripts/task-search.js';
import {
  buildTasksFlaggedScript,
  buildTasksOverdueScript,
  buildTasksTodayScript,
} from '../../../src/jxa/scripts/tasks-filter.js';
import { buildPerspectivesListScript } from '../../../src/jxa/scripts/perspectives-list.js';
import {
  PROJECTS_LIST_SCRIPT,
  buildProjectsListArgs,
} from '../../../src/jxa/scripts/projects-list.js';
import {
  PROJECTS_SHOW_SCRIPT,
  buildProjectsShowArgs,
} from '../../../src/jxa/scripts/projects-show.js';
import {
  PROJECTS_ADD_SCRIPT,
  buildProjectsAddArgs,
} from '../../../src/jxa/scripts/projects-add.js';
import {
  PROJECTS_STATUS_SCRIPT,
  buildProjectsStatusArgs,
} from '../../../src/jxa/scripts/projects-status.js';

interface MockTag {
  name: string;
}

interface MockFolder {
  name: string;
  ending: { folder: MockFolder };
}

interface MockTask {
  id: { primaryKey: string };
  name: string;
  note: string;
  dueDate: Date | null;
  deferDate: Date | null;
  completionDate: Date | null;
  estimatedMinutes: number | null;
  flagged: boolean;
  completed: boolean;
  inInbox: boolean;
  taskStatus: string;
  project: MockProject | null;
  containingProject: MockProject | null;
  tags: MockTag[];
  addTags(tags: MockTag[]): void;
  markComplete(): MockTask;
}

interface MockProject {
  id: { primaryKey: string };
  name: string;
  note: string;
  status: string;
  dueDate: Date | null;
  deferDate: Date | null;
  completionDate: Date | null;
  estimatedMinutes: number | null;
  flagged: boolean;
  sequential: boolean;
  parentFolder: MockFolder | null;
  tags: MockTag[];
  flattenedTasks: MockTask[];
  addTags(tags: MockTag[]): void;
}

const TaskStatus = {
  Available: 'Task.Status.Available',
  Completed: 'Task.Status.Completed',
  Dropped: 'Task.Status.Dropped',
};

const ProjectStatusEnum = {
  Active: 'Project.Status.Active',
  OnHold: 'Project.Status.OnHold',
  Done: 'Project.Status.Done',
  Dropped: 'Project.Status.Dropped',
};

function withByName<T extends { name: string }>(
  items: T[],
): T[] & { byName(name: string): T | null } {
  const arr = items as T[] & { byName(name: string): T | null };
  arr.byName = (name: string) => items.find((item) => item.name === name) ?? null;
  return arr;
}

function makeTask(overrides: Partial<MockTask> & { idKey: string; name: string }): MockTask {
  const task: MockTask = {
    id: { primaryKey: overrides.idKey },
    name: overrides.name,
    note: overrides.note ?? '',
    dueDate: overrides.dueDate ?? null,
    deferDate: overrides.deferDate ?? null,
    completionDate: overrides.completionDate ?? null,
    estimatedMinutes: overrides.estimatedMinutes ?? null,
    flagged: overrides.flagged ?? false,
    completed: overrides.completed ?? false,
    inInbox: overrides.inInbox ?? false,
    taskStatus: overrides.taskStatus ?? TaskStatus.Available,
    project: overrides.project ?? null,
    containingProject: overrides.containingProject ?? null,
    tags: overrides.tags ?? [],
    addTags(newTags: MockTag[]) {
      task.tags.push(...newTags);
    },
    markComplete() {
      task.completed = true;
      task.taskStatus = TaskStatus.Completed;
      task.completionDate = new Date();
      return task;
    },
  };
  return task;
}

function makeProject(
  overrides: Partial<MockProject> & { idKey: string; name: string },
): MockProject {
  const project: MockProject = {
    id: { primaryKey: overrides.idKey },
    name: overrides.name,
    note: overrides.note ?? '',
    status: overrides.status ?? ProjectStatusEnum.Active,
    dueDate: overrides.dueDate ?? null,
    deferDate: overrides.deferDate ?? null,
    completionDate: overrides.completionDate ?? null,
    estimatedMinutes: overrides.estimatedMinutes ?? null,
    flagged: overrides.flagged ?? false,
    sequential: overrides.sequential ?? false,
    parentFolder: overrides.parentFolder ?? null,
    tags: overrides.tags ?? [],
    flattenedTasks: overrides.flattenedTasks ?? [],
    addTags(newTags: MockTag[]) {
      project.tags.push(...newTags);
    },
  };
  return project;
}

interface MockEnvOptions {
  running?: boolean;
  inbox?: MockTask[];
  flattenedTasks?: MockTask[];
  flattenedProjects?: MockProject[];
  flattenedFolders?: MockFolder[];
  flattenedTags?: MockTag[];
  perspectives?: { name: string }[];
}

function executeWrappedScript(script: string, args: string[] = [], env: MockEnvOptions = {}) {
  const inbox = env.inbox ?? [];
  const flattenedTasks = env.flattenedTasks ?? [];
  const flattenedProjects = withByName(env.flattenedProjects ?? []);
  const flattenedFolders = withByName(env.flattenedFolders ?? []);
  const flattenedTags = withByName(env.flattenedTags ?? []);
  const perspectives = env.perspectives ?? [];

  let nextId = 100;

  class FakeTask {
    id: { primaryKey: string };
    name: string;
    note = '';
    dueDate: Date | null = null;
    deferDate: Date | null = null;
    completionDate: Date | null = null;
    estimatedMinutes: number | null = null;
    flagged = false;
    completed = false;
    inInbox: boolean;
    taskStatus = TaskStatus.Available;
    project: MockProject | null = null;
    containingProject: MockProject | null;
    tags: MockTag[] = [];

    constructor(name: string, parentProject?: MockProject) {
      this.id = { primaryKey: `t-${++nextId}` };
      this.name = name;
      this.inInbox = !parentProject;
      this.containingProject = parentProject ?? null;
      if (parentProject) {
        parentProject.flattenedTasks.push(this);
      } else {
        inbox.push(this);
      }
      flattenedTasks.push(this);
    }

    addTags(newTags: MockTag[]) {
      this.tags.push(...newTags);
    }

    markComplete(): MockTask {
      this.completed = true;
      this.taskStatus = TaskStatus.Completed;
      this.completionDate = new Date();
      return this;
    }

    static Status = TaskStatus;

    static byIdentifier(id: string): MockTask | null {
      return flattenedTasks.find((t) => t.id.primaryKey === id) ?? null;
    }
  }

  class FakeProject {
    id: { primaryKey: string };
    name: string;
    note = '';
    status = ProjectStatusEnum.Active;
    dueDate: Date | null = null;
    deferDate: Date | null = null;
    completionDate: Date | null = null;
    estimatedMinutes: number | null = null;
    flagged = false;
    sequential = false;
    parentFolder: MockFolder | null;
    tags: MockTag[] = [];
    flattenedTasks: MockTask[] = [];

    constructor(name: string, position?: { folder: MockFolder }) {
      this.id = { primaryKey: `p-${++nextId}` };
      this.name = name;
      this.parentFolder = position?.folder ?? null;
      flattenedProjects.push(this);
    }

    addTags(newTags: MockTag[]) {
      this.tags.push(...newTags);
    }

    static Status = ProjectStatusEnum;
  }

  const Perspective = { all: perspectives };

  const Application = (name: string) => {
    expect(name).toBe('OmniFocus');
    return {
      running: () => env.running ?? true,
      evaluateJavascript: (omniSource: string) =>
        runInNewContext(omniSource, {
          inbox,
          flattenedTasks,
          flattenedProjects,
          flattenedFolders,
          flattenedTags,
          Task: FakeTask,
          Project: FakeProject,
          Perspective,
        }),
    };
  };

  const runFn = runInNewContext(`${script}\nrun;`, { Application }) as (argv: string[]) => string;

  const raw = runFn(args);
  return {
    parsed: JSON.parse(raw),
    state: { inbox, flattenedTasks, flattenedProjects },
  };
}

describe('Omni Automation bridge wrapper', () => {
  it('returns error when OmniFocus is not running', () => {
    const { parsed } = executeWrappedScript(buildInboxListScript('brief'), [], { running: false });
    expect(parsed).toEqual({ success: false, error: 'OmniFocus is not running' });
  });

  it('safely round-trips special characters, quotes, newlines, and unicode separators', () => {
    const specialName = 'タスク "引用" \\ \n line2 \u2028 sep';
    const opts = buildTaskAddArgs(specialName, { note: "note with 'quotes' & \u2029" });
    const { parsed } = executeWrappedScript(TASK_ADD_SCRIPT, opts.args);
    expect(parsed.success).toBe(true);
    expect(parsed.task.name).toBe(specialName);
  });
});

describe('inbox-list script', () => {
  it('lists active inbox tasks in brief and detailed modes, excluding completed and dropped', () => {
    const active = makeTask({
      idKey: 't1',
      name: 'Buy milk',
      inInbox: true,
      note: '2L',
      tags: [{ name: 'errands' }],
    });
    const completed = makeTask({ idKey: 't2', name: 'Done', inInbox: true, completed: true });
    const dropped = makeTask({
      idKey: 't3',
      name: 'Dropped',
      inInbox: true,
      taskStatus: TaskStatus.Dropped,
    });

    const brief = executeWrappedScript(buildInboxListScript('brief'), [], {
      inbox: [active, completed, dropped],
    });
    expect(brief.parsed).toEqual({
      success: true,
      tasks: [{ id: 't1', name: 'Buy milk', dueDate: null, flagged: false, completed: false }],
      totalCount: 1,
    });

    const detailed = executeWrappedScript(buildInboxListScript('detailed'), [], {
      inbox: [active, completed, dropped],
    });
    expect(detailed.parsed.tasks[0]).toMatchObject({
      id: 't1',
      note: '2L',
      inInbox: true,
      tags: ['errands'],
      projectName: null,
    });
  });
});

describe('task-add script', () => {
  it('creates task in project with properties and tags', () => {
    const work = makeProject({ idKey: 'p1', name: 'Work' });
    const opts = buildTaskAddArgs('Review PR', {
      project: 'Work',
      dueDate: '2026-03-15T08:00:00.000Z',
      deferDate: '2026-03-14T08:00:00.000Z',
      flagged: true,
      note: 'Check tests',
      estimatedMinutes: 30,
      tags: ['urgent'],
    });
    const { parsed, state } = executeWrappedScript(TASK_ADD_SCRIPT, opts.args, {
      flattenedProjects: [work],
      flattenedTags: [{ name: 'urgent' }],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.task.name).toBe('Review PR');
    expect(parsed.task.flagged).toBe(true);
    expect(parsed.task.dueDate).toBe('2026-03-15T08:00:00.000Z');
    expect(work.flattenedTasks).toHaveLength(1);
    expect(work.flattenedTasks[0].tags.map((t) => t.name)).toEqual(['urgent']);
    expect(state.inbox).toHaveLength(0);
  });

  it('fails fast without creating a task when tag does not exist', () => {
    const opts = buildTaskAddArgs('Bad Tag Task', { tags: ['nonexistent'] });
    const { parsed, state } = executeWrappedScript(TASK_ADD_SCRIPT, opts.args, {
      flattenedTags: [{ name: 'work' }],
    });

    expect(parsed).toEqual({ success: false, error: 'Tag not found: nonexistent' });
    expect(state.inbox).toHaveLength(0);
    expect(state.flattenedTasks).toHaveLength(0);
  });

  it('returns error when project does not exist', () => {
    const opts = buildTaskAddArgs('Task', { project: 'Missing' });
    const { parsed } = executeWrappedScript(TASK_ADD_SCRIPT, opts.args);
    expect(parsed).toEqual({ success: false, error: 'Project not found: Missing' });
  });
});

describe('task-complete script', () => {
  it('marks existing task complete via Task.byIdentifier', () => {
    const task = makeTask({ idKey: 'abc123', name: 'Ship it' });
    const opts = buildTaskCompleteArgs('abc123');
    const { parsed } = executeWrappedScript(TASK_COMPLETE_SCRIPT, opts.args, {
      flattenedTasks: [task],
    });
    expect(parsed).toEqual({
      success: true,
      task: { id: 'abc123', name: 'Ship it', completed: true },
    });
  });

  it('returns error when task is not found', () => {
    const opts = buildTaskCompleteArgs('missing');
    const { parsed } = executeWrappedScript(TASK_COMPLETE_SCRIPT, opts.args);
    expect(parsed).toEqual({ success: false, error: 'Task not found: missing' });
  });
});

describe('task-search script', () => {
  it('excludes project root tasks and counts all matches while honoring limit', () => {
    const work = makeProject({ idKey: 'p1', name: 'Work' });
    const rootTask = makeTask({ idKey: 'root', name: 'Report Project', project: work });
    const t1 = makeTask({ idKey: 't1', name: 'Q1 Report', containingProject: work, flagged: true });
    const t2 = makeTask({
      idKey: 't2',
      name: 'Draft',
      note: 'report notes',
      containingProject: work,
      flagged: true,
    });
    const t3 = makeTask({
      idKey: 't3',
      name: 'Unflagged report',
      containingProject: work,
      flagged: false,
    });

    const opts = buildTaskSearchArgs('report', { project: 'Work', flagged: true, limit: 1 });
    const { parsed } = executeWrappedScript(TASK_SEARCH_SCRIPT, opts.args, {
      flattenedTasks: [rootTask, t1, t2, t3],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0].id).toBe('t1');
    expect(parsed.totalCount).toBe(2);
  });
});

describe('tasks-filter scripts', () => {
  it('filters flagged, overdue, and today tasks excluding project roots and dropped items', () => {
    const proj = makeProject({ idKey: 'p1', name: 'Proj' });
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 17, 0, 0);
    const todayEvening = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 17, 0, 0);

    const tasks = [
      makeTask({
        idKey: 'root',
        name: 'Proj Root',
        project: proj,
        flagged: true,
        dueDate: yesterday,
      }),
      makeTask({ idKey: 't-over', name: 'Overdue', flagged: true, dueDate: yesterday }),
      makeTask({ idKey: 't-today', name: 'Today', flagged: false, dueDate: todayEvening }),
      makeTask({ idKey: 't-future', name: 'Tomorrow', flagged: true, dueDate: tomorrow }),
      makeTask({
        idKey: 't-drop',
        name: 'Dropped',
        flagged: true,
        dueDate: yesterday,
        taskStatus: TaskStatus.Dropped,
      }),
    ];

    const flagged = executeWrappedScript(buildTasksFlaggedScript(), [], { flattenedTasks: tasks });
    expect(flagged.parsed.tasks.map((t: { id: string }) => t.id)).toEqual(['t-over', 't-future']);

    const overdue = executeWrappedScript(buildTasksOverdueScript(), [], { flattenedTasks: tasks });
    expect(overdue.parsed.tasks.map((t: { id: string }) => t.id)).toEqual(['t-over']);

    const today = executeWrappedScript(buildTasksTodayScript(), [], { flattenedTasks: tasks });
    expect(today.parsed.tasks.map((t: { id: string }) => t.id)).toEqual(['t-over', 't-today']);
  });
});

describe('perspectives-list script', () => {
  it('returns all perspective names from Perspective.all', () => {
    const { parsed } = executeWrappedScript(buildPerspectivesListScript(), [], {
      perspectives: [{ name: 'Inbox' }, { name: 'Projects' }, { name: 'Focus' }],
    });
    expect(parsed).toEqual({
      success: true,
      perspectiveNames: ['Inbox', 'Projects', 'Focus'],
      totalCount: 3,
    });
  });
});

describe('projects scripts', () => {
  it('lists projects with status and folder filters', () => {
    const workFolder: MockFolder = {
      name: 'Work',
      ending: null as unknown as { folder: MockFolder },
    };
    workFolder.ending = { folder: workFolder };

    const p1 = makeProject({
      idKey: 'p1',
      name: 'API',
      status: ProjectStatusEnum.Active,
      parentFolder: workFolder,
      flattenedTasks: [
        makeTask({ idKey: 't1', name: 'A' }),
        makeTask({ idKey: 't2', name: 'B', completed: true }),
      ],
    });
    const p2 = makeProject({
      idKey: 'p2',
      name: 'Old',
      status: ProjectStatusEnum.OnHold,
      parentFolder: workFolder,
    });

    const opts = buildProjectsListArgs({ status: 'active', folder: 'Work' });
    const { parsed } = executeWrappedScript(PROJECTS_LIST_SCRIPT, opts.args, {
      flattenedProjects: [p1, p2],
    });

    expect(parsed).toEqual({
      success: true,
      projects: [
        {
          id: 'p1',
          name: 'API',
          status: 'active',
          dueDate: null,
          deferDate: null,
          flagged: false,
          taskCount: 1,
          folderName: 'Work',
        },
      ],
      totalCount: 1,
    });
  });

  it('shows project details and remaining tasks', () => {
    const p1 = makeProject({
      idKey: 'p1',
      name: 'API',
      note: 'Backend work',
      sequential: true,
      tags: [{ name: 'dev' }],
      flattenedTasks: [
        makeTask({ idKey: 't1', name: 'Build', note: 'step 1' }),
        makeTask({ idKey: 't2', name: 'Done', completed: true }),
      ],
    });

    const opts = buildProjectsShowArgs({ name: 'API', detailed: true, includeTasks: true });
    const { parsed } = executeWrappedScript(PROJECTS_SHOW_SCRIPT, opts.args, {
      flattenedProjects: [p1],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.project).toMatchObject({
      id: 'p1',
      note: 'Backend work',
      sequential: true,
      tags: ['dev'],
    });
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0]).toMatchObject({ id: 't1', note: 'step 1' });
  });

  it('adds project in folder and fails fast on missing tag', () => {
    const workFolder: MockFolder = {
      name: 'Work',
      ending: null as unknown as { folder: MockFolder },
    };
    workFolder.ending = { folder: workFolder };

    const okOpts = buildProjectsAddArgs('New Proj', {
      folder: 'Work',
      sequential: true,
      tags: ['dev'],
    });
    const ok = executeWrappedScript(PROJECTS_ADD_SCRIPT, okOpts.args, {
      flattenedFolders: [workFolder],
      flattenedTags: [{ name: 'dev' }],
    });
    expect(ok.parsed.success).toBe(true);
    expect(ok.parsed.project.folderName).toBe('Work');

    const badOpts = buildProjectsAddArgs('Bad Proj', { folder: 'Work', tags: ['missing'] });
    const bad = executeWrappedScript(PROJECTS_ADD_SCRIPT, badOpts.args, {
      flattenedFolders: [workFolder],
    });
    expect(bad.parsed).toEqual({ success: false, error: 'Tag not found: missing' });
    expect(bad.state.flattenedProjects).toHaveLength(0);
  });

  it('updates project status', () => {
    const p1 = makeProject({ idKey: 'p1', name: 'API', status: ProjectStatusEnum.Active });
    const opts = buildProjectsStatusArgs('API', 'on-hold');
    const { parsed } = executeWrappedScript(PROJECTS_STATUS_SCRIPT, opts.args, {
      flattenedProjects: [p1],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.project.status).toBe('on-hold');
  });
});
