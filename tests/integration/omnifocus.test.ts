import { describe, expect, it } from 'vitest';
import { runJxa } from '../../src/jxa/runner.js';
import { buildInboxListScript } from '../../src/jxa/scripts/inbox-list.js';
import { buildPerspectivesListScript } from '../../src/jxa/scripts/perspectives-list.js';
import {
  PROJECTS_LIST_SCRIPT,
  buildProjectsListArgs,
} from '../../src/jxa/scripts/projects-list.js';
import { TASK_SEARCH_SCRIPT, buildTaskSearchArgs } from '../../src/jxa/scripts/task-search.js';
import {
  buildTasksFlaggedScript,
  buildTasksOverdueScript,
  buildTasksTodayScript,
} from '../../src/jxa/scripts/tasks-filter.js';
import { TASKS_LIST_SCRIPT, buildTasksListArgs } from '../../src/jxa/scripts/tasks-list.js';
import {
  TASKS_FORECAST_SCRIPT,
  buildTasksForecastArgs,
} from '../../src/jxa/scripts/tasks-forecast.js';
import { REVIEW_LIST_SCRIPT, buildReviewListArgs } from '../../src/jxa/scripts/review-list.js';
import { TAGS_LIST_SCRIPT, buildTagsListArgs } from '../../src/jxa/scripts/tags-list.js';
import { FOLDERS_LIST_SCRIPT, buildFoldersListArgs } from '../../src/jxa/scripts/folders-list.js';

const SKIP = !process.env['OF_INTEGRATION'] || process.platform !== 'darwin';

describe.skipIf(SKIP)('OmniFocus integration', () => {
  it('inbox list returns valid JSON', async () => {
    const script = buildInboxListScript('brief');
    const result = await runJxa(script);
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.tasks)).toBe(true);
    expect(typeof data.totalCount).toBe('number');
  });

  it('tasks flagged returns valid JSON', async () => {
    const result = await runJxa(buildTasksFlaggedScript());
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
  });

  it('tasks overdue returns valid JSON', async () => {
    const result = await runJxa(buildTasksOverdueScript());
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
  });

  it('tasks today returns valid JSON', async () => {
    const result = await runJxa(buildTasksTodayScript());
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
  });

  it('tasks list (available) returns valid JSON', async () => {
    const result = await runJxa(
      TASKS_LIST_SCRIPT,
      buildTasksListArgs({ status: 'available', limit: 10 }),
    );
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.tasks)).toBe(true);
    expect(data.tasks.length).toBeLessThanOrEqual(10);
  });

  it('tasks forecast returns valid JSON', async () => {
    const result = await runJxa(TASKS_FORECAST_SCRIPT, buildTasksForecastArgs({ days: 7 }));
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
    expect(data.days).toBe(7);
    expect(Array.isArray(data.overdue)).toBe(true);
    expect(Array.isArray(data.due)).toBe(true);
    expect(Array.isArray(data.deferred)).toBe(true);
  });

  it('perspectives list returns valid JSON', async () => {
    const result = await runJxa(buildPerspectivesListScript());
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.perspectiveNames)).toBe(true);
    expect(typeof data.totalCount).toBe('number');
  });

  it('projects list and --stalled return valid JSON', async () => {
    const all = JSON.parse((await runJxa(PROJECTS_LIST_SCRIPT, buildProjectsListArgs({}))).stdout);
    expect(all.success).toBe(true);
    expect(Array.isArray(all.projects)).toBe(true);

    const stalled = JSON.parse(
      (await runJxa(PROJECTS_LIST_SCRIPT, buildProjectsListArgs({ stalled: true }))).stdout,
    );
    expect(stalled.success).toBe(true);
    expect(Array.isArray(stalled.projects)).toBe(true);
  });

  it('review list returns valid JSON', async () => {
    const result = await runJxa(REVIEW_LIST_SCRIPT, buildReviewListArgs({}));
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
  });

  it('tags list returns valid JSON', async () => {
    const result = await runJxa(TAGS_LIST_SCRIPT, buildTagsListArgs({}));
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.tags)).toBe(true);
  });

  it('folders list returns valid JSON', async () => {
    const result = await runJxa(FOLDERS_LIST_SCRIPT, buildFoldersListArgs({}));
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.folders)).toBe(true);
  });

  it('task search returns valid JSON', async () => {
    const result = await runJxa(TASK_SEARCH_SCRIPT, buildTaskSearchArgs('a', { limit: 5 }));
    const data = JSON.parse(result.stdout);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.tasks)).toBe(true);
    expect(data.tasks.length).toBeLessThanOrEqual(5);
  });
});
