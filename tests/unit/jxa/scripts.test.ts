import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { buildInboxListScript } from '../../../src/jxa/scripts/inbox-list.js';
import { TASK_ADD_SCRIPT, buildTaskAddArgs } from '../../../src/jxa/scripts/task-add.js';
import { TASK_SHOW_SCRIPT, buildTaskShowArgs } from '../../../src/jxa/scripts/task-show.js';
import { TASK_UPDATE_SCRIPT, buildTaskUpdateArgs } from '../../../src/jxa/scripts/task-update.js';
import {
  TASK_COMPLETE_SCRIPT,
  buildTaskCompleteArgs,
} from '../../../src/jxa/scripts/task-complete.js';
import {
  TASK_UNCOMPLETE_SCRIPT,
  buildTaskUncompleteArgs,
} from '../../../src/jxa/scripts/task-uncomplete.js';
import { TASK_DROP_SCRIPT, buildTaskDropArgs } from '../../../src/jxa/scripts/task-drop.js';
import { TASK_DELETE_SCRIPT, buildTaskDeleteArgs } from '../../../src/jxa/scripts/task-delete.js';
import {
  TASK_TO_PROJECT_SCRIPT,
  buildTaskToProjectArgs,
} from '../../../src/jxa/scripts/task-to-project.js';
import { TASK_SEARCH_SCRIPT, buildTaskSearchArgs } from '../../../src/jxa/scripts/task-search.js';
import {
  buildTasksFlaggedScript,
  buildTasksOverdueScript,
  buildTasksTodayScript,
} from '../../../src/jxa/scripts/tasks-filter.js';
import { TASKS_LIST_SCRIPT, buildTasksListArgs } from '../../../src/jxa/scripts/tasks-list.js';
import {
  TASKS_FORECAST_SCRIPT,
  buildTasksForecastArgs,
} from '../../../src/jxa/scripts/tasks-forecast.js';
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
  PROJECTS_UPDATE_SCRIPT,
  buildProjectsUpdateArgs,
} from '../../../src/jxa/scripts/projects-update.js';
import {
  PROJECTS_STATUS_SCRIPT,
  buildProjectsStatusArgs,
} from '../../../src/jxa/scripts/projects-status.js';
import { REVIEW_LIST_SCRIPT, buildReviewListArgs } from '../../../src/jxa/scripts/review-list.js';
import { REVIEW_MARK_SCRIPT, buildReviewMarkArgs } from '../../../src/jxa/scripts/review-mark.js';
import { TAGS_LIST_SCRIPT, buildTagsListArgs } from '../../../src/jxa/scripts/tags-list.js';
import { TAGS_ADD_SCRIPT, buildTagsAddArgs } from '../../../src/jxa/scripts/tags-add.js';
import { TAGS_STATUS_SCRIPT, buildTagsStatusArgs } from '../../../src/jxa/scripts/tags-status.js';
import {
  FOLDERS_LIST_SCRIPT,
  buildFoldersListArgs,
} from '../../../src/jxa/scripts/folders-list.js';
import { FOLDERS_ADD_SCRIPT, buildFoldersAddArgs } from '../../../src/jxa/scripts/folders-add.js';

interface MockTag {
  id: { primaryKey: string };
  name: string;
  status: string;
  parent: MockTag | null;
  allowsNextAction: boolean;
  availableTasks: MockTask[];
  remainingTasks: MockTask[];
  ending: { tag: MockTag };
}

interface MockFolder {
  id: { primaryKey: string };
  name: string;
  status: string;
  parent: MockFolder | null;
  projects: MockProject[];
  ending: { folder: MockFolder };
}

interface MockRepetitionRule {
  ruleString: string;
  method: string;
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
  parent: MockTask | null;
  tasks: MockTask[];
  hasChildren: boolean;
  sequential: boolean;
  repetitionRule: MockRepetitionRule | null;
  tags: MockTag[];
  appendStringToNote(text: string): void;
  addTags(tags: MockTag[]): void;
  removeTags(tags: MockTag[]): void;
  clearTags(): void;
  markComplete(): MockTask;
  markIncomplete(): void;
  drop(allOccurrences: boolean): void;
  droppedAllOccurrences?: boolean;
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
  containsSingletonActions: boolean;
  parentFolder: MockFolder | null;
  tags: MockTag[];
  flattenedTasks: MockTask[];
  nextTask: MockTask | null;
  lastReviewDate: Date | null;
  nextReviewDate: Date | null;
  reviewInterval: { steps: number; unit: string };
  appendStringToNote(text: string): void;
  addTags(tags: MockTag[]): void;
  removeTags(tags: MockTag[]): void;
  clearTags(): void;
}

