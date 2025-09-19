'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Project } from '@/lib/database';

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
  </svg>
);

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getProjects();
      if (response.success && response.data) {
        setProjects(response.data);
      } else {
        setError(response.error || 'Failed to load projects');
      }
    } catch (err) {
      setError('Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const response = await apiClient.createProject(newProjectName.trim());
      if (response.success && response.data) {
        await loadProjects(); // Reload projects
        setNewProjectName('');
        setShowCreateProject(false);
      } else {
        setError(response.error || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to create project');
      console.error('Error creating project:', err);
    }
  };

  const updateProjectName = async (projectId: number) => {
    if (!editingProjectName.trim()) return;

    try {
      const response = await apiClient.updateProject(projectId.toString(), editingProjectName.trim());
      if (response.success) {
        await loadProjects();
        setEditingProjectId(null);
        setEditingProjectName('');
      } else {
        setError(response.error || 'Failed to update project');
      }
    } catch (err) {
      setError('Failed to update project');
      console.error('Error updating project:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">String Manager (공유 버전)</h1>
          <button
            onClick={() => setShowCreateProject(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            New Project
          </button>
        </div>

        {showCreateProject && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="flex-1 border border-gray-300 rounded px-3 py-2 placeholder-[#767676] text-[#767676]"
              />
              <button
                onClick={createProject}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateProject(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              {editingProjectId === project.id ? (
                <input
                  type="text"
                  value={editingProjectName}
                  onChange={(e) => setEditingProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateProjectName(project.id)}
                  onBlur={() => setEditingProjectId(null)}
                  className="w-full border border-blue-300 rounded px-2 py-1"
                  autoFocus
                />
              ) : (
                <div className="flex justify-between items-center">
                  <Link href={`/project/${project.id}`} className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {project.name}
                    </h3>
                  </Link>
                  <button
                    onClick={() => {
                      setEditingProjectId(project.id);
                      setEditingProjectName(project.name);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <EditIcon />
                  </button>
                </div>
              )}
              <Link href={`/project/${project.id}`}>
                <p className="text-gray-800 cursor-pointer">
                  {project.apps?.length || 0} app{project.apps?.length !== 1 ? 's' : ''}
                </p>
              </Link>
            </div>
          ))}
        </div>

        {projects.length === 0 && !showCreateProject && (
          <div className="text-center py-12">
            <p className="text-gray-800 mb-4">No projects yet</p>
            <button
              onClick={() => setShowCreateProject(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              Create Your First Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
