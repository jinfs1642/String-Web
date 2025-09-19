// PostgreSQL을 사용한 데이터베이스 (권장)
// Vercel Postgres 또는 다른 PostgreSQL 서비스 사용

import { PrismaClient, StringStatus } from '@prisma/client';
import { User, Project, App, StringItem, Version } from './database';

const prisma = new PrismaClient();

// Helper functions for enum conversion
const stringStatusToPrisma = (status?: 'new' | 'modified'): StringStatus | null => {
  if (!status) return null;
  return status === 'new' ? StringStatus.NEW : StringStatus.MODIFIED;
};

const stringStatusFromPrisma = (status?: StringStatus | null): 'new' | 'modified' | undefined => {
  if (!status) return undefined;
  return status === StringStatus.NEW ? 'new' : 'modified';
};

class PostgresDatabase {
  // User methods
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.avatarUrl || null
      }
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Project methods
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        name: projectData.name,
        description: projectData.description || null,
        createdBy: userId,
      }
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' }
    });

    return projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));
  }

  async getProject(projectId: number): Promise<Project | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) return null;

    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async updateProject(projectId: number, projectData: Partial<Project>): Promise<Project | null> {
    try {
      const project = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...(projectData.name !== undefined && { name: projectData.name }),
          ...(projectData.description !== undefined && { description: projectData.description }),
        }
      });

      return {
        id: project.id,
        name: project.name,
        description: project.description || undefined,
        createdBy: project.createdBy,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    } catch (error) {
      return null;
    }
  }

  // App methods
  async createApp(appData: Omit<App, 'id' | 'createdAt' | 'updatedAt'>): Promise<App> {
    const app = await prisma.app.create({
      data: {
        projectId: appData.projectId,
        name: appData.name,
        currentVersion: appData.currentVersion,
        columns: appData.columns || [],
        keyColumn: appData.keyColumn || null,
        valueColumn: appData.valueColumn || null,
      }
    });

    return {
      id: app.id,
      projectId: app.projectId,
      name: app.name,
      currentVersion: app.currentVersion,
      columns: app.columns,
      keyColumn: app.keyColumn || undefined,
      valueColumn: app.valueColumn || undefined,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  async getApp(appId: number): Promise<App | null> {
    const app = await prisma.app.findUnique({
      where: { id: appId }
    });

    if (!app) return null;

    return {
      id: app.id,
      projectId: app.projectId,
      name: app.name,
      currentVersion: app.currentVersion,
      columns: app.columns,
      keyColumn: app.keyColumn || undefined,
      valueColumn: app.valueColumn || undefined,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  async getAppsByProject(projectId: number): Promise<App[]> {
    const apps = await prisma.app.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    return apps.map(app => ({
      id: app.id,
      projectId: app.projectId,
      name: app.name,
      currentVersion: app.currentVersion,
      columns: app.columns,
      keyColumn: app.keyColumn || undefined,
      valueColumn: app.valueColumn || undefined,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }));
  }

  async updateApp(appId: number, appData: Partial<App>): Promise<App | null> {
    try {
      const app = await prisma.app.update({
        where: { id: appId },
        data: {
          ...(appData.name !== undefined && { name: appData.name }),
          ...(appData.currentVersion !== undefined && { currentVersion: appData.currentVersion }),
          ...(appData.columns !== undefined && { columns: appData.columns }),
          ...(appData.keyColumn !== undefined && { keyColumn: appData.keyColumn }),
          ...(appData.valueColumn !== undefined && { valueColumn: appData.valueColumn }),
        }
      });

      return {
        id: app.id,
        projectId: app.projectId,
        name: app.name,
        currentVersion: app.currentVersion,
        columns: app.columns,
        keyColumn: app.keyColumn || undefined,
        valueColumn: app.valueColumn || undefined,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      };
    } catch (error) {
      return null;
    }
  }

  // String methods
  async createString(stringData: Omit<StringItem, 'id' | 'createdAt'>): Promise<StringItem> {
    const stringItem = await prisma.stringItem.create({
      data: {
        appId: stringData.appId,
        key: stringData.key,
        value: stringData.value,
        additionalColumns: stringData.additionalColumns || null,
        status: stringStatusToPrisma(stringData.status),
        modifiedAt: stringData.modifiedAt || null,
        modifiedBy: stringData.modifiedBy || null,
      }
    });

    return {
      id: stringItem.id,
      appId: stringItem.appId,
      key: stringItem.key,
      value: stringItem.value,
      additionalColumns: stringItem.additionalColumns as { [key: string]: string } | undefined,
      status: stringStatusFromPrisma(stringItem.status),
      modifiedAt: stringItem.modifiedAt || undefined,
      modifiedBy: stringItem.modifiedBy || undefined,
      createdAt: stringItem.createdAt,
    };
  }

  async getStringsByApp(appId: number, page: number = 1, limit: number = 50): Promise<{ data: StringItem[], total: number }> {
    const offset = (page - 1) * limit;

    const [stringItems, total] = await Promise.all([
      prisma.stringItem.findMany({
        where: { appId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.stringItem.count({
        where: { appId }
      })
    ]);

    const data = stringItems.map(stringItem => ({
      id: stringItem.id,
      appId: stringItem.appId,
      key: stringItem.key,
      value: stringItem.value,
      additionalColumns: stringItem.additionalColumns as { [key: string]: string } | undefined,
      status: stringStatusFromPrisma(stringItem.status),
      modifiedAt: stringItem.modifiedAt || undefined,
      modifiedBy: stringItem.modifiedBy || undefined,
      createdAt: stringItem.createdAt,
    }));

    return { data, total };
  }

  async updateString(stringId: number, stringData: Partial<StringItem>): Promise<StringItem | null> {
    try {
      const stringItem = await prisma.stringItem.update({
        where: { id: stringId },
        data: {
          ...(stringData.key !== undefined && { key: stringData.key }),
          ...(stringData.value !== undefined && { value: stringData.value }),
          ...(stringData.additionalColumns !== undefined && { additionalColumns: stringData.additionalColumns }),
          ...(stringData.status !== undefined && { status: stringStatusToPrisma(stringData.status) }),
          ...(stringData.modifiedAt !== undefined && { modifiedAt: stringData.modifiedAt }),
          ...(stringData.modifiedBy !== undefined && { modifiedBy: stringData.modifiedBy }),
        }
      });

      return {
        id: stringItem.id,
        appId: stringItem.appId,
        key: stringItem.key,
        value: stringItem.value,
        additionalColumns: stringItem.additionalColumns as { [key: string]: string } | undefined,
        status: stringStatusFromPrisma(stringItem.status),
        modifiedAt: stringItem.modifiedAt || undefined,
        modifiedBy: stringItem.modifiedBy || undefined,
        createdAt: stringItem.createdAt,
      };
    } catch (error) {
      return null;
    }
  }

  async deleteString(stringId: number): Promise<boolean> {
    try {
      await prisma.stringItem.delete({
        where: { id: stringId }
      });
      return true;
    } catch (error) {
      return false;
    }
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

    // Get all strings for this app
    const stringsData = await this.getStringsByApp(appId, 1, 10000);

    // Calculate the next version number
    const nextVersionNumber = versionData.versionNumber || app.currentVersion;

    // Create notifications from pending changes (strings with status 'new' or 'modified')
    console.log('All app strings:', stringsData.data.length);
    console.log('Strings with status:', stringsData.data.map(s => ({ id: s.id, key: s.key, status: s.status })));

    const pendingStrings = stringsData.data.filter(str => str.status === 'new' || str.status === 'modified');
    console.log('Pending strings found:', pendingStrings.length, pendingStrings.map(s => ({ id: s.id, key: s.key, status: s.status })));

    const notifications = pendingStrings.map((str, index) => ({
      id: `${str.id}-${Date.now()}-${index}`,
      status: str.status === 'new' ? 'New' : 'Modified',
      stringNumber: parseInt(str.key) || index + 1,
      stringId: str.id.toString(),
      modifiedAt: str.modifiedAt || new Date()
    }));

    console.log('Created notifications:', notifications.length);

    const version = await prisma.version.create({
      data: {
        appId,
        versionNumber: nextVersionNumber,
        publisherId: versionData.publisherId,
        publisherName: versionData.publisherName || null,
        notes: versionData.notes || null,
        stringsSnapshot: stringsData.data,
        notifications,
      }
    });

    const versionResult = {
      id: version.id,
      appId: version.appId,
      versionNumber: version.versionNumber,
      publisherId: version.publisherId || undefined,
      publisherName: version.publisherName || undefined,
      notes: version.notes || undefined,
      stringsSnapshot: version.stringsSnapshot as StringItem[],
      notifications: version.notifications as { id: string; status: string; stringNumber: number; stringId: string; modifiedAt: Date }[],
      publishedAt: version.publishedAt,
    };

    // Update app version to next version
    await this.updateApp(appId, { currentVersion: nextVersionNumber + 1 });

    // Clear pending changes for this app (reset status)
    await prisma.stringItem.updateMany({
      where: {
        appId,
        status: { in: [StringStatus.NEW, StringStatus.MODIFIED] }
      },
      data: {
        status: null,
        modifiedAt: null
      }
    });

    console.log(`Published version ${nextVersionNumber} for app ${appId} with ${notifications.length} changes`);
    return versionResult;
  }

  async getVersionsByApp(appId: number): Promise<Version[]> {
    const versions = await prisma.version.findMany({
      where: { appId },
      orderBy: { versionNumber: 'desc' }
    });

    return versions.map(version => ({
      id: version.id,
      appId: version.appId,
      versionNumber: version.versionNumber,
      publisherId: version.publisherId || undefined,
      publisherName: version.publisherName || undefined,
      notes: version.notes || undefined,
      stringsSnapshot: version.stringsSnapshot as StringItem[],
      notifications: version.notifications as { id: string; status: string; stringNumber: number; stringId: string; modifiedAt: Date }[],
      publishedAt: version.publishedAt,
    }));
  }

  async getVersion(versionId: number): Promise<Version | null> {
    const version = await prisma.version.findUnique({
      where: { id: versionId }
    });

    if (!version) return null;

    return {
      id: version.id,
      appId: version.appId,
      versionNumber: version.versionNumber,
      publisherId: version.publisherId || undefined,
      publisherName: version.publisherName || undefined,
      notes: version.notes || undefined,
      stringsSnapshot: version.stringsSnapshot as StringItem[],
      notifications: version.notifications as { id: string; status: string; stringNumber: number; stringId: string; modifiedAt: Date }[],
      publishedAt: version.publishedAt,
    };
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

  // Initialize sample data (only in development)
  async initializeSampleData(): Promise<void> {
    // Only run in development environment
    if (process.env.NODE_ENV === 'production') return;

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

  // Helper method to ensure database connection and get user (for production use)
  async ensureUserExists(email: string = 'admin@example.com'): Promise<User | null> {
    let user = await this.getUserByEmail(email);

    // If no user exists and we're in development, initialize sample data
    if (!user && process.env.NODE_ENV !== 'production') {
      await this.initializeSampleData();
      user = await this.getUserByEmail(email);
    }

    // In production, you should handle user authentication properly
    // For now, create a default admin user if none exists
    if (!user && process.env.NODE_ENV === 'production') {
      user = await this.createUser({
        email: email,
        name: 'Admin User',
        avatarUrl: undefined,
      });
    }

    return user;
  }
}

export const postgresDb = new PostgresDatabase();
