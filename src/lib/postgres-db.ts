// PostgreSQL을 사용한 데이터베이스 (권장)
// Vercel Postgres 또는 다른 PostgreSQL 서비스 사용

import { sql } from '@vercel/postgres';
import { User, Project, App, StringItem, Version } from './database';

class PostgresDatabase {
  // User methods
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const result = await sql`
      INSERT INTO users (email, name, avatar_url, created_at, updated_at)
      VALUES (${userData.email}, ${userData.name}, ${userData.avatarUrl || null}, NOW(), NOW())
      RETURNING id, email, name, avatar_url, created_at, updated_at
    `;
    
    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      avatarUrl: result.rows[0].avatar_url,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await sql`
      SELECT id, email, name, avatar_url, created_at, updated_at
      FROM users WHERE email = ${email}
    `;
    
    if (result.rows.length === 0) return null;
    
    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      avatarUrl: result.rows[0].avatar_url,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
    };
  }

  // Project methods
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>, userId: number): Promise<Project> {
    const result = await sql`
      INSERT INTO projects (name, description, created_by, created_at, updated_at)
      VALUES (${projectData.name}, ${projectData.description || null}, ${userId}, NOW(), NOW())
      RETURNING id, name, description, created_by, created_at, updated_at
    `;
    
    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      createdBy: result.rows[0].created_by,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
    };
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    const result = await sql`
      SELECT id, name, description, created_by, created_at, updated_at
      FROM projects WHERE created_by = ${userId}
      ORDER BY created_at DESC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async getProject(projectId: number): Promise<Project | null> {
    const result = await sql`
      SELECT id, name, description, created_by, created_at, updated_at
      FROM projects WHERE id = ${projectId}
    `;
    
    if (result.rows.length === 0) return null;
    
    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      createdBy: result.rows[0].created_by,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
    };
  }

  async updateProject(projectId: number, projectData: Partial<Project>): Promise<Project | null> {
    const result = await sql`
      UPDATE projects 
      SET name = COALESCE(${projectData.name}, name),
          description = COALESCE(${projectData.description}, description),
          updated_at = NOW()
      WHERE id = ${projectId}
      RETURNING id, name, description, created_by, created_at, updated_at
    `;
    
    if (result.rows.length === 0) return null;
    
    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      createdBy: result.rows[0].created_by,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
    };
  }

  // App methods
  async createApp(appData: Omit<App, 'id' | 'createdAt' | 'updatedAt'>): Promise<App> {
    const result = await sql`
      INSERT INTO apps (project_id, name, current_version, columns, key_column, value_column, created_at, updated_at)
      VALUES (${appData.projectId}, ${appData.name}, ${appData.currentVersion}, ${JSON.stringify(appData.columns || [])}, ${appData.keyColumn || null}, ${appData.valueColumn || null}, NOW(), NOW())
      RETURNING id, project_id, name, current_version, columns, key_column, value_column, created_at, updated_at
    `;
    
    return {
      id: result.rows[0].id,
      projectId: result.rows[0].project_id,
      name: result.rows[0].name,
      currentVersion: result.rows[0].current_version,
      columns: result.rows[0].columns,
      keyColumn: result.rows[0].key_column,
      valueColumn: result.rows[0].value_column,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
    };
  }

  async getApp(appId: number): Promise<App | null> {
    const result = await sql`
      SELECT id, project_id, name, current_version, columns, key_column, value_column, created_at, updated_at
      FROM apps WHERE id = ${appId}
    `;
    
    if (result.rows.length === 0) return null;
    
    return {
      id: result.rows[0].id,
      projectId: result.rows[0].project_id,
      name: result.rows[0].name,
      currentVersion: result.rows[0].current_version,
      columns: result.rows[0].columns,
      keyColumn: result.rows[0].key_column,
      valueColumn: result.rows[0].value_column,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
    };
  }

  async getAppsByProject(projectId: number): Promise<App[]> {
    const result = await sql`
      SELECT id, project_id, name, current_version, columns, key_column, value_column, created_at, updated_at
      FROM apps WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      currentVersion: row.current_version,
      columns: row.columns,
      keyColumn: row.key_column,
      valueColumn: row.value_column,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async updateApp(appId: number, appData: Partial<App>): Promise<App | null> {
    const result = await sql`
      UPDATE apps 
      SET name = COALESCE(${appData.name}, name),
          current_version = COALESCE(${appData.currentVersion}, current_version),
          columns = COALESCE(${JSON.stringify(appData.columns || [])}, columns),
          key_column = COALESCE(${appData.keyColumn || null}, key_column),
          value_column = COALESCE(${appData.valueColumn || null}, value_column),
          updated_at = NOW()
      WHERE id = ${appId}
      RETURNING id, project_id, name, current_version, columns, key_column, value_column, created_at, updated_at
    `;
    
    if (result.rows.length === 0) return null;
    
    return {
      id: result.rows[0].id,
      projectId: result.rows[0].project_id,
      name: result.rows[0].name,
      currentVersion: result.rows[0].current_version,
      columns: result.rows[0].columns,
      keyColumn: result.rows[0].key_column,
      valueColumn: result.rows[0].value_column,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
    };
  }

  // String methods
  async createString(stringData: Omit<StringItem, 'id' | 'createdAt'>): Promise<StringItem> {
    const result = await sql`
      INSERT INTO string_items (app_id, key, value, additional_columns, status, modified_at, modified_by, created_at)
      VALUES (${stringData.appId}, ${stringData.key}, ${stringData.value}, ${JSON.stringify(stringData.additionalColumns || {})}, ${stringData.status || null}, ${stringData.modifiedAt || null}, ${stringData.modifiedBy || null}, NOW())
      RETURNING id, app_id, key, value, additional_columns, status, modified_at, modified_by, created_at
    `;
    
    return {
      id: result.rows[0].id,
      appId: result.rows[0].app_id,
      key: result.rows[0].key,
      value: result.rows[0].value,
      additionalColumns: result.rows[0].additional_columns,
      status: result.rows[0].status,
      modifiedAt: result.rows[0].modified_at ? new Date(result.rows[0].modified_at) : undefined,
      modifiedBy: result.rows[0].modified_by,
      createdAt: new Date(result.rows[0].created_at),
    };
  }

  async getStringsByApp(appId: number, page: number = 1, limit: number = 50): Promise<{ data: StringItem[], total: number }> {
    const offset = (page - 1) * limit;
    
    const [stringsResult, countResult] = await Promise.all([
      sql`
        SELECT id, app_id, key, value, additional_columns, status, modified_at, modified_by, created_at
        FROM string_items WHERE app_id = ${appId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`SELECT COUNT(*) as total FROM string_items WHERE app_id = ${appId}`
    ]);
    
    const data = stringsResult.rows.map(row => ({
      id: row.id,
      appId: row.app_id,
      key: row.key,
      value: row.value,
      additionalColumns: row.additional_columns,
      status: row.status,
      modifiedAt: row.modified_at ? new Date(row.modified_at) : undefined,
      modifiedBy: row.modified_by,
      createdAt: new Date(row.created_at),
    }));
    
    return {
      data,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async updateString(stringId: number, stringData: Partial<StringItem>): Promise<StringItem | null> {
    const result = await sql`
      UPDATE string_items 
      SET key = COALESCE(${stringData.key}, key),
          value = COALESCE(${stringData.value}, value),
          additional_columns = COALESCE(${JSON.stringify(stringData.additionalColumns || {})}, additional_columns),
          status = COALESCE(${stringData.status || null}, status),
          modified_at = COALESCE(${stringData.modifiedAt || null}, modified_at),
          modified_by = COALESCE(${stringData.modifiedBy || null}, modified_by)
      WHERE id = ${stringId}
      RETURNING id, app_id, key, value, additional_columns, status, modified_at, modified_by, created_at
    `;
    
    if (result.rows.length === 0) return null;
    
    return {
      id: result.rows[0].id,
      appId: result.rows[0].app_id,
      key: result.rows[0].key,
      value: result.rows[0].value,
      additionalColumns: result.rows[0].additional_columns,
      status: result.rows[0].status,
      modifiedAt: result.rows[0].modified_at ? new Date(result.rows[0].modified_at) : undefined,
      modifiedBy: result.rows[0].modified_by,
      createdAt: new Date(result.rows[0].created_at),
    };
  }

  async deleteString(stringId: number): Promise<boolean> {
    const result = await sql`DELETE FROM string_items WHERE id = ${stringId}`;
    return result.rowCount > 0;
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

    const result = await sql`
      INSERT INTO versions (app_id, version_number, publisher_id, publisher_name, notes, strings_snapshot, notifications, published_at)
      VALUES (${appId}, ${nextVersionNumber}, ${versionData.publisherId}, ${versionData.publisherName || null}, ${versionData.notes || null}, ${JSON.stringify(stringsData.data)}, ${JSON.stringify(notifications)}, NOW())
      RETURNING id, app_id, version_number, publisher_id, publisher_name, notes, strings_snapshot, notifications, published_at
    `;

    const version = {
      id: result.rows[0].id,
      appId: result.rows[0].app_id,
      versionNumber: result.rows[0].version_number,
      publisherId: result.rows[0].publisher_id,
      publisherName: result.rows[0].publisher_name,
      notes: result.rows[0].notes,
      stringsSnapshot: result.rows[0].strings_snapshot,
      notifications: result.rows[0].notifications,
      publishedAt: new Date(result.rows[0].published_at),
    };

    // Update app version to next version
    await this.updateApp(appId, { currentVersion: nextVersionNumber + 1 });

    // Clear pending changes for this app (reset status)
    await sql`
      UPDATE string_items
      SET status = NULL, modified_at = NULL
      WHERE app_id = ${appId} AND (status = 'new' OR status = 'modified')
    `;

    console.log(`Published version ${nextVersionNumber} for app ${appId} with ${notifications.length} changes`);
    return version;
  }

  async getVersionsByApp(appId: number): Promise<Version[]> {
    const result = await sql`
      SELECT id, app_id, version_number, publisher_id, publisher_name, notes, strings_snapshot, notifications, published_at
      FROM versions WHERE app_id = ${appId}
      ORDER BY version_number DESC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      appId: row.app_id,
      versionNumber: row.version_number,
      publisherId: row.publisher_id,
      publisherName: row.publisher_name,
      notes: row.notes,
      stringsSnapshot: row.strings_snapshot,
      notifications: row.notifications,
      publishedAt: new Date(row.published_at),
    }));
  }

  async getVersion(versionId: number): Promise<Version | null> {
    const result = await sql`
      SELECT id, app_id, version_number, publisher_id, publisher_name, notes, strings_snapshot, notifications, published_at
      FROM versions WHERE id = ${versionId}
    `;
    
    if (result.rows.length === 0) return null;
    
    return {
      id: result.rows[0].id,
      appId: result.rows[0].app_id,
      versionNumber: result.rows[0].version_number,
      publisherId: result.rows[0].publisher_id,
      publisherName: result.rows[0].publisher_name,
      notes: result.rows[0].notes,
      stringsSnapshot: result.rows[0].strings_snapshot,
      notifications: result.rows[0].notifications,
      publishedAt: new Date(result.rows[0].published_at),
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

export const postgresDb = new PostgresDatabase();