const TaskStatus = {
  Available: 'Task.Status.Available',
  Next: 'Task.Status.Next',
  Blocked: 'Task.Status.Blocked',
  DueSoon: 'Task.Status.DueSoon',
  Overdue: 'Task.Status.Overdue',
  Completed: 'Task.Status.Completed',
  Dropped: 'Task.Status.Dropped',
};

const RepetitionMethodEnum = {
  Fixed: 'Task.RepetitionMethod.Fixed',
  DueDate: 'Task.RepetitionMethod.DueDate',
  DeferUntilDate: 'Task.RepetitionMethod.DeferUntilDate',
  None: 'Task.RepetitionMethod.None',
};

const ProjectStatusEnum = {
  Active: 'Project.Status.Active',
  OnHold: 'Project.Status.OnHold',
  Done: 'Project.Status.Done',
  Dropped: 'Project.Status.Dropped',
};

const TagStatusEnum = {
  Active: 'Tag.Status.Active',
  OnHold: 'Tag.Status.OnHold',
  Dropped: 'Tag.Status.Dropped',
};

const FolderStatusEnum = {
  Active: 'Folder.Status.Active',
  Dropped: 'Folder.Status.Dropped',
};

function withByName<T extends { name: string }>(
  items: T[],
): T[] & { byName(name: string): T | null } {
  const arr = items as T[] & { byName(name: string): T | null };
  arr.byName = (name: string) => items.find((item) => item.name === name) ?? null;
  return arr;
}

function makeTag(overrides: Partial<MockTag> & { name: string; idKey?: string }): MockTag {
  const tag: MockTag = {
    id: { primaryKey: overrides.idKey ?? `tag-${overrides.name}` },
    name: overrides.name,
    status: overrides.status ?? TagStatusEnum.Active,
    parent: overrides.parent ?? null,
    allowsNextAction: overrides.allowsNextAction ?? true,
    availableTasks: overrides.availableTasks ?? [],
    remainingTasks: overrides.remainingTasks ?? [],
    ending: null as unknown as { tag: MockTag },
  };
  tag.ending = { tag };
  return tag;
}

function makeFolder(overrides: Partial<MockFolder> & { name: string; idKey?: string }): MockFolder {
  const folder: MockFolder = {
    id: { primaryKey: overrides.idKey ?? `folder-${overrides.name}` },
    name: overrides.name,
    status: overrides.status ?? FolderStatusEnum.Active,
    parent: overrides.parent ?? null,
    projects: overrides.projects ?? [],
    ending: null as unknown as { folder: MockFolder },
  };
  folder.ending = { folder };
  return folder;
}

