export interface StringItem {
  id: string;
  key: string;
  value: string;
  status?: 'new' | 'modified';
  modifiedAt?: Date;
  additionalColumns?: { [key: string]: any };
}

export interface NotificationItem {
  id: string;
  status: 'New' | 'Modified';
  stringNumber: number;
  stringId: string;
  modifiedAt: Date;
}

export interface Version {
  id: string;
  version: number;
  strings: StringItem[];
  notifications: NotificationItem[];
  publishedAt: Date;
  publisher?: string;
  notes?: string;
}

export interface App {
  id: string;
  name: string;
  strings: StringItem[];
  notifications: NotificationItem[];
  history: Version[];
  currentVersion: number;
  columns?: string[];
  keyColumn?: string;
  valueColumn?: string;
}

export interface Project {
  id: string;
  name: string;
  apps: App[];
}

export class LocalStorage {
  private static STORAGE_KEY = 'string-manager-data';
  private static HISTORY_KEY_PREFIX = 'string-manager-history-';
  private static MAX_HISTORY_VERSIONS = 3; // 최대 3개 버전만 유지 (대용량 데이터 고려)

  static getProjects(): Project[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const projects = data ? JSON.parse(data) : [];

      // 각 앱의 히스토리를 별도 저장소에서 로드
      projects.forEach((project: Project) => {
        project.apps.forEach((app: App) => {
          app.history = this.getAppHistory(project.id, app.id);
        });
      });

      return projects;
    } catch (e) {
      console.error('Error loading projects:', e);
      return [];
    }
  }

  static saveProjects(projects: Project[]): void {
    try {
      // 히스토리를 별도 저장소로 분리하여 메인 데이터 압축
      const projectsWithoutHistory = projects.map(project => ({
        ...project,
        apps: project.apps.map(app => ({
          ...app,
          history: [] // 메인 저장소에서는 히스토리 제거
        }))
      }));

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projectsWithoutHistory));
    } catch (e) {
      if (e instanceof DOMException && e.code === 22) {
        // QuotaExceededError 처리
        this.handleQuotaExceeded();
        throw new Error('Storage quota exceeded. Please clear some data or export your strings.');
      }
      throw e;
    }
  }

  private static handleQuotaExceeded(): void {
    // 오래된 히스토리 데이터 정리
    const keys = Object.keys(localStorage);
    const historyKeys = keys.filter(key => key.startsWith(this.HISTORY_KEY_PREFIX));

    // 오래된 히스토리부터 삭제
    historyKeys.sort().slice(0, Math.max(0, historyKeys.length - this.MAX_HISTORY_VERSIONS))
      .forEach(key => localStorage.removeItem(key));
  }

  private static cleanupOldHistory(projectId: string | number, appId: string | number): void {
    const keys = Object.keys(localStorage);
    const historyPrefix = `${this.HISTORY_KEY_PREFIX}${projectId}-${appId}-`;
    const appHistoryKeys = keys.filter(key => key.startsWith(historyPrefix));

    // 현재 앱의 히스토리가 MAX_HISTORY_VERSIONS를 초과하면 오래된 것부터 삭제
    if (appHistoryKeys.length >= this.MAX_HISTORY_VERSIONS) {
      const keysToDelete = appHistoryKeys.sort().slice(0, appHistoryKeys.length - this.MAX_HISTORY_VERSIONS + 1);
      keysToDelete.forEach(key => {
        localStorage.removeItem(key);
        console.log('Removed old history:', key);
      });
    }
  }

  private static forceCleanupHistory(projectId: string | number, appId: string | number): void {
    const keys = Object.keys(localStorage);
    const allHistoryKeys = keys.filter(key => key.startsWith(this.HISTORY_KEY_PREFIX));

    // 매우 강력한 정리: 모든 히스토리 삭제 (대용량 데이터용)
    allHistoryKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('Force removed all history:', key);
    });

    console.log(`Removed ${allHistoryKeys.length} history entries to free up space`);

    // 추가로 메인 데이터도 압축
    try {
      const projects = this.getProjects();
      projects.forEach(project => {
        project.apps.forEach(app => {
          app.history = []; // 모든 히스토리 참조 제거
        });
      });
      this.saveProjects(projects);
    } catch (e) {
      console.warn('Failed to compress main data:', e);
    }
  }

  static createProject(name: string): Project {
    const project: Project = {
      id: Date.now().toString(),
      name,
      apps: []
    };

    const projects = this.getProjects();
    projects.push(project);
    this.saveProjects(projects);
    return project;
  }

  static createApp(projectId: string, name: string): App {
    const app: App = {
      id: Date.now().toString(),
      name,
      strings: [],
      notifications: [],
      history: [],
      currentVersion: 1
    };

    const projects = this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      project.apps.push(app);
      this.saveProjects(projects);
    }
    return app;
  }

  static updateApp(projectId: string | number, appId: string | number, updatedApp: App): void {
    const projects = this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const appIndex = project.apps.findIndex(a => a.id === appId);
      if (appIndex !== -1) {
        project.apps[appIndex] = updatedApp;
        this.saveProjects(projects);
      }
    }
  }

  static publishVersion(projectId: string | number, appId: string | number, versionNumber?: number, publisher?: string, notes?: string): void {
    const projects = this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const app = project.apps.find(a => a.id === appId);
      if (app) {
        // 히스토리 저장 전에 기존 히스토리 정리
        this.cleanupOldHistory(projectId, appId);

        const finalVersion = versionNumber || app.currentVersion;
        const isLargeDataset = app.strings.length > 1600;

        // 소규모 데이터셋: 전체 스트링 저장, 대규모: 변경된 것만 저장
        const stringsToSave = isLargeDataset
          ? app.strings
              .filter(str => str.status === 'new' || str.status === 'modified')
              .map(str => ({
                i: str.id,           // id -> i (짧은 키)
                k: str.key,          // key -> k
                v: str.value,        // value -> v
                s: str.status,       // status -> s
                m: str.modifiedAt    // modifiedAt -> m
              }))
          : app.strings.map(str => ({
              id: str.id,
              key: str.key,
              value: str.value,
              status: str.status,
              modifiedAt: str.modifiedAt
              // additionalColumns는 제외하여 크기 절약
            }));

        const version: Version = {
          id: Date.now().toString(),
          version: finalVersion,
          strings: stringsToSave as any,
          notifications: app.notifications.map(n => ({
            id: n.id,
            status: n.status,
            stringNumber: n.stringNumber,
            stringId: n.stringId,
            modifiedAt: n.modifiedAt
          })),
          publishedAt: new Date(),
          publisher: publisher,
          notes: notes
        };

        // 대용량 데이터의 경우에도 변경사항이 있으면 히스토리 저장 시도
        const hasChanges = (isLargeDataset
          ? stringsToSave.length > 0
          : app.strings.some(str => str.status === 'new' || str.status === 'modified')
        ) || app.notifications.length > 0;

        if (!isLargeDataset || hasChanges) {
          // 히스토리를 별도 키로 저장
          const historyKey = `${this.HISTORY_KEY_PREFIX}${projectId}-${appId}-${version.id}`;
          try {
            localStorage.setItem(historyKey, JSON.stringify(version));
            console.log(`Saved history: ${stringsToSave.length} strings (${isLargeDataset ? 'changed only' : 'all'}), ${app.notifications.length} notifications`);
          } catch (e) {
            console.warn('Failed to save version history:', e);
            // 히스토리 저장 실패 시 더 강력한 정리 시도
            this.forceCleanupHistory(projectId, appId);
            try {
              localStorage.setItem(historyKey, JSON.stringify(version));
              console.log('Saved history after cleanup');
            } catch (e2) {
              console.error('Failed to save version history even after cleanup:', e2);
              if (isLargeDataset && !hasChanges) {
                console.log('Skipping history save for large dataset with no changes');
              } else {
                console.log('Could not save history for dataset with changes - storage quota exceeded');
              }
            }
          }
        } else {
          console.log('Skipping history save for large dataset with no changes (>1600 strings)');
        }

        // 모든 문자열 상태를 기본으로 리셋 (undefined/null로 설정)
        app.strings = app.strings.map(str => ({
          ...str,
          status: undefined,
          modifiedAt: undefined
        }));

        // 메인 데이터에서는 히스토리 참조만 저장
        app.history = this.getAppHistory(projectId, appId);
        app.notifications = [];
        app.currentVersion = versionNumber ? versionNumber + 1 : app.currentVersion + 1;

        this.saveProjects(projects);
      }
    }
  }

  static getAppHistory(projectId: string | number, appId: string | number): Version[] {
    const keys = Object.keys(localStorage);
    const historyPrefix = `${this.HISTORY_KEY_PREFIX}${projectId}-${appId}-`;
    const appHistoryKeys = keys.filter(key =>
      key.startsWith(historyPrefix)
    );

    console.log('History debug info:', {
      projectId,
      appId,
      historyPrefix,
      allKeys: keys.filter(k => k.includes('string-manager-history')),
      appHistoryKeys,
      totalKeys: keys.length
    });

    const versions: Version[] = [];
    appHistoryKeys.forEach(key => {
      try {
        const versionData = localStorage.getItem(key);
        if (versionData) {
          const version = JSON.parse(versionData);
          versions.push(version);
          console.log('Loaded version:', version.version, 'from key:', key);
        }
      } catch (e) {
        console.warn('Failed to load version:', key, e);
      }
    });

    // 버전 번호순으로 정렬
    const sortedVersions = versions.sort((a, b) => a.version - b.version);
    console.log('Final sorted versions:', sortedVersions);
    return sortedVersions;
  }

  // 수동으로 모든 히스토리를 정리하는 함수 (개발/디버깅용)
  static clearAllHistory(): void {
    const keys = Object.keys(localStorage);
    const historyKeys = keys.filter(key => key.startsWith(this.HISTORY_KEY_PREFIX));

    historyKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('Cleared history:', key);
    });

    console.log(`Cleared ${historyKeys.length} history entries`);
  }

  // localStorage 사용량 확인 함수
  static getStorageInfo(): { used: number, total: number, percentage: number, historyCount: number } {
    let used = 0;
    const keys = Object.keys(localStorage);
    const historyKeys = keys.filter(key => key.startsWith(this.HISTORY_KEY_PREFIX));

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
    });

    const total = 5 * 1024 * 1024; // 5MB (대략적인 localStorage 제한)

    return {
      used,
      total,
      percentage: Math.round((used / total) * 100),
      historyCount: historyKeys.length
    };
  }
}