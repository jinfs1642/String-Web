// Temporary in-memory database for immediate testing with persistence
// This will be replaced with actual database later

import { User, Project, App, StringItem, Version, ProjectMember, PendingChange } from './database';
import { promises as fs } from 'fs';
import path from 'path';

class MemoryDatabase {
  private users: Map<number, User> = new Map();
  private projects: Map<number, Project> = new Map();
  private apps: Map<number, App> = new Map();
  private strings: Map<number, StringItem> = new Map();
  private versions: Map<number, Version> = new Map();
  private projectMembers: Map<number, ProjectMember> = new Map();
  private pendingChanges: Map<number, PendingChange> = new Map();

  private nextUserId = 1;
  private nextProjectId = 1;
  private nextAppId = 1;
  private nextStringId = 1;
  private nextVersionId = 1;
  private nextMemberId = 1;
  private nextChangeId = 1;

  private dataPath = path.join(process.cwd(), 'data', 'memory-db.json');

  // Save data to file
  private async saveData(): Promise<void> {
    try {
      const data = {
        users: Array.from(this.users.entries()),
        projects: Array.from(this.projects.entries()),
        apps: Array.from(this.apps.entries()),
        strings: Array.from(this.strings.entries()),
        versions: Array.from(this.versions.entries()),
        projectMembers: Array.from(this.projectMembers.entries()),
        pendingChanges: Array.from(this.pendingChanges.entries()),
        counters: {
          nextUserId: this.nextUserId,
          nextProjectId: this.nextProjectId,
          nextAppId: this.nextAppId,
          nextStringId: this.nextStringId,
          nextVersionId: this.nextVersionId,
          nextMemberId: this.nextMemberId,
          nextChangeId: this.nextChangeId
        }
      };

      const dir = path.dirname(this.dataPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  // Load data from file
  private async loadData(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.dataPath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Restore maps
      this.users = new Map(data.users || []);
      this.projects = new Map(data.projects || []);
      this.apps = new Map(data.apps || []);
      this.strings = new Map(data.strings || []);
      this.versions = new Map(data.versions || []);
      this.projectMembers = new Map(data.projectMembers || []);
      this.pendingChanges = new Map(data.pendingChanges || []);

      // Restore counters
      if (data.counters) {
        this.nextUserId = data.counters.nextUserId || 1;
        this.nextProjectId = data.counters.nextProjectId || 1;
        this.nextAppId = data.counters.nextAppId || 1;
        this.nextStringId = data.counters.nextStringId || 1;
        this.nextVersionId = data.counters.nextVersionId || 1;
        this.nextMemberId = data.counters.nextMemberId || 1;
        this.nextChangeId = data.counters.nextChangeId || 1;
      }

      console.log('Data loaded successfully from file');
    } catch (error) {
      console.log('No existing data file found, starting fresh');
    }
  }

  // User methods
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const user: User = {
      ...userData,
      id: this.nextUserId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    this.saveData(); // Save after creation
    return user;
  }

  getUserByEmail(email: string): User | null {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  getUserById(id: number): User | null {
    return this.users.get(id) || null;
  }

  // Project methods
  createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Project {
    const project: Project = {
      ...projectData,
      id: this.nextProjectId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(project.id, project);

    // Add creator as owner
    this.addProjectMember(project.id, userId, 'owner');

    this.saveData(); // Save after creation
    return project;
  }

  getProjectsByUser(userId: number): Project[] {
    const userProjects: Project[] = [];
    for (const member of this.projectMembers.values()) {
      if (member.userId === userId) {
        const project = this.projects.get(member.projectId);
        if (project) {
          userProjects.push(project);
        }
      }
    }
    return userProjects;
  }

  getProject(projectId: number): Project | null {
    return this.projects.get(projectId) || null;
  }

  updateProject(projectId: number, projectData: Partial<Project>): Project | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const updatedProject = { ...project, ...projectData, updatedAt: new Date() };
    this.projects.set(projectId, updatedProject);
    this.saveData(); // Save after update
    return updatedProject;
  }

  // Project member methods
  addProjectMember(projectId: number, userId: number, role: 'owner' | 'admin' | 'member' | 'viewer'): ProjectMember {
    const member: ProjectMember = {
      id: this.nextMemberId++,
      projectId,
      userId,
      role,
      createdAt: new Date(),
    };
    this.projectMembers.set(member.id, member);
    this.saveData(); // Save after adding member
    return member;
  }

  hasProjectAccess(projectId: number, userId: number, minRole: string = 'viewer'): boolean {
    for (const member of this.projectMembers.values()) {
      if (member.projectId === projectId && member.userId === userId) {
        return this.checkRolePermission(member.role, minRole);
      }
    }
    return false;
  }

  private checkRolePermission(userRole: string, minRole: string): boolean {
    const roleHierarchy = { viewer: 1, member: 2, admin: 3, owner: 4 };
    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const minLevel = roleHierarchy[minRole as keyof typeof roleHierarchy] || 0;
    return userLevel >= minLevel;
  }

  // App methods
  createApp(appData: Omit<App, 'id' | 'createdAt' | 'updatedAt'>): App {
    const app: App = {
      ...appData,
      id: this.nextAppId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.apps.set(app.id, app);
    this.saveData(); // Save after creation
    return app;
  }

  getApp(appId: number): App | null {
    return this.apps.get(appId) || null;
  }

  getAppsByProject(projectId: number): App[] {
    const projectApps: App[] = [];
    for (const app of this.apps.values()) {
      if (app.projectId === projectId) {
        projectApps.push(app);
      }
    }
    return projectApps;
  }

  updateApp(appId: number, appData: Partial<App>): App | null {
    const app = this.apps.get(appId);
    if (!app) return null;

    const updatedApp = { ...app, ...appData, updatedAt: new Date() };
    this.apps.set(appId, updatedApp);
    this.saveData(); // Save after update
    return updatedApp;
  }

  hasAppAccess(appId: number, userId: number, minRole: string = 'viewer'): boolean {
    const app = this.getApp(appId);
    if (!app) return false;
    return this.hasProjectAccess(app.projectId, userId, minRole);
  }

  // String methods
  createString(stringData: Omit<StringItem, 'id' | 'createdAt'>): StringItem {
    const string: StringItem = {
      ...stringData,
      id: this.nextStringId++,
      createdAt: new Date(),
    };
    this.strings.set(string.id, string);
    this.saveData(); // Save after creation
    return string;
  }

  getStringsByApp(appId: number, page: number = 1, limit: number = 50): { data: StringItem[], total: number } {
    const appStrings: StringItem[] = [];
    for (const string of this.strings.values()) {
      if (string.appId === appId) {
        appStrings.push(string);
      }
    }

    const total = appStrings.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = appStrings.slice(start, end);

    return { data, total };
  }

  updateString(stringId: number, stringData: Partial<StringItem>): StringItem | null {
    const string = this.strings.get(stringId);
    if (!string) return null;

    const updatedString = { ...string, ...stringData };
    this.strings.set(stringId, updatedString);
    this.saveData(); // Save after update
    return updatedString;
  }

  deleteString(stringId: number): boolean {
    const deleted = this.strings.delete(stringId);
    if (deleted) {
      this.saveData(); // Save after deletion
    }
    return deleted;
  }

  // Version methods
  publishVersion(appId: number, versionData: {
    versionNumber?: number;
    publisherId: number;
    publisherName?: string;
    notes?: string;
  }): Version | null {
    const app = this.getApp(appId);
    if (!app) return null;

    // Get all strings for this app
    const appStrings = this.getStringsByApp(appId, 1, 10000).data;

    // Calculate the next version number
    const nextVersionNumber = versionData.versionNumber || app.currentVersion;

    // Create notifications from pending changes (strings with status 'new' or 'modified')
    console.log('All app strings:', appStrings.length);
    console.log('Strings with status:', appStrings.map(s => ({ id: s.id, key: s.key, status: s.status })));

    const pendingStrings = appStrings.filter(str => str.status === 'new' || str.status === 'modified');
    console.log('Pending strings found:', pendingStrings.length, pendingStrings.map(s => ({ id: s.id, key: s.key, status: s.status })));

    const notifications = pendingStrings.map((str, index) => ({
        id: `${str.id}-${Date.now()}-${index}`,
        status: str.status === 'new' ? 'New' : 'Modified',
        stringNumber: parseInt(str.key) || index + 1,
        stringId: str.id.toString(),
        modifiedAt: str.modifiedAt || new Date()
      }));

    console.log('Created notifications:', notifications.length);

    const version: Version = {
      id: this.nextVersionId++,
      appId,
      versionNumber: nextVersionNumber,
      publisherId: versionData.publisherId,
      publisherName: versionData.publisherName,
      notes: versionData.notes,
      stringsSnapshot: appStrings,
      notifications: notifications,
      publishedAt: new Date(),
    };

    this.versions.set(version.id, version);

    // Update app version to next version
    this.updateApp(appId, { currentVersion: nextVersionNumber + 1 });

    // Clear pending changes for this app (reset status)
    for (const [stringId, string] of this.strings.entries()) {
      if (string.appId === appId && (string.status === 'new' || string.status === 'modified')) {
        const { status, modifiedAt, ...cleanedString } = string;
        this.strings.set(stringId, cleanedString);
      }
    }
    this.saveData(); // Save after clearing status

    console.log(`Published version ${nextVersionNumber} for app ${appId} with ${notifications.length} changes`);
    return version;
  }

  getVersionsByApp(appId: number): Version[] {
    const versions: Version[] = [];
    for (const version of this.versions.values()) {
      if (version.appId === appId) {
        versions.push(version);
      }
    }
    return versions.sort((a, b) => a.versionNumber - b.versionNumber);
  }

  getVersion(versionId: number): Version | null {
    return this.versions.get(versionId) || null;
  }

  // Initialize database (load existing data or create sample data)
  async initializeSampleData(): Promise<void> {
    // First try to load existing data
    await this.loadData();

    // Check if already initialized (any user exists)
    if (this.users.size > 0) {
      console.log('Using existing data from file');
      return;
    }

    console.log('Creating new sample data with user: admin@example.com');

    // Create sample user
    const user = this.createUser({
      email: 'admin@example.com',
      name: 'Admin User',
      avatarUrl: 'https://github.com/identicons/admin.png',
    });

    // Create sample project
    const project = this.createProject({
      name: '샘플 프로젝트',
      description: '개발 및 테스트용 샘플 프로젝트',
      createdBy: user.id,
    }, user.id);

    // Create sample app
    const app = this.createApp({
      projectId: project.id,
      name: '메인 앱',
      currentVersion: 1,
      columns: ['No', 'String ID (Key)', 'Korean', 'English', 'Status'],
      keyColumn: 'String ID (Key)',
      valueColumn: 'Korean',
    });

    // Create sample strings
    this.createString({
      appId: app.id,
      key: 'welcome_message',
      value: '환영합니다!',
      additionalColumns: {
        'No': '1',
        'English': 'Welcome!',
        'Status': 'Active'
      },
      modifiedBy: user.id,
    });

    this.createString({
      appId: app.id,
      key: 'goodbye_message',
      value: '안녕히 가세요!',
      additionalColumns: {
        'No': '2',
        'English': 'Goodbye!',
        'Status': 'Active'
      },
      modifiedBy: user.id,
    });

    console.log('Sample data initialized with user:', user.email);
  }
}

// Singleton instance
export const memoryDb = new MemoryDatabase();