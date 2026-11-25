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
}

export interface TaskCompleteResult {
  id: string;
  name: string;
  completed: boolean;
}

export interface TaskAddOptions {
  project?: string;
  dueDate?: string;
  deferDate?: string;
  flagged?: boolean;
  note?: string;
  estimatedMinutes?: number;
  tags?: string[];
}

export interface TaskSearchOptions {
  project?: string;
  flagged?: boolean;
  limit?: number;
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
  tags: string[];
}

export interface ProjectAddOptions {
  dueDate?: string;
  deferDate?: string;
  flagged?: boolean;
  note?: string;
  sequential?: boolean;
  tags?: string[];
  folder?: string;
}

export interface ProjectsListOptions {
  status?: ProjectStatus;
  folder?: string;
}

export interface ProjectsShowOptions {
  name: string;
  detailed?: boolean;
  includeTasks?: boolean;
}

export interface TasksListResponse<T extends TaskBrief = TaskBrief> {
  success: true;
  tasks: T[];
  totalCount: number;
}

export interface SingleTaskResponse<T = TaskBrief> {
  success: true;
  task: T;
}

export interface PerspectivesListResponse {
  success: true;
  perspectiveNames: string[];
  totalCount: number;
}

export interface ProjectsListResponse {
  success: true;
  projects: ProjectBrief[];
  totalCount: number;
}

export interface SingleProjectResponse<P extends ProjectBrief = ProjectBrief> {
  success: true;
  project: P;
  tasks?: (TaskBrief | TaskDetail)[];
}

export type JxaSuccessResponse =
  | TasksListResponse<TaskBrief | TaskDetail>
  | SingleTaskResponse<TaskBrief | TaskCompleteResult>
  | PerspectivesListResponse
  | ProjectsListResponse
  | SingleProjectResponse<ProjectBrief | ProjectDetail>;

export interface JxaErrorResponse {
  success: false;
  error: string;
}

export type JxaResponse = JxaSuccessResponse | JxaErrorResponse;
