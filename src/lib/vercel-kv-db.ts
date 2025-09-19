// Vercel KV를 사용한 데이터베이스 (임시 해결책)
// 실제 프로덕션에서는 PostgreSQL 등을 사용해야 함

import { kv } from '@vercel/kv';
import { User, Project, App, StringItem, Version, ProjectMember } from './database';

class VercelKVDatabase {
  private async getData<T>(key: string): Promise<T | null> {
    try {
      const data = await kv.get(key);
      return data as T | null;
    } catch (error) {
      console.error(`Error getting data for key ${key}:`, error);
      return null;
    }
  }

  private async setData<T>(key: string, data: T): Promise<void> {
    try {
      await kv.set(key, data);
    } catch (error) {
      console.error(`Error setting data for key ${key}:`, error);
    }
  }

  // User methods
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const users = await this.getData<User[]>('users') || [];
    const user: User = {
      ...userData,
      id: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(user);
    await this.setData('users', users);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = await this.getData<User[]>('users') || [];
    return users.find(u => u.email === email) || null;
  }

  // Project methods
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<Project> {
    const projects = await this.getData<Project[]>('projects') || [];
    const project: Project = {
      ...projectData,
      id: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    projects.push(project);
    await this.setData('projects', projects);
    return project;
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    const projects = await this.getData<Project[]>('projects') || [];
    return projects.filter(p => p.createdBy === userId);
  }

  async getProject(projectId: number): Promise<Project | null> {
    const projects = await this.getData<Project[]>('projects') || [];
    return projects.find(p => p.id === projectId) || null;
  }

  async updateProject(projectId: number, projectData: Partial<Project>): Promise<Project | null> {
    const projects = await this.getData<Project[]>('projects') || [];
    const index = projects.findIndex(p => p.id === projectId);
    if (index === -1) return null;

    projects[index] = { ...projects[index], ...projectData, updatedAt: new Date() };
    await this.setData('projects', projects);
    return projects[index];
  }

  // App methods
  async createApp(appData: Omit<App, 'id' | 'createdAt' | 'updatedAt'>): Promise<App> {
    const apps = await this.getData<App[]>('apps') || [];
    const app: App = {
      ...appData,
      id: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    apps.push(app);
    await this.setData('apps', apps);
    return app;
  }

  async getApp(appId: number): Promise<App | null> {
    const apps = await this.getData<App[]>('apps') || [];
    return apps.find(a => a.id === appId) || null;
  }

  async getAppsByProject(projectId: number): Promise<App[]> {
    const apps = await this.getData<App[]>('apps') || [];
    return apps.filter(a => a.projectId === projectId);
  }

  async updateApp(appId: number, appData: Partial<App>): Promise<App | null> {
    const apps = await this.getData<App[]>('apps') || [];
    const index = apps.findIndex(a => a.id === appId);
    if (index === -1) return null;

    apps[index] = { ...apps[index], ...appData, updatedAt: new Date() };
    await this.setData('apps', apps);
    return apps[index];
  }

  // String methods
  async createString(stringData: Omit<StringItem, 'id' | 'createdAt'>): Promise<StringItem> {
    const strings = await this.getData<StringItem[]>('strings') || [];
    const string: StringItem = {
      ...stringData,
      id: Date.now(),
      createdAt: new Date(),
    };
    strings.push(string);
    await this.setData('strings', strings);
    return string;
  }

  async getStringsByApp(appId: number, page: number = 1, limit: number = 50): Promise<{ data: StringItem[], total: number }> {
    const strings = await this.getData<StringItem[]>('strings') || [];
    const appStrings = strings.filter(s => s.appId === appId);
    const total = appStrings.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = appStrings.slice(start, end);
    return { data, total };
  }

  async updateString(stringId: number, stringData: Partial<StringItem>): Promise<StringItem | null> {
    const strings = await this.getData<StringItem[]>('strings') || [];
    const index = strings.findIndex(s => s.id === stringId);
    if (index === -1) return null;

    strings[index] = { ...strings[index], ...stringData };
    await this.setData('strings', strings);
    return strings[index];
  }

  async deleteString(stringId: number): Promise<boolean> {
    const strings = await this.getData<StringItem[]>('strings') || [];
    const index = strings.findIndex(s => s.id === stringId);
    if (index === -1) return false;

    strings.splice(index, 1);
    await this.setData('strings', strings);
    return true;
  }

  // Version methods
  async publishVersion(appId: number, versionData: {
    versionNumber?: number;
    publisherId: number;
    publisherName?: string;
    notes?: string;
  }): Promise<Version | null> {
    const app = await this.getApp(appId);
    if (!app) return null;

    const strings = await this.getData<StringItem[]>('strings') || [];
    const appStrings = strings.filter(s => s.appId === appId);

    const version: Version = {
      id: Date.now(),
      appId,
      versionNumber: versionData.versionNumber || (app.currentVersion + 1),
      publisherId: versionData.publisherId,
      publisherName: versionData.publisherName,
      notes: versionData.notes,
      stringsSnapshot: appStrings,
      notifications: [],
      publishedAt: new Date(),
    };

    const versions = await this.getData<Version[]>('versions') || [];
    versions.push(version);
    await this.setData('versions', versions);

    // Update app version
    await this.updateApp(appId, { currentVersion: version.versionNumber + 1 });

    // Clear pending changes
    for (const string of appStrings) {
      if (string.status === 'new' || string.status === 'modified') {
        await this.updateString(string.id, { status: undefined, modifiedAt: undefined });
      }
    }

    return version;
  }

  async getVersionsByApp(appId: number): Promise<Version[]> {
    const versions = await this.getData<Version[]>('versions') || [];
    return versions.filter(v => v.appId === appId).sort((a, b) => a.versionNumber - b.versionNumber);
  }

  async getVersion(versionId: number): Promise<Version | null> {
    const versions = await this.getData<Version[]>('versions') || [];
    return versions.find(v => v.id === versionId) || null;
  }

  // Permission methods
  async hasProjectAccess(projectId: number, userId: number, minRole: string = 'viewer'): Promise<boolean> {
    const project = await this.getProject(projectId);
    return project ? project.createdBy === userId : false;
  }

  async hasAppAccess(appId: number, userId: number, minRole: string = 'viewer'): Promise<boolean> {
    const app = await this.getApp(appId);
    if (!app) return false;
    return this.hasProjectAccess(app.projectId, userId, minRole);
  }

  // Initialize sample data
  async initializeSampleData(): Promise<void> {
    const existingUser = await this.getUserByEmail('admin@example.com');
    if (existingUser) return;

    const user = await this.createUser({
      email: 'admin@example.com',
      name: 'Admin User',
      avatarUrl: 'https://github.com/identicons/admin.png',
    });

    const project = await this.createProject({
      name: '샘플 프로젝트',
      description: '개발 및 테스트용 샘플 프로젝트',
      createdBy: user.id,
    }, user.id);

    const app = await this.createApp({
      projectId: project.id,
      name: '메인 앱',
      currentVersion: 1,
      columns: ['No', 'String ID (Key)', 'Korean', 'English', 'Status'],
      keyColumn: 'String ID (Key)',
      valueColumn: 'Korean',
    });

    await this.createString({
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
  }
}

export const vercelKvDb = new VercelKVDatabase();