function makeTask(overrides: Partial<MockTask> & { idKey: string; name: string }): MockTask {
  const children = overrides.tasks ?? [];
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
    parent: overrides.parent ?? null,
    tasks: children,
    hasChildren: overrides.hasChildren ?? children.length > 0,
    sequential: overrides.sequential ?? false,
    repetitionRule: overrides.repetitionRule ?? null,
    tags: overrides.tags ?? [],
    appendStringToNote(text: string) {
      task.note += text;
    },
    addTags(newTags: MockTag[]) {
      for (const t of newTags) {
        if (!task.tags.some((existing) => existing.id.primaryKey === t.id.primaryKey)) {
          task.tags.push(t);
        }
      }
    },
    removeTags(remTags: MockTag[]) {
      const ids = new Set(remTags.map((t) => t.id.primaryKey));
      task.tags = task.tags.filter((t) => !ids.has(t.id.primaryKey));
    },
    clearTags() {
      task.tags = [];
    },
    markComplete() {
      task.completed = true;
      task.taskStatus = TaskStatus.Completed;
      task.completionDate = new Date();
      return task;
    },
    markIncomplete() {
      task.completed = false;
      task.taskStatus = TaskStatus.Available;
      task.completionDate = null;
    },
    drop(allOccurrences: boolean) {
      task.taskStatus = TaskStatus.Dropped;
      task.droppedAllOccurrences = allOccurrences;
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
    containsSingletonActions: overrides.containsSingletonActions ?? false,
    parentFolder: overrides.parentFolder ?? null,
    tags: overrides.tags ?? [],
    flattenedTasks: overrides.flattenedTasks ?? [],
    nextTask: overrides.nextTask ?? null,
    lastReviewDate: overrides.lastReviewDate ?? null,
    nextReviewDate: overrides.nextReviewDate ?? null,
    reviewInterval: overrides.reviewInterval ?? { steps: 1, unit: 'weeks' },
    appendStringToNote(text: string) {
      project.note += text;
    },
    addTags(newTags: MockTag[]) {
      for (const t of newTags) {
        if (!project.tags.some((existing) => existing.id.primaryKey === t.id.primaryKey)) {
          project.tags.push(t);
        }
      }
    },
    removeTags(remTags: MockTag[]) {
      const ids = new Set(remTags.map((t) => t.id.primaryKey));
      project.tags = project.tags.filter((t) => !ids.has(t.id.primaryKey));
    },
    clearTags() {
      project.tags = [];
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
  const inboxArr = env.inbox ?? [];
  const inbox = Object.assign(inboxArr, { ending: { inbox: true } });
  const flattenedTasks = env.flattenedTasks ?? [];
  const flattenedProjects = withByName(env.flattenedProjects ?? []);
  const flattenedFolders = withByName(env.flattenedFolders ?? []);
  const flattenedTags = withByName(env.flattenedTags ?? []);
  const perspectives = env.perspectives ?? [];
  const deletedObjects: unknown[] = [];
  const library = { ending: { library: true } };
  const tagsGlobal = { ending: { tagsRoot: true } };

  let nextId = 100;

  class FakeRepetitionRule implements MockRepetitionRule {
    ruleString: string;
    method: string;

    constructor(ruleString: string, method: string) {
      if (!ruleString.startsWith('FREQ=')) {
        throw new Error(`Invalid ICS rule: ${ruleString}`);
      }
      this.ruleString = ruleString;
      this.method = method;
    }
  }

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
    parent: MockTask | null;
    tasks: MockTask[] = [];
    hasChildren = false;
    sequential = false;
    repetitionRule: MockRepetitionRule | null = null;
    tags: MockTag[] = [];

    constructor(name: string, parent?: MockProject | MockTask) {
      this.id = { primaryKey: `t-${++nextId}` };
      this.name = name;
      if (parent && 'flattenedTasks' in parent && 'status' in parent) {
        this.inInbox = false;
        this.containingProject = parent;
        this.parent = null;
        parent.flattenedTasks.push(this);
      } else if (parent && 'inInbox' in parent) {
        this.inInbox = false;
        this.parent = parent;
        this.containingProject = parent.containingProject;
        parent.tasks.push(this);
        parent.hasChildren = true;
      } else {
        this.inInbox = true;
        this.containingProject = null;
        this.parent = null;
        inbox.push(this);
      }
      flattenedTasks.push(this);
    }

    appendStringToNote(text: string) {
      this.note += text;
    }

    addTags(newTags: MockTag[]) {
      this.tags.push(...newTags);
    }

    removeTags(remTags: MockTag[]) {
      const ids = new Set(remTags.map((t) => t.id.primaryKey));
      this.tags = this.tags.filter((t) => !ids.has(t.id.primaryKey));
    }

    clearTags() {
      this.tags = [];
    }

    markComplete(): MockTask {
      this.completed = true;
      this.taskStatus = TaskStatus.Completed;
      this.completionDate = new Date();
      return this;
    }

    markIncomplete() {
      this.completed = false;
      this.taskStatus = TaskStatus.Available;
      this.completionDate = null;
    }

    drop() {
      this.taskStatus = TaskStatus.Dropped;
    }

    static Status = TaskStatus;
    static RepetitionMethod = RepetitionMethodEnum;
    static RepetitionRule = FakeRepetitionRule;

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
    containsSingletonActions = false;
    parentFolder: MockFolder | null;
    tags: MockTag[] = [];
    flattenedTasks: MockTask[] = [];
    nextTask: MockTask | null = null;
    lastReviewDate: Date | null = null;
    nextReviewDate: Date | null = null;
    reviewInterval = { steps: 1, unit: 'weeks' };

    constructor(name: string, position?: { folder?: MockFolder }) {
      this.id = { primaryKey: `p-${++nextId}` };
      this.name = name;
      this.parentFolder = position?.folder ?? null;
      flattenedProjects.push(this);
    }

    appendStringToNote(text: string) {
      this.note += text;
    }

    addTags(newTags: MockTag[]) {
      this.tags.push(...newTags);
    }

    removeTags(remTags: MockTag[]) {
      const ids = new Set(remTags.map((t) => t.id.primaryKey));
      this.tags = this.tags.filter((t) => !ids.has(t.id.primaryKey));
    }

    clearTags() {
      this.tags = [];
    }

    static Status = ProjectStatusEnum;
  }

  class FakeTag {
    id: { primaryKey: string };
    name: string;
    status = TagStatusEnum.Active;
    parent: MockTag | null;
    allowsNextAction = true;
    availableTasks: MockTask[] = [];
    remainingTasks: MockTask[] = [];
    ending: { tag: MockTag };

    constructor(name: string, position?: { tag?: MockTag }) {
      this.id = { primaryKey: `tag-${++nextId}` };
      this.name = name;
      this.parent = position?.tag ?? null;
      this.ending = { tag: this };
      flattenedTags.push(this);
    }

    static Status = TagStatusEnum;
  }

  class FakeFolder {
    id: { primaryKey: string };
    name: string;
    status = FolderStatusEnum.Active;
    parent: MockFolder | null;
    projects: MockProject[] = [];
    ending: { folder: MockFolder };

    constructor(name: string, position?: { folder?: MockFolder }) {
      this.id = { primaryKey: `folder-${++nextId}` };
      this.name = name;
      this.parent = position?.folder ?? null;
      this.ending = { folder: this };
      flattenedFolders.push(this);
    }

    static Status = FolderStatusEnum;
  }

  function moveTasks(
    tasksToMove: MockTask[],
    target: MockProject | MockTask | { inbox?: boolean },
  ) {
    for (const t of tasksToMove) {
      if ('inbox' in target && target.inbox) {
        t.inInbox = true;
        t.containingProject = null;
        t.parent = null;
        if (!inbox.includes(t)) inbox.push(t);
      } else if ('flattenedTasks' in target && 'status' in target) {
        t.inInbox = false;
        t.containingProject = target;
        t.parent = null;
        if (!target.flattenedTasks.includes(t)) target.flattenedTasks.push(t);
      } else if ('inInbox' in target) {
        t.inInbox = false;
        t.parent = target;
        t.containingProject = target.containingProject;
        if (!target.tasks.includes(t)) target.tasks.push(t);
        target.hasChildren = true;
      }
    }
  }

  function moveSections(
    sections: MockProject[],
    target: { folder?: MockFolder; library?: boolean },
  ) {
    for (const s of sections) {
      s.parentFolder = target.folder ?? null;
    }
  }

  function convertTasksToProjects(
    tasksToConvert: MockTask[],
    position: { folder?: MockFolder; library?: boolean },
  ): MockProject[] {
    return tasksToConvert.map((t) => {
      const p = new FakeProject(t.name, position);
      p.note = t.note;
      return p;
    });
  }

  function deleteObject(obj: unknown) {
    deletedObjects.push(obj);
  }

  const Perspective = { all: perspectives };

  const Application = (name: string) => {
    expect(name).toBe('OmniFocus');
    return {
      running: () => env.running ?? true,
      evaluateJavascript: (omniSource: string) =>
        runInNewContext(omniSource, {
          inbox,
          library,
          tags: tagsGlobal,
          flattenedTasks,
          flattenedProjects,
          flattenedFolders,
          flattenedTags,
          Task: FakeTask,
          Project: FakeProject,
          Tag: FakeTag,
          Folder: FakeFolder,
          Perspective,
          moveTasks,
          moveSections,
          convertTasksToProjects,
          deleteObject,
        }),
    };
  };

  const runFn = runInNewContext(`${script}\nrun;`, { Application }) as (argv: string[]) => string;

  const raw = runFn(args);
  return {
    parsed: JSON.parse(raw),
    state: {
      inbox,
      flattenedTasks,
      flattenedProjects,
      flattenedFolders,
      flattenedTags,
      deletedObjects,
    },
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
      tags: [makeTag({ name: 'errands' })],
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
      taskStatus: 'available',
      parentId: null,
      hasChildren: false,
      sequential: false,
      repetitionRule: null,
    });
  });
});

