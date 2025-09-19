// Database types and interfaces for server-based storage

export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  members?: ProjectMember[];
  apps?: App[];
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: Date;
  user?: User;
}

export interface App {
  id: number;
  projectId: number;
  name: string;
  currentVersion: number;
  columns?: string[];
  keyColumn?: string;
  valueColumn?: string;
  createdAt: Date;
  updatedAt: Date;
  strings?: StringItem[];
  versions?: Version[];
}

export interface StringItem {
  id: number;
  appId: number;
  key: string;
  value: string;
  additionalColumns?: { [key: string]: any };
  status?: 'new' | 'modified';
  modifiedAt?: Date;
  modifiedBy?: number;
  createdAt: Date;
}

export interface Version {
  id: number;
  appId: number;
  versionNumber: number;
  publisherId?: number;
  publisherName?: string;
  notes?: string;
  stringsSnapshot: StringItem[];
  notifications: any[];
  publishedAt: Date;
}

export interface PendingChange {
  id: number;
  appId: number;
  stringId: number;
  changeType: 'new' | 'modified' | 'deleted';
  oldValue?: any;
  newValue?: any;
  changedBy: number;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Database service class
export class DatabaseService {
  // User methods
  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    // Implementation will be added with actual database connection
    throw new Error('Not implemented yet');
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    throw new Error('Not implemented yet');
  }

  // Project methods
  static async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    throw new Error('Not implemented yet');
  }

  static async getProjectsByUser(userId: number): Promise<Project[]> {
    throw new Error('Not implemented yet');
  }

  static async getProject(projectId: number, userId: number): Promise<Project | null> {
    throw new Error('Not implemented yet');
  }

  // App methods
  static async createApp(appData: Omit<App, 'id' | 'createdAt' | 'updatedAt'>): Promise<App> {
    throw new Error('Not implemented yet');
  }

  static async getApp(appId: number, userId: number): Promise<App | null> {
    throw new Error('Not implemented yet');
  }

  static async updateApp(appId: number, appData: Partial<App>, userId: number): Promise<App> {
    throw new Error('Not implemented yet');
  }

  // String methods
  static async getStrings(appId: number, page: number = 1, limit: number = 50): Promise<PaginatedResponse<StringItem>> {
    throw new Error('Not implemented yet');
  }

  static async createString(stringData: Omit<StringItem, 'id' | 'createdAt'>): Promise<StringItem> {
    throw new Error('Not implemented yet');
  }

  static async updateString(stringId: number, stringData: Partial<StringItem>, userId: number): Promise<StringItem> {
    throw new Error('Not implemented yet');
  }

  static async deleteString(stringId: number, userId: number): Promise<void> {
    throw new Error('Not implemented yet');
  }

  // Version methods
  static async publishVersion(
    appId: number,
    versionData: {
      versionNumber?: number;
      publisherId: number;
      publisherName?: string;
      notes?: string;
    }
  ): Promise<Version> {
    throw new Error('Not implemented yet');
  }

  static async getVersions(appId: number): Promise<Version[]> {
    throw new Error('Not implemented yet');
  }

  static async getVersion(versionId: number): Promise<Version | null> {
    throw new Error('Not implemented yet');
  }

  // Permission check methods
  static async hasProjectAccess(projectId: number, userId: number, minRole: string = 'viewer'): Promise<boolean> {
    throw new Error('Not implemented yet');
  }

  static async hasAppAccess(appId: number, userId: number, minRole: string = 'viewer'): Promise<boolean> {
    throw new Error('Not implemented yet');
  }
}