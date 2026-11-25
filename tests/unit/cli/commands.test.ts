import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../src/jxa/runner.js', () => ({
  runJxa: vi.fn(),
}));

import { runInbox } from '../../../src/cli/commands/inbox.js';
import { runTask } from '../../../src/cli/commands/task.js';
import { runTasks } from '../../../src/cli/commands/tasks.js';
import { runPerspectives } from '../../../src/cli/commands/perspectives.js';
import { runProjects } from '../../../src/cli/commands/projects.js';
import { runReview } from '../../../src/cli/commands/review.js';
import { runTags } from '../../../src/cli/commands/tags.js';
import { runFolders } from '../../../src/cli/commands/folders.js';
import { runJxa } from '../../../src/jxa/runner.js';

const mockRunJxa = vi.mocked(runJxa);

beforeEach(() => {
  vi.restoreAllMocks();
  mockRunJxa.mockReset();
});

function mockJxaResult(data: object) {
  mockRunJxa.mockResolvedValue({
    stdout: JSON.stringify(data),
    exitCode: 0,
  });
}

describe('inbox commands', () => {
  it('inbox list prints help with --help', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runInbox(['list', '--help']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('inbox list'));
  });

  it('inbox --help prints subcommand list', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runInbox(['--help']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Subcommands'));
  });

  it('inbox list calls runJxa with brief mode', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runInbox(['list']);
    expect(mockRunJxa).toHaveBeenCalledOnce();
    const script = mockRunJxa.mock.calls[0][0];
    expect(script).toContain('formatTaskBrief(task)');
  });

  it('inbox list --detailed calls runJxa with detailed mode', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runInbox(['list', '--detailed']);
    expect(mockRunJxa).toHaveBeenCalledOnce();
    const script = mockRunJxa.mock.calls[0][0];
    expect(script).toContain('formatTaskDetail(task)');
  });

  it('inbox list throws on unknown flag', async () => {
    await expect(runInbox(['list', '--bad'])).rejects.toThrow('--bad');
  });

  it('inbox throws on unknown subcommand', () => {
    expect(() => runInbox(['badcmd'])).toThrow("Unknown inbox subcommand 'badcmd'");
  });
});

