
export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  department: string;
  avatar: string;
  supervisorId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assigneeId: string;
  assigneeName: string;
  krId: string;
  krTitle: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  kpiId?: string;
}

export interface KeyResult {
  id?: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  weight?: number;
  progress: number;
  source?: 'MANUAL' | 'KPI' | 'TASK';
  linkedId?: string;
  confidenceScore?: number;
}

export type ObjectiveStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND';

export interface Objective {
  id: string;
  title: string;
  description: string;
  type?: 'COMPANY' | 'DEPARTMENT' | 'PERSONAL';
  parentId?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  tags?: string[];
  ownerId: string;
  ownerName: string;
  department: string;
  quarter: string;
  year: number;
  status: ObjectiveStatus;
  progress: number;
  keyResults: KeyResult[];
  createdAt: string;
}

export interface MyObjective {
  id: string;
  title: string;
  description?: string;
  type?: 'COMPANY' | 'DEPARTMENT' | 'PERSONAL';
  parentId?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  tags?: string[];
  ownerId: string;
  ownerName: string;
  department: string;
  quarter: string;
  year: number;
  status: string;
  keyResults: KeyResult[];
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  headId: string;
  memberCount: number;
}

export interface Period {
  quarter: string;
  year: number;
}

export type KPIType = 'DEPARTMENT' | 'PERSONAL';
export type KPIStatus = 'ACTIVE' | 'COMPLETED' | 'OVERDUE';

export interface KPI {
  id: string;
  title: string;
  description?: string;
  type: KPIType;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight?: number;
  progress: number;
  status: KPIStatus;
  department: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToDepartment?: string;
  assignedBy?: string;
  assignedByName?: string;
  linkedOKRId?: string;
  linkedOKRTitle?: string;
  linkedKRId?: string;
  linkedKRTitle?: string;
  linkedTaskId?: string;
  startDate: string;
  endDate: string;
  quarter: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}
