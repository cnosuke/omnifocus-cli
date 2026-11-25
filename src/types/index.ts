export type TaskStatus =
  | 'available'
  | 'next'
  | 'blocked'
  | 'due-soon'
  | 'overdue'
  | 'completed'
  | 'dropped';

export type TaskFilterStatus =
  | 'available'
  | 'next'
  | 'blocked'
  | 'remaining'
  | 'completed'
  | 'dropped';

export const VALID_TASK_FILTER_STATUSES: readonly TaskFilterStatus[] = [
  'available',
  'next',
  'blocked',
  'remaining',
  'completed',
  'dropped',
];

export function parseTaskFilterStatus(status: string): TaskFilterStatus {
  if ((VALID_TASK_FILTER_STATUSES as readonly string[]).includes(status)) {
    return status as TaskFilterStatus;
  }
  throw new Error(
    `Invalid task status '${status}'. Must be one of: ${VALID_TASK_FILTER_STATUSES.join(', ')}`,
  );
}

export type RepetitionMethod = 'fixed' | 'due-date' | 'defer-until-date';

export const VALID_REPETITION_METHODS: readonly RepetitionMethod[] = [
  'fixed',
  'due-date',
  'defer-until-date',
];

export function parseRepetitionMethod(method: string): RepetitionMethod {
  if ((VALID_REPETITION_METHODS as readonly string[]).includes(method)) {
    return method as RepetitionMethod;
  }
  throw new Error(
    `Invalid repeat method '${method}'. Must be one of: ${VALID_REPETITION_METHODS.join(', ')}`,
  );
}

export interface RepetitionRuleInfo {
  ruleString: string;
  method: RepetitionMethod;
}

export type ReviewIntervalUnit = 'days' | 'weeks' | 'months' | 'years';

export interface ReviewInterval {
  steps: number;
  unit: ReviewIntervalUnit;
}

const REVIEW_UNIT_MAP: Record<string, ReviewIntervalUnit> = {
  d: 'days',
  w: 'weeks',
  m: 'months',
  y: 'years',
};

export function parseReviewInterval(input: string): ReviewInterval {
  const match = input.trim().match(/^(\d+)([dwmy])$/i);
  if (!match) {
    throw new Error(
      `Invalid review interval '${input}'. Expected format like '7d', '2w', '1m', or '1y'`,
    );
  }
  const steps = Number(match[1]);
  if (!Number.isInteger(steps) || steps <= 0) {
    throw new Error(`Invalid review interval '${input}'. Steps must be a positive integer`);
  }
  const unit = REVIEW_UNIT_MAP[match[2].toLowerCase()];
  return { steps, unit };
}

export interface TaskBrief {
  id: string;
  name: string;
  dueDate: string | null;
  flagged: boolean;
  completed: boolean;
}

export interface TaskDetail extends TaskBrief {
  note: string;
  deferDate: string | null;
  completionDate: string | null;
  estimatedMinutes: number | null;
  inInbox: boolean;
  tags: string[];
  projectName: string | null;
  taskStatus: TaskStatus;
  parentId: string | null;
  hasChildren: boolean;
  sequential: boolean;
  repetitionRule: RepetitionRuleInfo | null;
}

export interface TaskCompleteResult {
  id: string;
  name: string;
  completed: boolean;
}

export interface TaskDropResult {
  id: string;
  name: string;
  dropped: boolean;
}

export interface TaskDeleteResult {
  id: string;
  name: string;
}

export interface TaskAddOptions {
  project?: string;
  parentId?: string;
  dueDate?: string;
  deferDate?: string;
  flagged?: boolean;
  note?: string;
  estimatedMinutes?: number;
  tags?: string[];
  sequential?: boolean;
  repetitionRule?: RepetitionRuleInfo;
}

export interface TaskShowOptions {
  taskId: string;
  includeChildren?: boolean;
}

export interface TaskUpdateOptions {
  taskId: string;
  name?: string;
  note?: string;
  appendNote?: string;
  dueDate?: string | null;
  deferDate?: string | null;
  estimatedMinutes?: number | null;
  flagged?: boolean;
  sequential?: boolean;
  addTags?: string[];
  removeTags?: string[];
  clearTags?: boolean;
  moveToProject?: string;
  moveToParentId?: string;
  moveToInbox?: boolean;
  repetitionRule?: RepetitionRuleInfo | null;
}

export interface TaskDropOptions {
  taskId: string;
  allOccurrences?: boolean;
}

export interface TaskToProjectOptions {
  taskId: string;
  folder?: string;
}

export interface TaskSearchOptions {
  project?: string;
  flagged?: boolean;
  limit?: number;
}

export interface TasksListOptions {
  status?: TaskFilterStatus;
  tags?: string[];
  project?: string;
  flagged?: boolean;
  maxEstimate?: number;
  dueBefore?: string;
  deferBefore?: string;
  completedSince?: string;
  detailed?: boolean;
  limit?: number;
}

export interface TasksForecastOptions {
  days?: number;
}

export type ProjectStatus = 'active' | 'on-hold' | 'done' | 'dropped';

export const VALID_PROJECT_STATUSES: readonly ProjectStatus[] = [
  'active',
  'on-hold',
  'done',
  'dropped',
];

export function parseProjectStatus(status: string): ProjectStatus {
  if ((VALID_PROJECT_STATUSES as readonly string[]).includes(status)) {
    return status as ProjectStatus;
  }
  throw new Error(
    `Invalid status '${status}'. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`,
  );
}

export type ReviewProjectStatus = 'active' | 'on-hold';

export const VALID_REVIEW_STATUSES: readonly ReviewProjectStatus[] = ['active', 'on-hold'];

