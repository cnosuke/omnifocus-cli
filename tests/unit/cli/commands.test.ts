import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../src/jxa/runner.js', () => ({
  runJxa: vi.fn(),
}));

import { runInbox } from '../../../src/cli/commands/inbox.js';
import { runTask } from '../../../src/cli/commands/task.js';
import { runTasks } from '../../../src/cli/commands/tasks.js';
import { runPerspectives } from '../../../src/cli/commands/perspectives.js';
import { runProjects } from '../../../src/cli/commands/projects.js';
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

  it('task complete requires id', async () => {
    await expect(runTask(['complete'])).rejects.toThrow('Task ID is required');
  });

  it('task complete passes taskId in JSON payload', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({
      success: true,
      task: { id: 'abc123', name: 'Done', completed: true },
    });

    await runTask(['complete', 'abc123']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(JSON.parse(options!.args![0])).toEqual({ taskId: 'abc123' });
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

  it('projects list with --status and --folder', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, projects: [], totalCount: 0 });

    await runProjects(['list', '--status', 'active', '--folder', 'Work']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(JSON.parse(options!.args![0])).toEqual({ status: 'active', folder: 'Work' });
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

  it('projects add with tags and sequential', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, project: { id: '1', name: 'Test' } });

    await runProjects(['add', 'Test', '--tag', 'work', '--tag', 'urgent', '--sequential']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(JSON.parse(options!.args![0])).toEqual({
      name: 'Test',
      tags: ['work', 'urgent'],
      sequential: true,
    });
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

describe('JSON parse validation', () => {
  it('throws on invalid JSON from osascript', async () => {
    mockRunJxa.mockResolvedValue({ stdout: 'not json', exitCode: 0 });
    await expect(runTasks(['flagged'])).rejects.toThrow('Invalid JSON from osascript');
  });
});
