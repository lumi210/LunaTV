'use client';

import { useCallback, useEffect, useState } from 'react';

import PageLayout from '@/components/PageLayout';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

interface VersionInfo {
  version: string;
  versionCode: number;
  platform: string;
  updateType: string;
  updateLog: string;
  wgtUrl: string;
  pkgUrl: string;
  publishTime: number;
}

interface WgtFile {
  fileName: string;
  version: string;
  versionCode: number;
  platform: string;
  size: number;
  uploadTime: number;
}

interface AdminData {
  versionInfo: VersionInfo | null;
  wgtList: WgtFile[];
}

export default function AppUpdatePage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  
  const [version, setVersion] = useState('1.0.0');
  const [versionCode, setVersionCode] = useState('100');
  const [platform, setPlatform] = useState('android');
  const [updateType, setUpdateType] = useState('normal');
  const [updateLog, setUpdateLog] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/app-update');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.versionInfo) {
          setVersion(json.data.versionInfo.version || '1.0.0');
          setVersionCode(String(json.data.versionInfo.versionCode || '100'));
          setPlatform(json.data.versionInfo.platform || 'android');
          setUpdateType(json.data.versionInfo.updateType || 'normal');
          setUpdateLog(json.data.versionInfo.updateLog || '');
        }
      }
    } catch (e) {
      console.error('Fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const authInfo = getAuthInfoFromBrowserCookie();
    if (authInfo && (authInfo.role === 'owner' || authInfo.role === 'admin')) {
      setRole(authInfo.role);
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a WGT file');
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version', version);
      formData.append('versionCode', versionCode);
      formData.append('platform', platform);
      formData.append('updateType', updateType);
      formData.append('updateLog', updateLog);
      
      const res = await fetch('/api/app-update/upload', {
        method: 'POST',
        body: formData,
      });
      
      const json = await res.json();
      if (json.success) {
        alert('Upload successful!');
        fetchData();
      } else {
        alert('Upload failed: ' + json.error);
      }
    } catch (e) {
      console.error('Upload failed:', e);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (platform: string, versionCode: number) => {
    if (!confirm('Are you sure to delete this WGT file?')) return;
    
    try {
      const res = await fetch(`/api/admin/app-update?platform=${platform}&versionCode=${versionCode}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        alert('Deleted!');
        fetchData();
      } else {
        alert('Delete failed: ' + json.error);
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-400">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  if (!role) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-red-400">Access denied. Admin role required.</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            App Hot Update Management
          </h1>
          <a href="/admin" className="text-blue-600 hover:text-blue-700 text-sm">
            Back to Admin
          </a>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Version
          </h2>
          {data?.versionInfo ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Version:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{data.versionInfo.version}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Version Code:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{data.versionInfo.versionCode}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Platform:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{data.versionInfo.platform}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Update Type:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{data.versionInfo.updateType}</span>
              </div>
              <div className="col-span-2 md:col-span-4">
                <span className="text-gray-500 dark:text-gray-400">Update Log:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{data.versionInfo.updateLog || '-'}</span>
              </div>
              <div className="col-span-2 md:col-span-4">
                <span className="text-gray-500 dark:text-gray-400">Publish Time:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{formatDate(data.versionInfo.publishTime)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No version info configured</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upload New Version
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Version (e.g. 1.0.1)
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="1.0.1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Version Code (integer)
                </label>
                <input
                  type="text"
                  value={versionCode}
                  onChange={(e) => setVersionCode(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="101"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Update Type</label>
                <select
                  value={updateType}
                  onChange={(e) => setUpdateType(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="silent">Silent (auto install)</option>
                  <option value="normal">Normal (user choice)</option>
                  <option value="forced">Forced (must update)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Update Log</label>
              <textarea
                value={updateLog}
                onChange={(e) => setUpdateLog(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 h-20"
                placeholder="Bug fixes and improvements..."
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">WGT File</label>
              <input
                type="file"
                accept=".wgt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
              />
            </div>
            
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded py-3 font-semibold transition"
            >
              {uploading ? 'Uploading...' : 'Upload WGT File'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Uploaded Files
          </h2>
          {data?.wgtList && data.wgtList.length > 0 ? (
            <div className="space-y-3">
              {data.wgtList.map((wgt, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{wgt.fileName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      v{wgt.version} ({wgt.versionCode}) | {wgt.platform} | {formatSize(wgt.size)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(wgt.uploadTime)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(wgt.platform, wgt.versionCode)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No WGT files uploaded</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