describe('task commands', () => {
  it('task add requires name', async () => {
    await expect(runTask(['add'])).rejects.toThrow('Task name is required');
  });

  it('task add passes single JSON payload with normalized ISO dates', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({
      success: true,
      task: { id: '1', name: 'Test', dueDate: null, flagged: false, completed: false },
    });

    await runTask(['add', 'Test Task', '--project', 'Work', '--due', '2026-03-15', '--flagged']);
    expect(mockRunJxa).toHaveBeenCalledOnce();
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(options!.args).toHaveLength(1);
    const payload = JSON.parse(options!.args![0]);
    expect(payload.name).toBe('Test Task');
    expect(payload.project).toBe('Work');
    expect(payload.flagged).toBe(true);
    expect(payload.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('task add supports --parent, --sequential, --repeat, and rejects conflicting flags', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({
      success: true,
      task: { id: '1', name: 'Sub', dueDate: null, flagged: false, completed: false },
    });

    await runTask([
      'add',
      'Sub',
      '--parent',
      'p1',
      '--sequential',
      '--repeat',
      'FREQ=WEEKLY;INTERVAL=1',
      '--repeat-method',
      'due-date',
    ]);
    const payload = JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0]);
    expect(payload).toEqual({
      name: 'Sub',
      parentId: 'p1',
      sequential: true,
      repetitionRule: { ruleString: 'FREQ=WEEKLY;INTERVAL=1', method: 'due-date' },
    });

    await expect(runTask(['add', 'X', '--project', 'Work', '--parent', 'p1'])).rejects.toThrow(
      'Cannot combine --project and --parent',
    );
    await expect(runTask(['add', 'X', '--repeat-method', 'fixed'])).rejects.toThrow(
      '--repeat-method requires --repeat',
    );
    await expect(
      runTask(['add', 'X', '--repeat', 'FREQ=DAILY', '--repeat-method', 'bad']),
    ).rejects.toThrow("Invalid repeat method 'bad'");
  });

  it('task add with tags', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({
      success: true,
      task: { id: '1', name: 'Test', dueDate: null, flagged: false, completed: false },
    });

    await runTask(['add', 'Test', '--tag', 'work', '--tag', 'urgent']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    const payload = JSON.parse(options!.args![0]);
    expect(payload.tags).toEqual(['work', 'urgent']);
  });

  it('task add rejects invalid date before calling osascript', async () => {
    await expect(runTask(['add', 'Test', '--due', 'not-a-date'])).rejects.toThrow(
      "Invalid date 'not-a-date'",
    );
    expect(mockRunJxa).not.toHaveBeenCalled();
  });

  it('task add rejects non-integer or zero estimate', async () => {
    await expect(runTask(['add', 'Test', '--estimate', 'abc'])).rejects.toThrow(
      'must be a positive integer',
    );
    await expect(runTask(['add', 'Test', '--estimate', '0'])).rejects.toThrow(
      'must be a positive integer',
    );
  });

  it('task add throws on missing flag value', async () => {
    await expect(runTask(['add', 'Test', '--project'])).rejects.toThrow('--project');
  });

  it('task show requires id and passes --children', async () => {
    await expect(runTask(['show'])).rejects.toThrow('Task ID is required');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, task: { id: 't1', name: 'A' }, children: [] });

    await runTask(['show', 't1', '--children']);
    expect(JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0])).toEqual({
      taskId: 't1',
      includeChildren: true,
    });
  });

  it('task update validates options, mutual exclusivity, and builds payload', async () => {
    await expect(runTask(['update'])).rejects.toThrow('Task ID is required');
    await expect(runTask(['update', 't1'])).rejects.toThrow('At least one update option');
    await expect(runTask(['update', 't1', '--due', 'today', '--clear-due'])).rejects.toThrow(
      'Cannot combine --due and --clear-due',
    );
    await expect(runTask(['update', 't1', '--project', 'Work', '--inbox'])).rejects.toThrow(
      'Cannot combine --project and --inbox',
    );
    await expect(runTask(['update', 't1', '--flagged', '--unflagged'])).rejects.toThrow(
      'Cannot combine --flagged and --unflagged',
    );

    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, task: { id: 't1', name: 'Renamed' } });

    await runTask([
      'update',
      't1',
      '--name',
      'Renamed',
      '--append-note',
      '\nMore',
      '--clear-due',
      '--defer',
      'tomorrow',
      '--clear-estimate',
      '--unflagged',
      '--add-tag',
      '@PC',
      '--remove-tag',
      'old',
      '--project',
      'Work',
      '--clear-repeat',
    ]);
    const payload = JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0]);
    expect(payload).toMatchObject({
      taskId: 't1',
      name: 'Renamed',
      appendNote: '\nMore',
      dueDate: null,
      estimatedMinutes: null,
      flagged: false,
      addTags: ['@PC'],
      removeTags: ['old'],
      moveToProject: 'Work',
      repetitionRule: null,
    });
    expect(payload.deferDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('task complete and uncomplete pass taskId', async () => {
    await expect(runTask(['complete'])).rejects.toThrow('Task ID is required');
    await expect(runTask(['uncomplete'])).rejects.toThrow('Task ID is required');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    mockJxaResult({ success: true, task: { id: 'abc123', name: 'Done', completed: true } });
    await runTask(['complete', 'abc123']);
    expect(JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0])).toEqual({ taskId: 'abc123' });

    mockJxaResult({ success: true, task: { id: 'abc123', name: 'Done', completed: false } });
    await runTask(['uncomplete', 'abc123']);
    expect(JSON.parse(mockRunJxa.mock.calls[1][1]!.args![0])).toEqual({ taskId: 'abc123' });
  });

  it('task drop, delete, and to-project pass expected payloads', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    mockJxaResult({ success: true, task: { id: 't1', name: 'Drop', dropped: true } });
    await runTask(['drop', 't1', '--all-occurrences']);
    expect(JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0])).toEqual({
      taskId: 't1',
      allOccurrences: true,
    });

    mockJxaResult({ success: true, deleted: { id: 't1', name: 'Del' } });
    await runTask(['delete', 't1']);
    expect(JSON.parse(mockRunJxa.mock.calls[1][1]!.args![0])).toEqual({ taskId: 't1' });

    mockJxaResult({ success: true, project: { id: 'p1', name: 'Proj' } });
    await runTask(['to-project', 't1', '--folder', 'Work']);
    expect(JSON.parse(mockRunJxa.mock.calls[2][1]!.args![0])).toEqual({
      taskId: 't1',
      folder: 'Work',
    });
  });

  it('task search requires keyword', async () => {
    await expect(runTask(['search'])).rejects.toThrow('Search keyword is required');
  });

  it('task search rejects zero limit', async () => {
    await expect(runTask(['search', 'report', '--limit', '0'])).rejects.toThrow(
      'must be a positive integer',
    );
  });

  it('task search passes keyword and options in JSON payload', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runTask(['search', 'report', '--project', 'Work', '--flagged', '--limit', '10']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(JSON.parse(options!.args![0])).toEqual({
      keyword: 'report',
      project: 'Work',
      flagged: true,
      limit: 10,
    });
  });

  it('task --help prints subcommands', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runTask(['--help']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Subcommands'));
  });

  it('task throws on unknown subcommand', () => {
    expect(() => runTask(['badcmd'])).toThrow("Unknown task subcommand 'badcmd'");
  });
});

