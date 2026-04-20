import { describe, expect, it } from 'vitest';
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

describe('buildInboxListScript', () => {
  it('generates brief mode script', () => {
    const script = buildInboxListScript('brief');
    expect(script).toContain('isOmniFocusRunning');
    expect(script).toContain('inboxTasks');
    expect(script).toContain('result.push(formatTaskBrief(allTasks[i]));');
  });

  it('generates detailed mode script', () => {
    const script = buildInboxListScript('detailed');
    expect(script).toContain('result.push(formatTaskDetail(allTasks[i]));');
  });

  it('includes JXA helpers', () => {
    const script = buildInboxListScript('brief');
    expect(script).toContain('ObjC.import');
    expect(script).toContain('Application("OmniFocus")');
  });
});

describe('getArgv helper', () => {
  it('is defined in JXA helpers and uses ObjC.deepUnwrap', () => {
    const script = buildInboxListScript('brief');
    expect(script).toContain('function getArgv()');
    expect(script).toContain('ObjC.deepUnwrap($.NSProcessInfo.processInfo.arguments)');
  });

  it('is used by all argv-consuming scripts instead of shallow ObjC.unwrap', () => {
    const scripts = [
      TASK_ADD_SCRIPT,
      TASK_COMPLETE_SCRIPT,
      TASK_SEARCH_SCRIPT,
      PROJECTS_LIST_SCRIPT,
      PROJECTS_SHOW_SCRIPT,
      PROJECTS_ADD_SCRIPT,
      PROJECTS_STATUS_SCRIPT,
    ];
    for (const script of scripts) {
      const body = script.slice(script.indexOf('(function()'));
      expect(body).toContain('var argv = getArgv();');
      expect(body).not.toContain('ObjC.unwrap($.NSProcessInfo.processInfo.arguments)');
    }
  });
});

describe('TASK_ADD_SCRIPT + buildTaskAddArgs', () => {
  it('script reads args from NSProcessInfo', () => {
    expect(TASK_ADD_SCRIPT).toContain('getArgv()');
    expect(TASK_ADD_SCRIPT).toContain('argv[argv.length - 2]');
    expect(TASK_ADD_SCRIPT).toContain('JSON.parse(argv[argv.length - 1])');
  });

  it('builds args with name and empty options', () => {
    const opts = buildTaskAddArgs('Buy groceries', {});
    expect(opts.args).toEqual(['Buy groceries', '{}']);
  });

  it('builds args with all fields', () => {
    const opts = buildTaskAddArgs('Test', {
      project: 'Work',
      dueDate: 'tomorrow',
      deferDate: 'today',
      flagged: true,
      note: 'A note',
      estimatedMinutes: 30,
      tags: ['urgent', 'work'],
    });
    expect(opts.args![0]).toBe('Test');
    const parsed = JSON.parse(opts.args![1]);
    expect(parsed.project).toBe('Work');
    expect(parsed.dueDate).toBe('tomorrow');
    expect(parsed.flagged).toBe(true);
    expect(parsed.tags).toEqual(['urgent', 'work']);
  });

  it('safely passes special characters in name via args', () => {
    const opts = buildTaskAddArgs('Task with "quotes" & <brackets>', {});
    expect(opts.args![0]).toBe('Task with "quotes" & <brackets>');
  });
});

describe('TASK_COMPLETE_SCRIPT + buildTaskCompleteArgs', () => {
  it('script reads taskId from NSProcessInfo', () => {
    expect(TASK_COMPLETE_SCRIPT).toContain('getArgv()');
    expect(TASK_COMPLETE_SCRIPT).toContain('argv[argv.length - 1]');
    expect(TASK_COMPLETE_SCRIPT).toContain('findTask');
    expect(TASK_COMPLETE_SCRIPT).toContain('markComplete');
  });

  it('builds args with task id', () => {
    const opts = buildTaskCompleteArgs('abc123');
    expect(opts.args).toEqual(['abc123']);
  });
});

describe('TASK_SEARCH_SCRIPT + buildTaskSearchArgs', () => {
  it('script reads keyword and options from NSProcessInfo', () => {
    expect(TASK_SEARCH_SCRIPT).toContain('getArgv()');
    expect(TASK_SEARCH_SCRIPT).toContain('toLowerCase');
  });

  it('builds args with keyword and options', () => {
    const opts = buildTaskSearchArgs('test', {
      project: 'Work',
      flagged: true,
      limit: 10,
    });
    expect(opts.args![0]).toBe('test');
    const parsed = JSON.parse(opts.args![1]);
    expect(parsed.project).toBe('Work');
    expect(parsed.flagged).toBe(true);
    expect(parsed.limit).toBe(10);
  });
});