describe('task CRUD and Clarify scripts', () => {
  it('creates task in project or under parent with repetition rule and fails fast on missing tag', () => {
    const work = makeProject({ idKey: 'p1', name: 'Work' });
    const parent = makeTask({ idKey: 'parent-1', name: 'Epic', containingProject: work });

    const opts = buildTaskAddArgs('Subtask', {
      parentId: 'parent-1',
      sequential: true,
      repetitionRule: { ruleString: 'FREQ=WEEKLY;INTERVAL=1', method: 'fixed' },
      tags: ['urgent'],
    });
    const { parsed } = executeWrappedScript(TASK_ADD_SCRIPT, opts.args, {
      flattenedProjects: [work],
      flattenedTasks: [parent],
      flattenedTags: [makeTag({ name: 'urgent' })],
    });
    expect(parsed.success).toBe(true);
    expect(parent.tasks).toHaveLength(1);
    expect(parent.tasks[0].repetitionRule).toEqual({
      ruleString: 'FREQ=WEEKLY;INTERVAL=1',
      method: RepetitionMethodEnum.Fixed,
    });

    const badOpts = buildTaskAddArgs('Bad Tag Task', { tags: ['nonexistent'] });
    const bad = executeWrappedScript(TASK_ADD_SCRIPT, badOpts.args, {
      flattenedTags: [makeTag({ name: 'work' })],
    });
    expect(bad.parsed).toEqual({ success: false, error: 'Tag not found: nonexistent' });
    expect(bad.state.inbox).toHaveLength(0);
  });

  it('shows task detail and active children', () => {
    const child1 = makeTask({ idKey: 'c1', name: 'Step 1' });
    const childDone = makeTask({ idKey: 'c2', name: 'Step 2', completed: true });
    const parent = makeTask({
      idKey: 't1',
      name: 'Parent',
      tasks: [child1, childDone],
      sequential: true,
    });
    child1.parent = parent;

    const opts = buildTaskShowArgs({ taskId: 't1', includeChildren: true });
    const { parsed } = executeWrappedScript(TASK_SHOW_SCRIPT, opts.args, {
      flattenedTasks: [parent, child1, childDone],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.task.hasChildren).toBe(true);
    expect(parsed.task.sequential).toBe(true);
    expect(parsed.children).toHaveLength(1);
    expect(parsed.children[0].id).toBe('c1');
  });

  it('updates task properties, tags, and moves container atomically', () => {
    const work = makeProject({ idKey: 'p1', name: 'Work' });
    const oldTag = makeTag({ name: 'old' });
    const pcTag = makeTag({ name: '@PC' });
    const task = makeTask({
      idKey: 't1',
      name: 'Inbox item',
      inInbox: true,
      note: 'Line 1',
      tags: [oldTag],
    });

    const opts = buildTaskUpdateArgs({
      taskId: 't1',
      name: 'Clarified task',
      appendNote: '\nLine 2',
      estimatedMinutes: 25,
      flagged: true,
      addTags: ['@PC'],
      removeTags: ['old'],
      moveToProject: 'Work',
    });
    const { parsed } = executeWrappedScript(TASK_UPDATE_SCRIPT, opts.args, {
      flattenedProjects: [work],
      flattenedTags: [oldTag, pcTag],
      flattenedTasks: [task],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.task).toMatchObject({
      id: 't1',
      name: 'Clarified task',
      note: 'Line 1\nLine 2',
      estimatedMinutes: 25,
      flagged: true,
      tags: ['@PC'],
      projectName: 'Work',
      inInbox: false,
    });

    // Rejects cycle when moving under itself
    const cycleOpts = buildTaskUpdateArgs({ taskId: 't1', moveToParentId: 't1' });
    const cycle = executeWrappedScript(TASK_UPDATE_SCRIPT, cycleOpts.args, {
      flattenedTasks: [task],
    });
    expect(cycle.parsed.success).toBe(false);
    expect(cycle.parsed.error).toContain('Cannot move a task under itself');
  });

  it('completes, uncompletes, drops, deletes, and converts task to project', () => {
    const folder = makeFolder({ name: 'Work' });
    const task = makeTask({ idKey: 'abc123', name: 'Ship it', inInbox: true });

    const comp = executeWrappedScript(TASK_COMPLETE_SCRIPT, buildTaskCompleteArgs('abc123').args, {
      flattenedTasks: [task],
    });
    expect(comp.parsed).toEqual({
      success: true,
      task: { id: 'abc123', name: 'Ship it', completed: true },
    });

    const uncomp = executeWrappedScript(
      TASK_UNCOMPLETE_SCRIPT,
      buildTaskUncompleteArgs('abc123').args,
      { flattenedTasks: [task] },
    );
    expect(uncomp.parsed).toEqual({
      success: true,
      task: { id: 'abc123', name: 'Ship it', completed: false },
    });

    const dropped = executeWrappedScript(
      TASK_DROP_SCRIPT,
      buildTaskDropArgs({ taskId: 'abc123', allOccurrences: true }).args,
      { flattenedTasks: [task] },
    );
    expect(dropped.parsed).toEqual({
      success: true,
      task: { id: 'abc123', name: 'Ship it', dropped: true },
    });
    expect(task.droppedAllOccurrences).toBe(true);

    const converted = executeWrappedScript(
      TASK_TO_PROJECT_SCRIPT,
      buildTaskToProjectArgs({ taskId: 'abc123', folder: 'Work' }).args,
      { flattenedTasks: [task], flattenedFolders: [folder] },
    );
    expect(converted.parsed.success).toBe(true);
    expect(converted.parsed.project.name).toBe('Ship it');
    expect(converted.parsed.project.folderName).toBe('Work');

    const del = executeWrappedScript(TASK_DELETE_SCRIPT, buildTaskDeleteArgs('abc123').args, {
      flattenedTasks: [task],
    });
    expect(del.parsed).toEqual({ success: true, deleted: { id: 'abc123', name: 'Ship it' } });
    expect(del.state.deletedObjects).toEqual([task]);
  });
});

describe('tasks query and forecast scripts', () => {
  it('filters tasks by availability status, tags, estimate, and completion date', () => {
    const work = makeProject({ idKey: 'p1', name: 'Work' });
    const pcTag = makeTag({ name: '@PC' });
    const waitTag = makeTag({ name: 'Waiting For', status: TagStatusEnum.OnHold });
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400_000);

    const tAvail = makeTask({
      idKey: 't1',
      name: 'Quick email',
      containingProject: work,
      tags: [pcTag],
      estimatedMinutes: 15,
      taskStatus: TaskStatus.Next,
    });
    const tBlocked = makeTask({
      idKey: 't2',
      name: 'Wait for reply',
      containingProject: work,
      tags: [waitTag],
      taskStatus: TaskStatus.Blocked,
    });
    const tDone = makeTask({
      idKey: 't3',
      name: 'Finished',
      containingProject: work,
      completed: true,
      taskStatus: TaskStatus.Completed,
      completionDate: twoDaysAgo,
    });

    const avail = executeWrappedScript(
      TASKS_LIST_SCRIPT,
      buildTasksListArgs({ status: 'available', tags: ['@PC'], maxEstimate: 30 }).args,
      {
        flattenedProjects: [work],
        flattenedTags: [pcTag, waitTag],
        flattenedTasks: [tAvail, tBlocked, tDone],
      },
    );
    expect(avail.parsed.tasks.map((t: { id: string }) => t.id)).toEqual(['t1']);

    const blocked = executeWrappedScript(
      TASKS_LIST_SCRIPT,
      buildTasksListArgs({ status: 'blocked', tags: ['Waiting For'] }).args,
      {
        flattenedProjects: [work],
        flattenedTags: [pcTag, waitTag],
        flattenedTasks: [tAvail, tBlocked, tDone],
      },
    );
    expect(blocked.parsed.tasks.map((t: { id: string }) => t.id)).toEqual(['t2']);

    const completed = executeWrappedScript(
      TASKS_LIST_SCRIPT,
      buildTasksListArgs({
        status: 'completed',
        completedSince: new Date(now.getTime() - 7 * 86400_000).toISOString(),
      }).args,
      { flattenedTasks: [tAvail, tBlocked, tDone] },
    );
    expect(completed.parsed.tasks.map((t: { id: string }) => t.id)).toEqual(['t3']);
  });

  it('forecasts overdue, due, and deferred tasks within N days', () => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 17, 0, 0);
    const inTwoDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 17, 0, 0);
    const inTenDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 17, 0, 0);

    const tasks = [
      makeTask({ idKey: 'over', name: 'Overdue', dueDate: yesterday }),
      makeTask({ idKey: 'soon', name: 'Due Soon', dueDate: inTwoDays }),
      makeTask({ idKey: 'def', name: 'Deferred', deferDate: inTwoDays }),
      makeTask({ idKey: 'far', name: 'Far', dueDate: inTenDays }),
    ];

    const { parsed } = executeWrappedScript(
      TASKS_FORECAST_SCRIPT,
      buildTasksForecastArgs({ days: 5 }).args,
      { flattenedTasks: tasks },
    );
    expect(parsed.days).toBe(5);
    expect(parsed.overdue.map((t: { id: string }) => t.id)).toEqual(['over']);
    expect(parsed.due.map((t: { id: string }) => t.id)).toEqual(['soon']);
    expect(parsed.deferred.map((t: { id: string }) => t.id)).toEqual(['def']);
  });

  it('search and legacy filter scripts continue working as expected', () => {
    const work = makeProject({ idKey: 'p1', name: 'Work' });
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 17, 0, 0);
    const todayEvening = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);

    const tasks = [
      makeTask({ idKey: 'root', name: 'Work Root', project: work, flagged: true }),
      makeTask({
        idKey: 't1',
        name: 'Q1 Report',
        containingProject: work,
        flagged: true,
        dueDate: yesterday,
      }),
      makeTask({ idKey: 't2', name: 'Today Task', containingProject: work, dueDate: todayEvening }),
    ];

    const search = executeWrappedScript(
      TASK_SEARCH_SCRIPT,
      buildTaskSearchArgs('report', { project: 'Work', flagged: true, limit: 1 }).args,
      { flattenedTasks: tasks },
    );
    expect(search.parsed.totalCount).toBe(1);

    expect(
      executeWrappedScript(buildTasksFlaggedScript(), [], {
        flattenedTasks: tasks,
      }).parsed.tasks.map((t: { id: string }) => t.id),
    ).toEqual(['t1']);
    expect(
      executeWrappedScript(buildTasksOverdueScript(), [], {
        flattenedTasks: tasks,
      }).parsed.tasks.map((t: { id: string }) => t.id),
    ).toEqual(['t1']);
    expect(
      executeWrappedScript(buildTasksTodayScript(), [], { flattenedTasks: tasks }).parsed.tasks.map(
        (t: { id: string }) => t.id,
      ),
    ).toEqual(['t1', 't2']);
  });
});