describe('tasks commands', () => {
  it('tasks list passes filter payload and validates status / completed-since', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runTasks([
      'list',
      '--status',
      'next',
      '--tag',
      '@PC',
      '--tag',
      'Quick',
      '--project',
      'Work',
      '--flagged',
      '--max-estimate',
      '30',
      '--due-before',
      '+3d',
      '--detailed',
      '--limit',
      '20',
    ]);
    const payload = JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0]);
    expect(payload).toMatchObject({
      status: 'next',
      tags: ['@PC', 'Quick'],
      project: 'Work',
      flagged: true,
      maxEstimate: 30,
      detailed: true,
      limit: 20,
    });
    expect(payload.dueBefore).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // --completed-since implies status: completed
    await runTasks(['list', '--completed-since', '7d ago']);
    const completedPayload = JSON.parse(mockRunJxa.mock.calls[1][1]!.args![0]);
    expect(completedPayload.status).toBe('completed');
    expect(completedPayload.completedSince).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    await runTasks(['list', '--completed-since=-7d']);
    const completedEqPayload = JSON.parse(mockRunJxa.mock.calls[2][1]!.args![0]);
    expect(completedEqPayload.status).toBe('completed');
    expect(completedEqPayload.completedSince).toBe(completedPayload.completedSince);

    await expect(
      runTasks(['list', '--status', 'available', '--completed-since', '7d ago']),
    ).rejects.toThrow('--completed-since requires --status completed');
    await expect(runTasks(['list', '--status', 'bogus'])).rejects.toThrow(
      "Invalid task status 'bogus'",
    );
  });

  it('tasks forecast passes days option and validates positive integer', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, days: 3, overdue: [], due: [], deferred: [] });

    await runTasks(['forecast', '--days', '3']);
    expect(JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0])).toEqual({ days: 3 });

    await expect(runTasks(['forecast', '--days', '0'])).rejects.toThrow(
      'must be a positive integer',
    );
  });

  it('tasks flagged calls runJxa', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runTasks(['flagged']);
    expect(mockRunJxa).toHaveBeenCalledOnce();
    expect(mockRunJxa.mock.calls[0][0]).toContain('t.flagged');
  });

  it('tasks overdue calls runJxa', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runTasks(['overdue']);
    expect(mockRunJxa.mock.calls[0][0]).toContain('startOfToday');
  });

  it('tasks today calls runJxa', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runTasks(['today']);
    expect(mockRunJxa.mock.calls[0][0]).toContain('endOfToday');
  });

  it('tasks --help prints subcommands', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runTasks(['--help']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Subcommands'));
  });

  it('tasks throws on unknown subcommand', () => {
    expect(() => runTasks(['badcmd'])).toThrow("Unknown tasks subcommand 'badcmd'");
  });

  it('tasks flagged throws on error response', async () => {
    mockJxaResult({ success: false, error: 'OmniFocus is not running' });
    await expect(runTasks(['flagged'])).rejects.toThrow('OmniFocus is not running');
  });
});