export function parseReviewStatus(status: string): ReviewProjectStatus {
  if ((VALID_REVIEW_STATUSES as readonly string[]).includes(status)) {
    return status as ReviewProjectStatus;
  }
  throw new Error(
    `Invalid review status '${status}'. Must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`,
  );
}

export interface ProjectBrief {
  id: string;
  name: string;
  status: ProjectStatus;
  dueDate: string | null;
  deferDate: string | null;
  flagged: boolean;
  taskCount: number;
  folderName: string | null;
}

export interface ProjectDetail extends ProjectBrief {
  note: string;
  completionDate: string | null;
  estimatedMinutes: number | null;
  sequential: boolean;
  singleActions: boolean;
  tags: string[];
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  reviewInterval: ReviewInterval | null;
  nextTask: { id: string; name: string } | null;
}

export interface ProjectAddOptions {
  dueDate?: string;
  deferDate?: string;
  flagged?: boolean;
  note?: string;
  sequential?: boolean;
  singleActions?: boolean;
  tags?: string[];
  folder?: string;
  reviewInterval?: ReviewInterval;
}

export interface ProjectUpdateOptions {
  name: string;
  newName?: string;
  note?: string;
  appendNote?: string;
  dueDate?: string | null;
  deferDate?: string | null;
  flagged?: boolean;
  sequential?: boolean;
  singleActions?: boolean;
  addTags?: string[];
  removeTags?: string[];
  clearTags?: boolean;
  folder?: string;
  topLevel?: boolean;
  reviewInterval?: ReviewInterval;
  nextReviewDate?: string;
}

export interface ProjectsListOptions {
  status?: ProjectStatus;
  folder?: string;
  stalled?: boolean;
  limit?: number;
}

export interface ProjectsShowOptions {
  name: string;
  detailed?: boolean;
  includeTasks?: boolean;
}

export interface ReviewListOptions {
  status?: ReviewProjectStatus;
}

export type TagStatus = 'active' | 'on-hold' | 'dropped';

export const VALID_TAG_STATUSES: readonly TagStatus[] = ['active', 'on-hold', 'dropped'];

export function parseTagStatus(status: string): TagStatus {
  if ((VALID_TAG_STATUSES as readonly string[]).includes(status)) {
    return status as TagStatus;
  }
  throw new Error(
    `Invalid tag status '${status}'. Must be one of: ${VALID_TAG_STATUSES.join(', ')}`,
  );
}

export interface TagInfo {
  id: string;
  name: string;
  status: TagStatus;
  parentName: string | null;
  allowsNextAction: boolean;
  availableTaskCount: number;
  remainingTaskCount: number;
}

export interface TagsListOptions {
  status?: TagStatus;
}

export interface TagAddOptions {
  parent?: string;
  onHold?: boolean;
}

export type FolderStatus = 'active' | 'dropped';

export const VALID_FOLDER_STATUSES: readonly FolderStatus[] = ['active', 'dropped'];

export function parseFolderStatus(status: string): FolderStatus {
  if ((VALID_FOLDER_STATUSES as readonly string[]).includes(status)) {
    return status as FolderStatus;
  }
  throw new Error(
    `Invalid folder status '${status}'. Must be one of: ${VALID_FOLDER_STATUSES.join(', ')}`,
  );
}

export interface FolderInfo {
  id: string;
  name: string;
  status: FolderStatus;
  parentName: string | null;
  projectCount: number;
}

export interface FoldersListOptions {
  status?: FolderStatus;
}

export interface FolderAddOptions {
  parent?: string;
}

export interface TasksListResponse<T extends TaskBrief = TaskBrief> {
  success: true;
  tasks: T[];
  totalCount: number;
}

export interface TasksForecastResponse {
  success: true;
  days: number;
  overdue: TaskBrief[];
  due: TaskBrief[];
  deferred: TaskBrief[];
}

export interface SingleTaskResponse<T = TaskBrief> {
  success: true;
  task: T;
}

export interface TaskShowResponse {
  success: true;
  task: TaskDetail;
  children?: TaskBrief[];
}

export interface TaskDeleteResponse {
  success: true;
  deleted: TaskDeleteResult;
}

export interface PerspectivesListResponse {
  success: true;
  perspectiveNames: string[];
  totalCount: number;
}

export interface ProjectsListResponse<P extends ProjectBrief = ProjectBrief> {
  success: true;
  projects: P[];
  totalCount: number;
}

export interface SingleProjectResponse<P extends ProjectBrief = ProjectBrief> {
  success: true;
  project: P;
  tasks?: (TaskBrief | TaskDetail)[];
}

export interface TagsListResponse {
  success: true;
  tags: TagInfo[];
  totalCount: number;
}

export interface SingleTagResponse {
  success: true;
  tag: TagInfo;
}

export interface FoldersListResponse {
  success: true;
  folders: FolderInfo[];
  totalCount: number;
}

export interface SingleFolderResponse {
  success: true;
  folder: FolderInfo;
}

export type JxaSuccessResponse =
  | TasksListResponse<TaskBrief | TaskDetail>
  | TasksForecastResponse
  | SingleTaskResponse<TaskBrief | TaskDetail | TaskCompleteResult | TaskDropResult>
  | TaskShowResponse
  | TaskDeleteResponse
  | PerspectivesListResponse
  | ProjectsListResponse<ProjectBrief | ProjectDetail>
  | SingleProjectResponse<ProjectBrief | ProjectDetail>
  | TagsListResponse
  | SingleTagResponse
  | FoldersListResponse
  | SingleFolderResponse;

export interface JxaErrorResponse {
  success: false;
  error: string;
}

export type JxaResponse = JxaSuccessResponse | JxaErrorResponse;
