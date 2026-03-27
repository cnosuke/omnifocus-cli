import { describe, expect, it } from 'vitest';
import { buildInboxListScript } from '../../../src/jxa/scripts/inbox-list.js';
import { TASK_ADD_SCRIPT, buildTaskAddArgs } from '../../../src/jxa/scripts/task-add.js';
import { TASK_COMPLETE_SCRIPT, buildTaskCompleteArgs } from '../../../src/jxa/scripts/task-complete.js';
import { TASK_SEARCH_SCRIPT, buildTaskSearchArgs } from '../../../src/jxa/scripts/task-search.js';
import {
  buildTasksFlaggedScript,
  buildTasksOverdueScript,
  buildTasksTodayScript,
} from '../../../src/jxa/scripts/tasks-filter.js';

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

describe('TASK_ADD_SCRIPT + buildTaskAddArgs', () => {
  it('script reads args from NSProcessInfo', () => {
    expect(TASK_ADD_SCRIPT).toContain('ObjC.unwrap($.NSProcessInfo.processInfo.arguments)');
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
    expect(TASK_COMPLETE_SCRIPT).toContain('ObjC.unwrap($.NSProcessInfo.processInfo.arguments)');
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
    expect(TASK_SEARCH_SCRIPT).toContain('ObjC.unwrap($.NSProcessInfo.processInfo.arguments)');
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