describe('perspectives commands', () => {
  it('perspectives list calls runJxa', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, perspectiveNames: ['Inbox', 'Flagged'], totalCount: 2 });

    await runPerspectives(['list']);
    expect(mockRunJxa).toHaveBeenCalledOnce();
    expect(mockRunJxa.mock.calls[0][0]).toContain('Perspective.all');
  });

  it('perspectives list prints help with --help', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runPerspectives(['list', '--help']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('perspectives list'));
  });

  it('perspectives --help prints subcommands', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runPerspectives(['--help']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Subcommands'));
  });

  it('perspectives list throws on unknown argument', async () => {
    await expect(runPerspectives(['list', '--badarg'])).rejects.toThrow('--badarg');
  });

  it('perspectives throws on unknown subcommand', () => {
    expect(() => runPerspectives(['badcmd'])).toThrow("Unknown perspectives subcommand 'badcmd'");
  });
});

describe('projects commands', () => {
  it('projects list calls runJxa without filters', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, projects: [], totalCount: 0 });

    await runProjects(['list']);
    expect(mockRunJxa).toHaveBeenCalledOnce();
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(JSON.parse(options!.args![0])).toEqual({});
  });

  it('projects list supports --status, --folder, --stalled, --limit', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, projects: [], totalCount: 0 });

    await runProjects([
      'list',
      '--status',
      'active',
      '--folder',
      'Work',
      '--stalled',
      '--limit',
      '15',
    ]);
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(JSON.parse(options!.args![0])).toEqual({
      status: 'active',
      folder: 'Work',
      stalled: true,
      limit: 15,
    });
  });

  it('projects list validates status value', async () => {
    await expect(runProjects(['list', '--status', 'invalid'])).rejects.toThrow(
      "Invalid status 'invalid'",
    );
  });

  it('projects show requires name', async () => {
    await expect(runProjects(['show'])).rejects.toThrow('Project name is required');
  });

  it('projects show passes name and flags', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, project: { id: '1', name: 'Test' } });

    await runProjects(['show', 'My Project', '--detailed', '--tasks']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(JSON.parse(options!.args![0])).toEqual({
      name: 'My Project',
      detailed: true,
      includeTasks: true,
    });
  });

  it('projects add requires name', async () => {
    await expect(runProjects(['add'])).rejects.toThrow('Project name is required');
  });

  it('projects add supports --single-actions and --review-interval', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, project: { id: '1', name: 'Misc' } });

    await runProjects(['add', 'Misc', '--single-actions', '--review-interval', '2w']);
    expect(JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0])).toEqual({
      name: 'Misc',
      singleActions: true,
      reviewInterval: { steps: 2, unit: 'weeks' },
    });

    await expect(runProjects(['add', 'Bad', '--sequential', '--single-actions'])).rejects.toThrow(
      'Cannot combine --sequential and --single-actions',
    );
    await expect(runProjects(['add', 'Bad', '--review-interval', '0w'])).rejects.toThrow(
      'Invalid review interval',
    );
  });

  it('projects add passes name and normalized options', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, project: { id: '1', name: 'New' } });

    await runProjects(['add', 'New Project', '--due', 'tomorrow', '--flagged', '--folder', 'Work']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    const payload = JSON.parse(options!.args![0]);
    expect(payload.name).toBe('New Project');
    expect(payload.flagged).toBe(true);
    expect(payload.folder).toBe('Work');
    expect(payload.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('projects add rejects invalid date before calling osascript', async () => {
    await expect(runProjects(['add', 'New Project', '--defer', 'bad-date'])).rejects.toThrow(
      "Invalid date 'bad-date'",
    );
    expect(mockRunJxa).not.toHaveBeenCalled();
  });

  it('projects update validates options and builds payload', async () => {
    await expect(runProjects(['update'])).rejects.toThrow('Project name is required');
    await expect(runProjects(['update', 'API'])).rejects.toThrow('At least one update option');
    await expect(runProjects(['update', 'API', '--folder', 'Work', '--top-level'])).rejects.toThrow(
      'Cannot combine --folder and --top-level',
    );
    await expect(runProjects(['update', 'API', '--sequential', '--parallel'])).rejects.toThrow(
      'Cannot combine --sequential and --parallel',
    );

    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, project: { id: 'p1', name: 'API v2' } });

    await runProjects([
      'update',
      'API',
      '--name',
      'API v2',
      '--folder',
      'Work',
      '--parallel',
      '--review-interval',
      '1m',
      '--next-review',
      '2026-04-01',
    ]);
    const payload = JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0]);
    expect(payload).toMatchObject({
      name: 'API',
      newName: 'API v2',
      folder: 'Work',
      sequential: false,
      singleActions: false,
      reviewInterval: { steps: 1, unit: 'months' },
    });
    expect(payload.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('projects status requires name and status', async () => {
    await expect(runProjects(['status'])).rejects.toThrow('Project name is required');
    await expect(runProjects(['status', 'My Project'])).rejects.toThrow('Status is required');
  });

  it('projects status validates status value', async () => {
    await expect(runProjects(['status', 'My Project', 'invalid'])).rejects.toThrow(
      "Invalid status 'invalid'",
    );
  });

  it('projects status passes name and status in JSON payload', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, project: { id: '1', name: 'Test' } });

    await runProjects(['status', 'My Project', 'on-hold']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(JSON.parse(options!.args![0])).toEqual({ name: 'My Project', status: 'on-hold' });
  });

  it('projects --help prints subcommands', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runProjects(['--help']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Subcommands'));
  });

  it('projects throws on unknown subcommand', () => {
    expect(() => runProjects(['badcmd'])).toThrow("Unknown projects subcommand 'badcmd'");
  });
});

