
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
}

export interface KeyResult {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  progress: number;
}

export type ObjectiveStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND';

export interface Objective {
  id: string;
  title: string;
  description: string;
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
  progress: number;
  status: KPIStatus;
  department: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedBy?: string;
  assignedByName?: string;
  linkedOKRId?: string;
  linkedOKRTitle?: string;
  startDate: string;
  endDate: string;
  quarter: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}
