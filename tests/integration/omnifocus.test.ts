import { describe, expect, it } from 'vitest';
import { runJxa } from '../../src/jxa/runner.js';
import { buildInboxListScript } from '../../src/jxa/scripts/inbox-list.js';
import {
  buildTasksFlaggedScript,
  buildTasksOverdueScript,
  buildTasksTodayScript,
} from '../../src/jxa/scripts/tasks-filter.js';

const SKIP = !process.env['OF_INTEGRATION'] || process.platform !== 'darwin';

describe.skipIf(SKIP)('OmniFocus integration', () => {
  it('inbox list returns valid JSON', async () => {
    const script = buildInboxListScript('brief');
    const result = await runJxa(script);
    const data = JSON.parse(result.stdout);
    expect(data).toHaveProperty('success');
    if (data.success) {
      expect(Array.isArray(data.tasks)).toBe(true);
      expect(typeof data.totalCount).toBe('number');
    }
  });

  it('tasks flagged returns valid JSON', async () => {
    const script = buildTasksFlaggedScript();
    const result = await runJxa(script);
    const data = JSON.parse(result.stdout);
    expect(data).toHaveProperty('success');
  });

  it('tasks overdue returns valid JSON', async () => {
    const script = buildTasksOverdueScript();
    const result = await runJxa(script);
    const data = JSON.parse(result.stdout);
    expect(data).toHaveProperty('success');
  });

  it('tasks today returns valid JSON', async () => {
    const script = buildTasksTodayScript();
    const result = await runJxa(script);
    const data = JSON.parse(result.stdout);
    expect(data).toHaveProperty('success');
  });
});