describe('review commands', () => {
  it('review list passes status filter and validates status', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, projects: [], totalCount: 0 });

    await runReview(['list', '--status', 'active']);
    expect(JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0])).toEqual({ status: 'active' });

    await expect(runReview(['list', '--status', 'done'])).rejects.toThrow(
      "Invalid review status 'done'",
    );
  });

  it('review mark requires project name', async () => {
    await expect(runReview(['mark'])).rejects.toThrow('Project name is required');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, project: { id: 'p1', name: 'Launch' } });

    await runReview(['mark', 'Launch']);
    expect(JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0])).toEqual({ name: 'Launch' });
  });
});

describe('tags commands', () => {
  it('tags list, add, status pass payloads and validate', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    mockJxaResult({ success: true, tags: [], totalCount: 0 });
    await runTags(['list', '--status', 'on-hold']);
    expect(JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0])).toEqual({ status: 'on-hold' });

    mockJxaResult({ success: true, tag: { id: 'tag1', name: 'Waiting For' } });
    await runTags(['add', 'Waiting For', '--parent', 'People', '--on-hold']);
    expect(JSON.parse(mockRunJxa.mock.calls[1][1]!.args![0])).toEqual({
      name: 'Waiting For',
      parent: 'People',
      onHold: true,
    });

    mockJxaResult({ success: true, tag: { id: 'tag1', name: 'Waiting For' } });
    await runTags(['status', 'Waiting For', 'active']);
    expect(JSON.parse(mockRunJxa.mock.calls[2][1]!.args![0])).toEqual({
      name: 'Waiting For',
      status: 'active',
    });

    await expect(runTags(['list', '--status', 'bad'])).rejects.toThrow("Invalid tag status 'bad'");
    await expect(runTags(['add'])).rejects.toThrow('Tag name is required');
    await expect(runTags(['status', 'Waiting For'])).rejects.toThrow('Status is required');
  });
});

describe('folders commands', () => {
  it('folders list and add pass payloads and validate', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    mockJxaResult({ success: true, folders: [], totalCount: 0 });
    await runFolders(['list', '--status', 'active']);
    expect(JSON.parse(mockRunJxa.mock.calls[0][1]!.args![0])).toEqual({ status: 'active' });

    mockJxaResult({ success: true, folder: { id: 'f1', name: 'Q2' } });
    await runFolders(['add', 'Q2', '--parent', 'Work']);
    expect(JSON.parse(mockRunJxa.mock.calls[1][1]!.args![0])).toEqual({
      name: 'Q2',
      parent: 'Work',
    });

    await expect(runFolders(['list', '--status', 'on-hold'])).rejects.toThrow(
      "Invalid folder status 'on-hold'",
    );
    await expect(runFolders(['add'])).rejects.toThrow('Folder name is required');
  });
});

describe('JSON parse validation', () => {
  it('throws on invalid JSON from osascript', async () => {
    mockRunJxa.mockResolvedValue({ stdout: 'not json', exitCode: 0 });
    await expect(runTasks(['flagged'])).rejects.toThrow('Invalid JSON from osascript');
  });
});