describe('buildTasksFlaggedScript', () => {
  it('generates flagged filter script', () => {
    const script = buildTasksFlaggedScript();
    expect(script).toContain('t.flagged()');
    expect(script).toContain('flattenedTasks');
  });

  it('tracks total count separately from result limit', () => {
    const script = buildTasksFlaggedScript();
    expect(script).toContain('total++');
    expect(script).toContain('totalCount: total');
  });
});

describe('buildTasksOverdueScript', () => {
  it('generates overdue filter script', () => {
    const script = buildTasksOverdueScript();
    expect(script).toContain('startOfToday');
    expect(script).toContain('due < startOfToday');
  });
});

describe('buildTasksTodayScript', () => {
  it('generates today filter script', () => {
    const script = buildTasksTodayScript();
    expect(script).toContain('endOfToday');
    expect(script).toContain('due <= endOfToday');
  });
});

describe('buildPerspectivesListScript', () => {
  it('generates script that reads perspectiveNames', () => {
    const script = buildPerspectivesListScript();
    expect(script).toContain('perspectiveNames');
    expect(script).toContain('isOmniFocusRunning');
  });

  it('includes JXA helpers', () => {
    const script = buildPerspectivesListScript();
    expect(script).toContain('ObjC.import');
    expect(script).toContain('Application("OmniFocus")');
  });
});

describe('PROJECTS_LIST_SCRIPT + buildProjectsListArgs', () => {
  it('script reads options from NSProcessInfo', () => {
    expect(PROJECTS_LIST_SCRIPT).toContain('getArgv()');
    expect(PROJECTS_LIST_SCRIPT).toContain('flattenedProjects');
    expect(PROJECTS_LIST_SCRIPT).toContain('formatProjectBrief');
  });

  it('builds args with no filters', () => {
    const opts = buildProjectsListArgs({});
    expect(opts.args).toEqual(['{}']);
  });

  it('builds args with status filter', () => {
    const opts = buildProjectsListArgs({ status: 'active' });
    const parsed = JSON.parse(opts.args![0]);
    expect(parsed.status).toBe('active status');
  });

  it('builds args with folder filter', () => {
    const opts = buildProjectsListArgs({ folder: 'Work' });
    const parsed = JSON.parse(opts.args![0]);
    expect(parsed.folder).toBe('Work');
  });

  it('throws on invalid status', () => {
    expect(() => buildProjectsListArgs({ status: 'invalid' })).toThrow("Invalid status 'invalid'");
  });
});

describe('PROJECTS_SHOW_SCRIPT + buildProjectsShowArgs', () => {
  it('script reads options from NSProcessInfo', () => {
    expect(PROJECTS_SHOW_SCRIPT).toContain('getArgv()');
    expect(PROJECTS_SHOW_SCRIPT).toContain('findProject');
  });

  it('builds args with name and flags', () => {
    const opts = buildProjectsShowArgs({ name: 'Test', detailed: true, includeTasks: true });
    const parsed = JSON.parse(opts.args![0]);
    expect(parsed.name).toBe('Test');
    expect(parsed.detailed).toBe(true);
    expect(parsed.includeTasks).toBe(true);
  });
});

describe('PROJECTS_ADD_SCRIPT + buildProjectsAddArgs', () => {
  it('script reads name and options from NSProcessInfo', () => {
    expect(PROJECTS_ADD_SCRIPT).toContain('getArgv()');
    expect(PROJECTS_ADD_SCRIPT).toContain('argv[argv.length - 2]');
    expect(PROJECTS_ADD_SCRIPT).toContain('app.Project');
  });

  it('builds args with name and options', () => {
    const opts = buildProjectsAddArgs('New Project', { dueDate: 'tomorrow', flagged: true });
    expect(opts.args![0]).toBe('New Project');
    const parsed = JSON.parse(opts.args![1]);
    expect(parsed.dueDate).toBe('tomorrow');
    expect(parsed.flagged).toBe(true);
  });
});

describe('PROJECTS_STATUS_SCRIPT + buildProjectsStatusArgs', () => {
  it('script reads name and status from NSProcessInfo', () => {
    expect(PROJECTS_STATUS_SCRIPT).toContain('getArgv()');
    expect(PROJECTS_STATUS_SCRIPT).toContain('findProject');
    expect(PROJECTS_STATUS_SCRIPT).toContain('project.status');
  });

  it('builds args with mapped status', () => {
    const opts = buildProjectsStatusArgs('My Project', 'on-hold');
    expect(opts.args).toEqual(['My Project', 'on hold status']);
  });

  it('throws on invalid status', () => {
    expect(() => buildProjectsStatusArgs('Test', 'invalid')).toThrow("Invalid status 'invalid'");
  });
});