describe('projects, review, tags, folders, and perspectives scripts', () => {
  it('detects stalled projects accurately for normal and single-action lists', () => {
    const nextT = makeTask({ idKey: 't1', name: 'Next' });
    const blockedT = makeTask({ idKey: 't2', name: 'Blocked', taskStatus: TaskStatus.Blocked });
    const availT = makeTask({ idKey: 't3', name: 'Avail', taskStatus: TaskStatus.Available });

    const healthyNormal = makeProject({ idKey: 'p1', name: 'Healthy', nextTask: nextT });
    const stalledNormal = makeProject({ idKey: 'p2', name: 'Stalled', nextTask: null });
    const healthySingle = makeProject({
      idKey: 'p3',
      name: 'Single OK',
      containsSingletonActions: true,
      nextTask: null,
      flattenedTasks: [availT],
    });
    const stalledSingle = makeProject({
      idKey: 'p4',
      name: 'Single Empty',
      containsSingletonActions: true,
      nextTask: null,
      flattenedTasks: [blockedT],
    });
    const onHold = makeProject({
      idKey: 'p5',
      name: 'Paused',
      status: ProjectStatusEnum.OnHold,
      nextTask: null,
    });

    const { parsed } = executeWrappedScript(
      PROJECTS_LIST_SCRIPT,
      buildProjectsListArgs({ stalled: true }).args,
      { flattenedProjects: [healthyNormal, stalledNormal, healthySingle, stalledSingle, onHold] },
    );
    expect(parsed.projects.map((p: { id: string }) => p.id)).toEqual(['p2', 'p4']);
  });

  it('adds, updates, shows, and changes status of projects', () => {
    const workFolder = makeFolder({ name: 'Work' });
    const devTag = makeTag({ name: 'dev' });

    const added = executeWrappedScript(
      PROJECTS_ADD_SCRIPT,
      buildProjectsAddArgs('Misc', {
        folder: 'Work',
        singleActions: true,
        reviewInterval: { steps: 2, unit: 'weeks' },
        tags: ['dev'],
      }).args,
      { flattenedFolders: [workFolder], flattenedTags: [devTag] },
    );
    expect(added.parsed.success).toBe(true);
    const proj = added.state.flattenedProjects[0];
    expect(proj.containsSingletonActions).toBe(true);
    expect(proj.reviewInterval).toEqual({ steps: 2, unit: 'weeks' });

    const updated = executeWrappedScript(
      PROJECTS_UPDATE_SCRIPT,
      buildProjectsUpdateArgs({
        name: 'Misc',
        newName: 'Errands',
        topLevel: true,
        sequential: true,
        appendNote: 'Updated',
        reviewInterval: { steps: 1, unit: 'months' },
      }).args,
      { flattenedProjects: [proj], flattenedFolders: [workFolder] },
    );
    expect(updated.parsed.success).toBe(true);
    expect(updated.parsed.project).toMatchObject({
      name: 'Errands',
      folderName: null,
      sequential: true,
      singleActions: false,
      note: 'Updated',
      reviewInterval: { steps: 1, unit: 'months' },
    });

    const shown = executeWrappedScript(
      PROJECTS_SHOW_SCRIPT,
      buildProjectsShowArgs({ name: 'Errands', detailed: true }).args,
      { flattenedProjects: [proj] },
    );
    expect(shown.parsed.project.reviewInterval).toEqual({ steps: 1, unit: 'months' });

    const status = executeWrappedScript(
      PROJECTS_STATUS_SCRIPT,
      buildProjectsStatusArgs('Errands', 'on-hold').args,
      { flattenedProjects: [proj] },
    );
    expect(status.parsed.project.status).toBe('on-hold');
  });

  it('lists projects due for review sorted oldest first and marks project reviewed', () => {
    const now = new Date();
    const pastOld = new Date(now.getTime() - 5 * 86400_000);
    const pastNew = new Date(now.getTime() - 1 * 86400_000);
    const future = new Date(now.getTime() + 5 * 86400_000);

    const pOld = makeProject({ idKey: 'p1', name: 'Oldest', nextReviewDate: pastOld });
    const pNew = makeProject({
      idKey: 'p2',
      name: 'Newer',
      status: ProjectStatusEnum.OnHold,
      nextReviewDate: pastNew,
    });
    const pFuture = makeProject({ idKey: 'p3', name: 'Future', nextReviewDate: future });
    const pDone = makeProject({
      idKey: 'p4',
      name: 'Done',
      status: ProjectStatusEnum.Done,
      nextReviewDate: pastOld,
    });

    const list = executeWrappedScript(REVIEW_LIST_SCRIPT, buildReviewListArgs({}).args, {
      flattenedProjects: [pNew, pFuture, pOld, pDone],
    });
    expect(list.parsed.projects.map((p: { id: string }) => p.id)).toEqual(['p1', 'p2']);

    const marked = executeWrappedScript(REVIEW_MARK_SCRIPT, buildReviewMarkArgs('Oldest').args, {
      flattenedProjects: [pOld],
    });
    expect(marked.parsed.success).toBe(true);
    expect(marked.parsed.project.lastReviewDate).not.toBeNull();
  });

  it('lists, creates, and updates tags and folders', () => {
    const rootTag = makeTag({ name: 'People', idKey: 'tag-1' });
    const addedTag = executeWrappedScript(
      TAGS_ADD_SCRIPT,
      buildTagsAddArgs('Waiting For', { parent: 'People', onHold: true }).args,
      { flattenedTags: [rootTag] },
    );
    expect(addedTag.parsed.tag).toMatchObject({
      name: 'Waiting For',
      parentName: 'People',
      status: 'on-hold',
    });

    const listTags = executeWrappedScript(
      TAGS_LIST_SCRIPT,
      buildTagsListArgs({ status: 'on-hold' }).args,
      { flattenedTags: addedTag.state.flattenedTags },
    );
    expect(listTags.parsed.tags.map((t: { name: string }) => t.name)).toEqual(['Waiting For']);

    const updatedTag = executeWrappedScript(
      TAGS_STATUS_SCRIPT,
      buildTagsStatusArgs('Waiting For', 'active').args,
      { flattenedTags: addedTag.state.flattenedTags },
    );
    expect(updatedTag.parsed.tag.status).toBe('active');

    const rootFolder = makeFolder({ name: 'Work', idKey: 'f-1' });
    const addedFolder = executeWrappedScript(
      FOLDERS_ADD_SCRIPT,
      buildFoldersAddArgs('Q2', { parent: 'Work' }).args,
      { flattenedFolders: [rootFolder] },
    );
    expect(addedFolder.parsed.folder).toMatchObject({
      name: 'Q2',
      parentName: 'Work',
      status: 'active',
    });

    const listFolders = executeWrappedScript(
      FOLDERS_LIST_SCRIPT,
      buildFoldersListArgs({ status: 'active' }).args,
      { flattenedFolders: addedFolder.state.flattenedFolders },
    );
    expect(listFolders.parsed.totalCount).toBe(2);
  });

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
