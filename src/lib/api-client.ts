// API client utilities for server communication

import { Project, App, StringItem, Version, ApiResponse, PaginatedResponse } from './database';

class ApiClient {
  private baseUrl = '';

  // Helper method for making API requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use text as error
          errorMessage = errorText || errorMessage;
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Project API methods
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return this.request<Project[]>('/projects');
  }

  async createProject(name: string): Promise<ApiResponse<Project>> {
    return this.request<Project>('/projects', { method: 'POST', body: JSON.stringify({ name }) });
  }

  async updateProject(projectId: string, name: string): Promise<ApiResponse<Project>> {
    return this.request<Project>(`/projects/${projectId}`, { method: 'PUT', body: JSON.stringify({ name }) });
  }

  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  // App methods
  async createApp(projectId: string, name: string): Promise<ApiResponse<App>> {
    return this.request<App>(`/projects/${projectId}/apps`, { method: 'POST', body: JSON.stringify({ name }) });
  }

  async getApp(projectId: string, appId: string): Promise<ApiResponse<App>> {
    return this.request<App>(`/projects/${projectId}/apps/${appId}`);
  }

  async updateApp(projectId: string, appId: string, data: Partial<App>): Promise<ApiResponse<App>> {
    return this.request<App>(`/projects/${projectId}/apps/${appId}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // String API methods
  async getStrings(projectId: number, appId: number, page: number = 1, limit: number = 50): Promise<ApiResponse<PaginatedResponse<StringItem>>> {
    return this.request<PaginatedResponse<StringItem>>(`/projects/${projectId}/apps/${appId}/strings?page=${page}&limit=${limit}`);
  }

  async createString(projectId: number, appId: number, stringData: Omit<StringItem, 'id' | 'createdAt'>): Promise<ApiResponse<StringItem>> {
    return this.request<StringItem>(`/projects/${projectId}/apps/${appId}/strings`, {
      method: 'POST',
      body: JSON.stringify(stringData),
    });
  }

  async updateString(projectId: number, appId: number, stringId: number, stringData: Partial<StringItem>): Promise<ApiResponse<StringItem>> {
    return this.request<StringItem>(`/projects/${projectId}/apps/${appId}/strings/${stringId}`, {
      method: 'PUT',
      body: JSON.stringify(stringData),
    });
  }

  async deleteString(projectId: number, appId: number, stringId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/projects/${projectId}/apps/${appId}/strings/${stringId}`, {
      method: 'DELETE',
    });
  }

  // Version API methods
  async publishVersion(
    projectId: number,
    appId: number,
    versionData: {
      versionNumber?: number;
      publisherName?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<Version>> {
    return this.request<Version>(`/projects/${projectId}/apps/${appId}/versions`, {
      method: 'POST',
      body: JSON.stringify(versionData),
    });
  }

  async getVersions(projectId: number, appId: number): Promise<ApiResponse<Version[]>> {
    return this.request<Version[]>(`/projects/${projectId}/apps/${appId}/versions`);
  }

  async getVersion(projectId: number, appId: number, versionId: number): Promise<ApiResponse<Version>> {
    return this.request<Version>(`/projects/${projectId}/apps/${appId}/versions/${versionId}`);
  }

  async getVersionWithSnapshot(projectId: number, appId: number, versionId: number): Promise<ApiResponse<Version>> {
    return this.request<Version>(`/projects/${projectId}/apps/${appId}/versions/${versionId}`);
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Helper hook for loading states
export function useApiState<T>() {
  return {
    loading: false,
    error: null as string | null,
    data: null as T | null,
  };
}