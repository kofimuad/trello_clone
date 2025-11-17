// supabase/models.ts

// Auth/User related
export interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

// Organizations
export interface Organization {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface CreateOrganizationInput {
  name: string;
}

// Organization Members
export type OrganizationRole = 'owner' | 'member' | 'admin';

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: string;
}

export interface OrganizationMemberWithUser extends OrganizationMember {
  user?: User;
  organizations?: Organization;
}

// Boards
export interface Board {
  id: string;
  title: string;
  description: string | null;
  color: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBoardInput {
  title: string;
  description?: string | null;
  color: string;
  organization_id: string;
}

export interface UpdateBoardInput {
  title?: string;
  description?: string | null;
  color?: string;
}

// Sectional Columns (Lists)
export interface SectionalColumn {
  id: string;
  board_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface CreateSectionalColumnInput {
  board_id: string;
  title: string;
  sort_order?: number;
}

export interface UpdateSectionalColumnInput {
  title?: string;
  sort_order?: number;
}

// Tasks (Cards)
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  sectional_column_id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  due_date: string | null;
  priority: TaskPriority;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  sectional_column_id: string;
  title: string;
  description?: string | null;
  assignee?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  sort_order?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  assignee?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  sectional_column_id?: string; // for moving between lists
  sort_order?: number;
}

// Task Activity/History
export type TaskActivityAction = 'created' | 'updated' | 'moved' | 'deleted';

export interface TaskActivity {
  id: string;
  task_id: string;
  action: TaskActivityAction;
  changed_by: string;
  details: string | null; // JSON stringified describing what changed
  created_at: string;
}

export interface CreateTaskActivityInput {
  task_id: string;
  action: TaskActivityAction;
  changed_by: string;
  details?: string | null;
}

// Organization Invites (for the invite feature)
export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  token: string; // unique invite token
  role: OrganizationRole;
  created_by: string; // UUID of who sent the invite
  created_at: string;
  expires_at: string;
  accepted_at?: string | null; // null if not yet accepted
}

export interface CreateInviteInput {
  organization_id: string;
  email: string;
  role?: OrganizationRole;
}

// Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Board with nested data
export interface BoardWithLists extends Board {
  sectional_columns?: SectionalColumn[];
}

export interface BoardWithAllData extends Board {
  sectional_columns?: (SectionalColumn & {
    tasks?: Task[];
  })[];
}