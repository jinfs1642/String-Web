'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Project, App, Version } from '@/lib/database';
import { apiClient } from '@/lib/api-client';

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.projectId as string);
  const appId = parseInt(params.appId as string);

  const [project, setProject] = useState<Project | null>(null);
  const [app, setApp] = useState<App | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (isNaN(projectId) || isNaN(appId)) {
        router.push('/');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Load project info
        const projectResponse = await apiClient.getProject(projectId.toString());
        if (projectResponse.success && projectResponse.data) {
          setProject(projectResponse.data);
        } else {
          setError('Project not found');
          setTimeout(() => router.push('/'), 1500);
          return;
        }

        // Load app info
        const appResponse = await apiClient.getApp(projectId.toString(), appId.toString());
        if (appResponse.success && appResponse.data) {
          setApp(appResponse.data);
        } else {
          setError('App not found');
          setTimeout(() => router.push(`/project/${projectId}`), 1500);
          return;
        }

        // Load version history
        const versionsResponse = await apiClient.getVersions(projectId, appId);
        if (versionsResponse.success && versionsResponse.data) {
          setVersions(versionsResponse.data);
          console.log('History page - Versions loaded:', versionsResponse.data.length);
        } else {
          console.log('No versions found or failed to load versions');
          setVersions([]);
        }
      } catch (err) {
        setError('Failed to load data');
        setTimeout(() => router.push('/'), 1500);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, appId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-800">Loading history...</div>
      </div>
    );
  }

  if (error || !project || !app) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || 'Failed to load data'}</div>
          <Link href="/" className="text-blue-500 hover:text-blue-600">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const selectedVersionData = selectedVersion
    ? versions.find(v => v.id === selectedVersion)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-blue-500 hover:text-blue-600">
            Projects
          </Link>
          <span className="text-gray-700">/</span>
          <Link href={`/project/${projectId}`} className="text-blue-500 hover:text-blue-600">
            {project.name}
          </Link>
          <span className="text-gray-700">/</span>
          <Link href={`/project/${projectId}/app/${appId}`} className="text-blue-500 hover:text-blue-600">
            {app.name}
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-900">History</span>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{app.name} - Version History</h1>
          <Link
            href={`/project/${projectId}/app/${appId}`}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Current Version
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Published Versions</h2>
            <div className="space-y-4">
              {versions.length === 0 && (
                <p className="text-gray-800">No published versions yet</p>
              )}
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedVersion === version.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedVersion(version.id)}
                >
                  <h3 className="font-semibold">Version {version.versionNumber}</h3>
                  <p className="text-sm text-gray-800">
                    {new Date(version.publishedAt).toLocaleString()}
                  </p>
                  {version.publisherName && (
                    <p className="text-sm text-gray-800">
                      발행인: {version.publisherName}
                    </p>
                  )}
                  <p className="text-sm text-gray-800">
                    {version.stringsSnapshot?.length || 0} strings
                  </p>
                  <p className="text-sm text-gray-800">
                    {version.notifications.length} changes
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedVersionData ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Version {selectedVersionData.versionNumber} Details
                  </h2>
                  <div className="text-gray-800 mb-4 space-y-2">
                    <p>Published: {new Date(selectedVersionData.publishedAt).toLocaleString()}</p>
                    {selectedVersionData.publisherName && (
                      <p>발행인: {selectedVersionData.publisherName}</p>
                    )}
                    {selectedVersionData.notes && (
                      <div>
                        <p className="font-medium">특이사항:</p>
                        <p className="bg-gray-50 p-2 rounded text-sm">{selectedVersionData.notes}</p>
                      </div>
                    )}
                  </div>

                  {selectedVersionData.notifications.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Changes in this version:</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-gray-200">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                              <th className="border border-gray-200 px-4 py-2 text-left">String #</th>
                              <th className="border border-gray-200 px-4 py-2 text-left">String ID</th>
                              <th className="border border-gray-200 px-4 py-2 text-left">Modified Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedVersionData.notifications.map((notification) => (
                              <tr key={notification.id}>
                                <td className="border border-gray-200 px-4 py-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    notification.status === 'New'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {notification.status}
                                  </span>
                                </td>
                                <td className="border border-gray-200 px-4 py-2">{notification.stringNumber}</td>
                                <td className="border border-gray-200 px-4 py-2">{notification.stringId}</td>
                                <td className="border border-gray-200 px-4 py-2">
                                  {new Date(notification.modifiedAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="font-semibold mb-4">All Strings in Version {selectedVersionData.versionNumber}</h3>
                  {selectedVersionData.stringsSnapshot && selectedVersionData.stringsSnapshot.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-4 py-2 text-left">#</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">String Key</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">String Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedVersionData.stringsSnapshot.map((string, index) => (
                            <tr key={string.id || index}>
                              <td className="border border-gray-200 px-4 py-2">{index + 1}</td>
                              <td className="border border-gray-200 px-4 py-2 text-gray-900">{string.key}</td>
                              <td className="border border-gray-200 px-4 py-2 text-gray-900">{string.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-800">
                      <p className="mb-2">String snapshot data is not available for this version.</p>
                      <p className="text-sm text-gray-800">
                        This version was published with a large number of strings.
                        Only change notifications are available to avoid performance issues.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-800 text-center">
                  Select a version from the left to view its details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}