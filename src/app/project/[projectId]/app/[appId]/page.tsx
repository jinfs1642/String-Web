'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { Project, App, StringItem } from '@/lib/database';
import { apiClient } from '@/lib/api-client';

export default function AppPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.projectId as string);
  const appId = parseInt(params.appId as string);

  const [project, setProject] = useState<Project | null>(null);
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [csvImportStatus, setCsvImportStatus] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [editingValues, setEditingValues] = useState<{[key: string]: string}>({});
  const [publishData, setPublishData] = useState({
    version: '',
    publisher: '',
    notes: ''
  });

  // Pagination and filtering states
  const [pendingChangesPage, setPendingChangesPage] = useState(1);
  const [stringsPage, setStringsPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilter, setColumnFilter] = useState('');
  const ITEMS_PER_PAGE = 10;

  // Debounced update for Korean input
  const updateTimeouts = useRef<{[key: string]: NodeJS.Timeout}>({});

  const debouncedUpdateString = useCallback((stringId: number, field: string, value: string) => {
    const key = `${stringId}-${field}`;

    // Clear existing timeout
    if (updateTimeouts.current[key]) {
      clearTimeout(updateTimeouts.current[key]);
    }

    // Set new timeout
    updateTimeouts.current[key] = setTimeout(async () => {
      if (!app || !app.strings) return;

      const stringToUpdate = app.strings.find(str => str.id === stringId);
      if (!stringToUpdate) return;

      const isNewString = stringToUpdate.status === 'new';
      let updateData: Partial<StringItem>;

      if (field === 'key' || field === 'value') {
        updateData = {
          [field]: value,
          status: isNewString ? 'new' as const : 'modified' as const,
          modifiedAt: new Date()
        };
      } else {
        // additionalColumns 업데이트
        updateData = {
          additionalColumns: {
            ...stringToUpdate.additionalColumns,
            [field]: value
          },
          status: isNewString ? 'new' as const : 'modified' as const,
          modifiedAt: new Date()
        };
      }

      try {
        const response = await apiClient.updateString(projectId, appId, stringId, updateData);
        if (response.success && response.data) {
          // Update the local state
          const updatedStrings = app.strings.map(str =>
            str.id === stringId ? response.data! : str
          );
          setApp({
            ...app,
            strings: updatedStrings
          });
        } else {
          setError(response.error || 'Failed to update string');
        }
      } catch (err) {
        setError('Failed to update string');
      }

      delete updateTimeouts.current[key];
    }, 300); // 300ms delay
  }, [app, projectId, appId, setApp, setError]);

  useEffect(() => {
    const loadApp = async () => {
      if (isNaN(projectId) || isNaN(appId)) {
        router.push('/');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getApp(projectId.toString(), appId.toString());
        if (response.success && response.data) {
          setApp(response.data);
          setPublishData(prev => ({ ...prev, version: response.data!.currentVersion.toString() }));

          // Load project info separately
          const projectResponse = await apiClient.getProject(projectId.toString());
          if (projectResponse.success && projectResponse.data) {
            setProject(projectResponse.data);
          }
        } else {
          setError('App not found');
          setTimeout(() => router.push(`/project/${projectId}`), 1500);
        }
      } catch (error) {
        setError('Failed to load app');
        setTimeout(() => router.push('/'), 1500);
      } finally {
        setLoading(false);
      }
    };

    loadApp();
  }, [projectId, appId, router]);

  const addNewString = async () => {
    if (!app) return;

    // Find the highest numerical key
    const maxKey = (app.strings || []).reduce((max, str) => {
      const keyAsNum = parseInt(str.key, 10);
      if (!isNaN(keyAsNum) && keyAsNum > max) {
        return keyAsNum;
      }
      return max;
    }, 0);

    const newKey = (maxKey + 1).toString();

    const additionalColumns: { [key: string]: string } = {};
    if (app.columns) {
      app.columns.forEach(column => {
        if (column !== app.keyColumn && column !== app.valueColumn) {
          additionalColumns[column] = '';
        }
      });
    }

    const stringData = {
      appId: appId,
      key: newKey,
      value: 'New string value',
      status: 'new' as const,
      modifiedAt: new Date(),
      additionalColumns
    };

    try {
      const response = await apiClient.createString(projectId, appId, stringData);
      if (response.success && response.data) {
        // Add new string at the end of the list
        const updatedStrings = [...(app.strings || []), response.data];
        setApp({
          ...app,
          strings: updatedStrings
        });
      } else {
        setError(response.error || 'Failed to add string');
      }
    } catch (err) {
      setError('Failed to add string');
    }
  };

  const updateString = async (stringId: number, field: string, newValue: string) => {
    if (!app || !app.strings) return;

    const stringToUpdate = app.strings.find(str => str.id === stringId);
    if (!stringToUpdate) return;

    const isNewString = stringToUpdate.status === 'new';
    let updateData: Partial<StringItem>;

    if (field === 'key' || field === 'value') {
      updateData = {
        [field]: newValue,
        status: isNewString ? 'new' as const : 'modified' as const,
        modifiedAt: new Date()
      };
    } else {
      // additionalColumns 업데이트
      updateData = {
        additionalColumns: {
          ...stringToUpdate.additionalColumns,
          [field]: newValue
        },
        status: isNewString ? 'new' as const : 'modified' as const,
        modifiedAt: new Date()
      };
    }

    try {
      const response = await apiClient.updateString(projectId, appId, stringId, updateData);
      if (response.success && response.data) {
        // Update the local state
        const updatedStrings = app.strings.map(str =>
          str.id === stringId ? response.data! : str
        );
        setApp({
          ...app,
          strings: updatedStrings
        });
      } else {
        setError(response.error || 'Failed to update string');
      }
    } catch (err) {
      setError('Failed to update string');
    }
  };

  const handlePublishClick = () => {
    setShowPublishModal(true);
  };

  const handlePublishConfirm = async () => {
    if (!app) return;

    const versionNumber = parseInt(publishData.version) || app.currentVersion;

    try {
      const response = await apiClient.publishVersion(projectId, appId, {
        versionNumber,
        publisherName: publishData.publisher || undefined,
        notes: publishData.notes || undefined
      });

      if (response.success && response.data) {
        // Reload app to get updated version
        const appResponse = await apiClient.getApp(projectId.toString(), appId.toString());
        if (appResponse.success && appResponse.data) {
          setApp(appResponse.data);
          setPublishData({
            version: appResponse.data.currentVersion.toString(),
            publisher: '',
            notes: ''
          });
        }

        setShowPublishModal(false);
        alert(`버전 ${versionNumber}이 성공적으로 출시되었습니다!`);
      } else {
        setError(response.error || 'Failed to publish version');
      }
    } catch (err) {
      setError('Failed to publish version');
    }
  };

  const exportToCsv = () => {
    if (!app) return;

    // 검색/필터가 적용된 경우 필터된 데이터를, 아니면 전체 데이터를 내보냄
    const dataToExport = (searchTerm || columnFilter) ? filteredStrings : app.strings;

    const headers = app.columns && app.columns.length > 0
      ? ['#', ...app.columns, 'Status']
      : ['#', 'String Key', 'String Value', 'Status'];

    const csvData = [
      headers,
      ...(dataToExport || []).map((string, index) => {
        const row: (string | number)[] = [index + 1]; // 전체 리스트에서의 순서

        if (app.columns && app.columns.length > 0) {
          app.columns.forEach((column) => {
            if (column === app.keyColumn) {
              row.push(string.key);
            } else if (column === app.valueColumn) {
              row.push(string.value);
            } else {
              row.push(string.additionalColumns?.[column] || '');
            }
          });
        } else {
          row.push(string.key, string.value);
        }

        row.push(string.status || '');
        return row;
      })
    ];

    const csvContent = csvData.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // 파일명에 검색 조건 표시
    const searchSuffix = searchTerm ? `_filtered_${searchTerm}` : '';
    const fileName = `${app.name}_strings${searchSuffix}_${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 성공 메시지
    alert(`${(dataToExport || []).length}개의 스트링이 CSV 파일로 내보내졌습니다.`);
  };

  const deleteString = async (stringId: number) => {
    if (!app || !app.strings) return;

    try {
      const response = await apiClient.deleteString(projectId, appId, stringId);
      if (response.success) {
        // Update local state by removing the deleted string
        const updatedStrings = app.strings.filter(str => str.id !== stringId);
        setApp({
          ...app,
          strings: updatedStrings
        });
      } else {
        setError(response.error || 'Failed to delete string');
      }
    } catch (err) {
      setError('Failed to delete string');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading app...</div>
      </div>
    );
  }

  if (!project || !app) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || 'App not found'}</div>
          <Link href="/" className="text-blue-500 hover:text-blue-600">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  // Filter and paginate functions
  const filteredStrings = (app.strings || []).filter(str => {
    const matchesSearch = searchTerm === '' ||
      str.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      str.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (str.additionalColumns && Object.values(str.additionalColumns).some(
        val => val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
      ));

    return matchesSearch;
  });

  const paginatedStrings = filteredStrings.slice(
    (stringsPage - 1) * ITEMS_PER_PAGE,
    stringsPage * ITEMS_PER_PAGE
  );

  // 실시간 Pending Changes: new 또는 modified 상태인 문자열들만 표시
  const pendingChanges = (app.strings || [])
    .filter(str => str.status === 'new' || str.status === 'modified') // 상태가 있는 것만 필터링
    .map((str, _) => ({
      id: str.id,
      status: str.status === 'new' ? 'New' : 'Modified',
      stringNumber: (app.strings || []).findIndex(s => s.id === str.id) + 1, // 원본 배열에서의 인덱스
      stringId: str.key,
      modifiedAt: str.modifiedAt || new Date()
    }));

  const paginatedPendingChanges = pendingChanges.slice(
    (pendingChangesPage - 1) * ITEMS_PER_PAGE,
    pendingChangesPage * ITEMS_PER_PAGE
  );

  const totalStringPages = Math.ceil(filteredStrings.length / ITEMS_PER_PAGE);
  const totalPendingPages = Math.ceil(pendingChanges.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-blue-500 hover:text-blue-600">
            Projects
          </Link>
          <span className="text-gray-700">/</span>
          <Link href={`/project/${projectId}`} className="text-blue-500 hover:text-blue-600">
            {project.name}
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-900">{app.name}</span>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{app.name}</h1>
          <div className="flex gap-4">
            <Link
              href={`/project/${projectId}/app/${appId}/history`}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              View History
            </Link>
            <button
              onClick={handlePublishClick}
              disabled={false}
              className="bg-green-500 hover:bg-green-600 disabled:bg-[#767676] disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg"
            >
              Publish Version {app.currentVersion}
            </button>
          </div>
        </div>

        {/* 대용량 데이터셋 알림 */}
        {(app.strings || []).length > 1600 && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>대용량 데이터셋 ({(app.strings || []).length.toLocaleString()}개 스트링)</strong><br/>
                  변경사항이 있을 때만 히스토리가 저장됩니다. Pending Changes는 정상적으로 추적됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Changes 섹션 - 항상 표시 */}
        {(
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-yellow-800 mb-4">
              Pending Changes (Version {app.currentVersion})
            </h2>
            {pendingChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-yellow-200">
                      <th className="text-left py-2 px-4 text-black">Status</th>
                      <th className="text-left py-2 px-4 text-black">String #</th>
                      <th className="text-left py-2 px-4 text-black">String ID</th>
                      <th className="text-left py-2 px-4 text-black">Modified Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPendingChanges.map((change) => (
                      <tr key={change.id} className="border-b border-yellow-100">
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            change.status === 'New'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {change.status}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-gray-900">{change.stringNumber}</td>
                        <td className="py-2 px-4 text-gray-900">{change.stringId}</td>
                        <td className="py-2 px-4 text-gray-900">
                          {new Date(change.modifiedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-800">
                No Updates
              </div>
            )}
            {totalPendingPages > 1 && (
              <div className="flex justify-center mt-4 gap-2">
                <button
                  onClick={() => setPendingChangesPage(Math.max(1, pendingChangesPage - 1))}
                  disabled={pendingChangesPage === 1}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-[#767676]"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-gray-900">
                  {pendingChangesPage} / {totalPendingPages}
                </span>
                <button
                  onClick={() => setPendingChangesPage(Math.min(totalPendingPages, pendingChangesPage + 1))}
                  disabled={pendingChangesPage === totalPendingPages}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-[#767676]"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">String List</h2>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm text-[#767676] placeholder-[#767676]"
              />
              {app.columns && app.columns.length > 0 && (
                <select
                  value={columnFilter}
                  onChange={(e) => setColumnFilter(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm text-[#767676] placeholder-[#767676]"
                >
                  <option value="">모든 열</option>
                  {app.columns.map(column => (
                    <option key={column} value={column}>{column}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="flex justify-end items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={exportToCsv}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Export CSV
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
              >
                Import CSV
              </button>
              <button
                onClick={addNewString}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Add String
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left text-black w-16">#</th>
                  {app.columns && app.columns.length > 0 ? (
                    app.columns.map((column) => (
                      <th key={column} className={`border border-gray-200 px-4 py-2 text-left text-black ${
                        column === app.keyColumn ? 'min-w-[250px]' :
                        column === app.valueColumn ? 'min-w-[400px]' :
                        'min-w-[150px]'
                      }`}>
                        {column}
                      </th>
                    ))
                  ) : (
                    <>
                      <th className="border border-gray-200 px-4 py-2 text-left text-black min-w-[250px]">String Key</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-black min-w-[400px]">String Value</th>
                    </>
                  )}
                  <th className="border border-gray-200 px-4 py-2 text-left text-black min-w-[100px]">Status</th>
                  <th className="border border-gray-200 px-4 py-2 text-left text-black min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStrings.map((string, index) => (
                  <tr key={string.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2 text-black">{(stringsPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                    {app.columns && app.columns.length > 0 ? (
                      app.columns.map((column) => (
                        <td key={column} className="border border-gray-200 px-4 py-2">
                          <input
                            type="text"
                            value={
                              editingValues[`${string.id}-${column}`] ?? (
                                column === app.keyColumn
                                  ? string.key
                                  : column === app.valueColumn
                                    ? string.value
                                    : string.additionalColumns?.[column] || ''
                              )
                            }
                            onChange={(e) => {
                              const field = column === app.keyColumn
                                ? 'key'
                                : column === app.valueColumn
                                  ? 'value'
                                  : column;

                              // Update local editing state immediately for responsive UI
                              setEditingValues(prev => ({
                                ...prev,
                                [`${string.id}-${column}`]: e.target.value
                              }));

                              // Debounced API update
                              debouncedUpdateString(string.id, field, e.target.value);
                            }}
                            onBlur={() => {
                              // Clear local editing state on blur
                              setEditingValues(prev => {
                                const newState = { ...prev };
                                delete newState[`${string.id}-${column}`];
                                return newState;
                              });
                            }}
                            className="w-full border-none outline-none bg-transparent text-black"
                          />
                        </td>
                      ))
                    ) : (
                      <>
                        <td className="border border-gray-200 px-4 py-2">
                          <input
                            type="text"
                            value={editingValues[`${string.id}-key`] ?? string.key}
                            onChange={(e) => {
                              setEditingValues(prev => ({
                                ...prev,
                                [`${string.id}-key`]: e.target.value
                              }));
                              debouncedUpdateString(string.id, 'key', e.target.value);
                            }}
                            onBlur={() => {
                              setEditingValues(prev => {
                                const newState = { ...prev };
                                delete newState[`${string.id}-key`];
                                return newState;
                              });
                            }}
                            className="w-full border-none outline-none bg-transparent text-black"
                          />
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <input
                            type="text"
                            value={editingValues[`${string.id}-value`] ?? string.value}
                            onChange={(e) => {
                              setEditingValues(prev => ({
                                ...prev,
                                [`${string.id}-value`]: e.target.value
                              }));
                              debouncedUpdateString(string.id, 'value', e.target.value);
                            }}
                            onBlur={() => {
                              setEditingValues(prev => {
                                const newState = { ...prev };
                                delete newState[`${string.id}-value`];
                                return newState;
                              });
                            }}
                            className="w-full border-none outline-none bg-transparent text-black"
                          />
                        </td>
                      </>
                    )}
                    <td className="border border-gray-200 px-4 py-2">
                      {string.status && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          string.status === 'new'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {string.status}
                        </span>
                      )}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      <button
                        onClick={() => deleteString(string.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalStringPages > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              <button
                onClick={() => setStringsPage(Math.max(1, stringsPage - 1))}
                disabled={stringsPage === 1}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                이전
              </button>
              <span className="px-3 py-1 text-gray-900">
                {stringsPage} / {totalStringPages}
              </span>
              <button
                onClick={() => setStringsPage(Math.min(totalStringPages, stringsPage + 1))}
                disabled={stringsPage === totalStringPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}

          {filteredStrings.length === 0 && (
            <div className="text-center py-8 text-gray-800">
              {searchTerm || columnFilter ?
                '검색 조건에 맞는 문자열이 없습니다.' :
                'No strings yet. Add your first string or import from CSV.'
              }
            </div>
          )}
        </div>

        {showImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4" style={{color: '#767676'}}>Import CSV</h3>
              <div className="mb-4">
                <p className="text-sm mb-2" style={{color: '#767676'}}>
                  실제 앱 스트링 엑셀 파일 형식을 지원합니다:
                </p>
                <div className="bg-gray-100 p-2 rounded text-xs" style={{color: '#767676'}}>
                  <strong>Key 컬럼:</strong> No, String ID (Key)<br/>
                  <strong>Value 컬럼:</strong> Default Value (English), Korean, Japanese, Spanish, String<br/>
                  <br/>
                  <strong>📋 지원하는 컬럼들:</strong><br/>
                  • No, Status, String ID (Key), Resource Folder<br/>
                  • Default Value (English), Korean, Japanese, Spanish<br/>
                  • String, Classification, History Note<br/>
                  <br/>
                  <strong>✅ 여러 언어가 있으면 선택 가능</strong>
                </div>
              </div>
              {csvImportLoading && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-blue-700">{csvImportStatus}</span>
                  </div>
                </div>
              )}
              <input
                type="file"
                accept=".csv,.txt"
                disabled={csvImportLoading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && app) {
                    console.log('File selected:', file.name, file.type);
                    setCsvImportLoading(true);
                    setCsvImportStatus('CSV 파일 읽는 중...');

                    Papa.parse(file, {
                      header: true,
                      skipEmptyLines: true,
                      complete: async (results: Papa.ParseResult<Record<string, string>>) => {
                        console.log('Parse results:', results);
                        setCsvImportStatus('CSV 파일 파싱 중...');

                        if (results.errors.length > 0) {
                          console.error('Parse errors:', results.errors);
                          alert('CSV 파일 파싱 중 오류가 발생했습니다: ' + results.errors[0].message);
                          setCsvImportLoading(false);
                          setCsvImportStatus('');
                          return;
                        }

                        // 다양한 컬럼명 지원
                        setCsvImportStatus('컬럼 분석 중...');
                        const firstRow = results.data[0];
                        const columns = Object.keys(firstRow || {});
                        console.log('Available columns:', columns);

                        // 실제 앱 스트링 파일 컬럼명들
                        const keyColumns = [
                          'no', 'string id (key)', 'string id', 'key', 'id', 'identifier'
                        ];
                        const valueColumns = [
                          'default value (english)', 'korean', 'japanese', 'spanish', 'string',
                          'value', 'text', 'english', 'classification', 'history note'
                        ];

                        // 대소문자 구분 없이 매칭
                        const keyColumn = columns.find(col =>
                          keyColumns.some(keyCol => col.toLowerCase().includes(keyCol.toLowerCase()))
                        );
                        let valueColumn = columns.find(col =>
                          valueColumns.some(valCol => col.toLowerCase().includes(valCol.toLowerCase()))
                        );

                        console.log('Key column:', keyColumn, 'Value column:', valueColumn);

                        if (!keyColumn) {
                          alert(`Key 컬럼을 찾을 수 없습니다.\n\n사용 가능한 열: ${columns.join(', ')}\n\nKey로 사용 가능한 열: No, String ID (Key) 등이 포함된 컬럼`);
                          setCsvImportLoading(false);
                          setCsvImportStatus('');
                          return;
                        }

                        if (!valueColumn) {
                          // Value 컬럼이 여러 개 있을 수 있으므로 사용자가 선택하도록
                          const possibleValueColumns = columns.filter(col =>
                            valueColumns.some(valCol => col.toLowerCase().includes(valCol.toLowerCase()))
                          );

                          if (possibleValueColumns.length > 1) {
                            const selected = prompt(
                              `여러 언어 컬럼이 발견되었습니다. 가져올 컬럼을 선택하세요:\n\n${possibleValueColumns.map((col, idx) => `${idx + 1}. ${col}`).join('\n')}\n\n번호를 입력하세요 (1-${possibleValueColumns.length}):`
                            );
                            const selectedIndex = parseInt(selected || '1') - 1;
                            if (selectedIndex >= 0 && selectedIndex < possibleValueColumns.length) {
                              valueColumn = possibleValueColumns[selectedIndex];
                            } else {
                              setCsvImportLoading(false);
                              setCsvImportStatus('');
                              return;
                            }
                          } else {
                            alert(`Value 컬럼을 찾을 수 없습니다.\n\n사용 가능한 열: ${columns.join(', ')}\n\nValue로 사용 가능한 열: Default Value (English), Korean, Japanese, Spanish, String 등이 포함된 컬럼`);
                            setCsvImportLoading(false);
                            setCsvImportStatus('');
                            return;
                          }
                        }

                        setCsvImportStatus('데이터 검증 중...');
                        const validData = results.data.filter((row: Record<string, string>) => {
                          const keyValue = row[keyColumn];
                          const valueValue = row[valueColumn];
                          return keyValue && keyValue.toString().trim() && valueValue && valueValue.toString().trim();
                        });

                        console.log('Valid data:', validData);

                        if (validData.length === 0) {
                          alert(`유효한 데이터가 없습니다.\n${keyColumn}와 ${valueColumn} 열에 데이터가 있는지 확인하세요.`);
                          setCsvImportLoading(false);
                          setCsvImportStatus('');
                          return;
                        }

                        const newStrings = validData.map((row: Record<string, string>) => {
                          const additionalColumns: { [key: string]: string } = {};
                          columns.forEach(col => {
                            if (col !== keyColumn && col !== valueColumn) {
                              additionalColumns[col] = row[col];
                            }
                          });

                          return {
                            appId: appId,
                            key: row[keyColumn].toString().trim(),
                            value: row[valueColumn].toString().trim(),
                            status: 'new' as const,
                            modifiedAt: new Date(),
                            additionalColumns
                          };
                        });

                        // Create strings via API
                        setCsvImportStatus(`스트링 생성 중... (0/${newStrings.length})`);
                        const createdStrings: StringItem[] = [];
                        try {
                          for (let i = 0; i < newStrings.length; i++) {
                            const stringData = newStrings[i];
                            setCsvImportStatus(`스트링 생성 중... (${i + 1}/${newStrings.length})`);
                            const createResponse = await apiClient.createString(projectId, appId, stringData);
                            if (createResponse.success && createResponse.data) {
                              createdStrings.push(createResponse.data);
                            }
                          }

                          // Update app columns if needed
                          setCsvImportStatus('앱 설정 업데이트 중...');
                          await apiClient.updateApp(projectId.toString(), appId.toString(), {
                            columns: columns,
                            keyColumn: keyColumn,
                            valueColumn: valueColumn
                          });

                          // Add imported strings at the top of the list
                          setCsvImportStatus('데이터 새로고침 중...');
                          const updatedStrings = [...createdStrings, ...(app.strings || [])];
                          setApp({
                            ...app,
                            columns: columns,
                            keyColumn: keyColumn,
                            valueColumn: valueColumn,
                            strings: updatedStrings
                          });

                          setCsvImportLoading(false);
                          setCsvImportStatus('');
                          setShowImport(false);
                          alert(`성공적으로 ${createdStrings.length}개의 스트링을 가져왔습니다!`);
                        } catch (importError) {
                          console.error('Error importing strings:', importError);
                          setCsvImportLoading(false);
                          setCsvImportStatus('');
                          alert('스트링 가져오기 중 오류가 발생했습니다.');
                        }
                      },
                      error: (error: Error) => {
                        console.error('CSV parsing error:', error);
                        setCsvImportLoading(false);
                        setCsvImportStatus('');
                        alert('CSV 파일을 읽는 중 오류가 발생했습니다: ' + error.message);
                      }
                    });
                  } else {
                    alert('파일을 선택해주세요.');
                  }
                }}
                className="w-full border border-gray-300 rounded p-2 mb-4"
                style={{color: '#767676'}}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    if (!csvImportLoading) {
                      setShowImport(false);
                      setCsvImportStatus('');
                    }
                  }}
                  disabled={csvImportLoading}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Publish Version 모달 */}
        {showPublishModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Publish Version</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version Number
                  </label>
                  <input
                    type="number"
                    value={publishData.version}
                    onChange={(e) => setPublishData(prev => ({ ...prev, version: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publisher (발행인)
                  </label>
                  <input
                    type="text"
                    value={publishData.publisher}
                    onChange={(e) => setPublishData(prev => ({ ...prev, publisher: e.target.value }))}
                    placeholder="발행인 이름 입력"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-[#767676]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (특이사항)
                  </label>
                  <textarea
                    value={publishData.notes}
                    onChange={(e) => setPublishData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="특이사항이나 변경 내용을 입력하세요"
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-[#767676]"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublishConfirm}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                >
                  Do Publish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}