import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../../src/jxa/runner.js', () => ({
  runJxa: vi.fn(),
}));

import { runInbox } from '../../../src/cli/commands/inbox.js';
import { runTask } from '../../../src/cli/commands/task.js';
import { runTasks } from '../../../src/cli/commands/tasks.js';
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
    expect(script).toContain('result.push(formatTaskBrief(allTasks[i]));');
  });

  it('inbox list --detailed calls runJxa with detailed mode', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runInbox(['list', '--detailed']);
    expect(mockRunJxa).toHaveBeenCalledOnce();
    const script = mockRunJxa.mock.calls[0][0];
    expect(script).toContain('result.push(formatTaskDetail(allTasks[i]));');
  });

  it('inbox list throws on unknown flag', async () => {
    await expect(runInbox(['list', '--bad'])).rejects.toThrow("Unknown flag '--bad'");
  });

  it('inbox throws on unknown subcommand', () => {
    expect(() => runInbox(['badcmd'])).toThrow("Unknown inbox subcommand 'badcmd'");
  });
});

describe('task commands', () => {
  it('task add requires name', async () => {
    await expect(runTask(['add'])).rejects.toThrow('Task name is required');
  });

  it('task add passes name and options via osascript args', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({
      success: true,
      task: { id: '1', name: 'Test', dueDate: null, flagged: false, completed: false },
    });

    await runTask(['add', 'Test Task', '--project', 'Work', '--flagged']);
    expect(mockRunJxa).toHaveBeenCalledOnce();
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(options!.args![0]).toBe('Test Task');
    const opts = JSON.parse(options!.args![1]);
    expect(opts.project).toBe('Work');
    expect(opts.flagged).toBe(true);
  });

  it('task add with tags', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({
      success: true,
      task: { id: '1', name: 'Test', dueDate: null, flagged: false, completed: false },
    });

    await runTask(['add', 'Test', '--tag', 'work', '--tag', 'urgent']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    const opts = JSON.parse(options!.args![1]);
    expect(opts.tags).toEqual(['work', 'urgent']);
  });

  it('task add rejects non-integer estimate', async () => {
    await expect(runTask(['add', 'Test', '--estimate', 'abc'])).rejects.toThrow(
      'must be a positive integer',
    );
  });

  it('task add throws on missing flag value', async () => {
    await expect(runTask(['add', 'Test', '--project'])).rejects.toThrow(
      '--project requires a value',
    );
  });

  it('task complete requires id', async () => {
    await expect(runTask(['complete'])).rejects.toThrow('Task ID is required');
  });

  it('task complete passes id via osascript args', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({
      success: true,
      task: { id: 'abc123', name: 'Done', completed: true },
    });

    await runTask(['complete', 'abc123']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(options!.args).toEqual(['abc123']);
  });

  it('task search requires keyword', async () => {
    await expect(runTask(['search'])).rejects.toThrow('Search keyword is required');
  });

  it('task search passes keyword and options via osascript args', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runTask(['search', 'report', '--project', 'Work', '--flagged', '--limit', '10']);
    const [_script, options] = mockRunJxa.mock.calls[0];
    expect(options!.args![0]).toBe('report');
    const opts = JSON.parse(options!.args![1]);
    expect(opts.project).toBe('Work');
    expect(opts.flagged).toBe(true);
    expect(opts.limit).toBe(10);
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
  it('tasks flagged calls correct script builder', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runTasks(['flagged']);
    const script = mockRunJxa.mock.calls[0][0];
    expect(script).toContain('t.flagged()');
  });

  it('tasks overdue calls correct script builder', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runTasks(['overdue']);
    const script = mockRunJxa.mock.calls[0][0];
    expect(script).toContain('startOfToday');
  });

  it('tasks today calls correct script builder', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockJxaResult({ success: true, tasks: [], totalCount: 0 });

    await runTasks(['today']);
    const script = mockRunJxa.mock.calls[0][0];
    expect(script).toContain('endOfToday');
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

describe('JSON parse validation', () => {
  it('throws on invalid JSON from osascript', async () => {
    mockRunJxa.mockResolvedValue({ stdout: 'not json', exitCode: 0 });
    await expect(runTasks(['flagged'])).rejects.toThrow('Invalid JSON from osascript');
  });
});
