'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Project, App } from '@/lib/database';

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
  );

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.projectId as string);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateApp, setShowCreateApp] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [editingAppName, setEditingAppName] = useState('');

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (isNaN(projectId)) {
      router.push('/');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getProject(projectId.toString());
      if (response.success && response.data) {
        setProject(response.data);
      } else {
        setError(response.error || 'Failed to load project');
      }
    } catch (err) {
      setError('Failed to load project');
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const createApp = async () => {
    if (!newAppName.trim()) return;

    try {
      const response = await apiClient.createApp(projectId.toString(), newAppName.trim());
      if (response.success) {
        await loadProject();
        setNewAppName('');
        setShowCreateApp(false);
      } else {
        setError(response.error || 'Failed to create app');
      }
    } catch (err) {
      setError('Failed to create app');
      console.error('Error creating app:', err);
    }
  };

  const updateAppName = async (appId: number) => {
    if (!editingAppName.trim()) return;

    try {
      const response = await apiClient.updateApp(projectId.toString(), appId.toString(), { name: editingAppName.trim() });
      if (response.success) {
        await loadProject();
        setEditingAppId(null);
        setEditingAppName('');
      } else {
        setError(response.error || 'Failed to update app');
      }
    } catch (err) {
      setError('Failed to update app');
      console.error('Error updating app:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading project...</div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        </div>
    );
  }

  if (!project) {
    return (
        <div className="min-h-screen bg-gray-50 p-8 text-center">
            <p className="text-gray-800">Project not found.</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
            <Link href="/" className="text-blue-500 hover:underline">
                &larr; Back to Projects
            </Link>
            <h1 className="text-3xl font-bold text-gray-800 mt-2">{project.name}</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Apps</h2>
          <button
            onClick={() => setShowCreateApp(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            New App
          </button>
        </div>

        {showCreateApp && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-semibold mb-4">Create New App</h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="App name"
                className="flex-1 border border-gray-300 rounded px-3 py-2 placeholder-[#767676] text-[#767676]"
              />
              <button
                onClick={createApp}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateApp(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {project.apps?.map((app) => (
            <div key={app.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
             {editingAppId === app.id ? (
                <input
                  type="text"
                  value={editingAppName}
                  onChange={(e) => setEditingAppName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateAppName(app.id)}
                  onBlur={() => setEditingAppId(null)}
                  className="w-full border border-blue-300 rounded px-2 py-1 mb-2"
                  autoFocus
                />
              ) : (
                <div className="flex justify-between items-center">
                    <Link href={`/project/${projectId}/app/${app.id}`} className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {app.name}
                        </h3>
                    </Link>
                    <button 
                        onClick={() => {
                            setEditingAppId(app.id);
                            setEditingAppName(app.name);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                    >
                        <EditIcon />
                    </button>
                </div>
              )}
               <Link href={`/project/${projectId}/app/${app.id}`}>
                <p className="text-gray-800 cursor-pointer">
                    {app.strings?.length || 0} string{app.strings?.length !== 1 ? 's' : ''}
                </p>
              </Link>
            </div>
          ))}
        </div>

        {project.apps?.length === 0 && !showCreateApp && (
          <div className="text-center py-12">
            <p className="text-gray-800 mb-4">No apps yet</p>
            <button
              onClick={() => setShowCreateApp(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              Create Your First App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
