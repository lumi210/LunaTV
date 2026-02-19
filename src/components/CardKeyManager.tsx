/* eslint-disable @typescript-eslint/no-explicit-any, no-console, react-hooks/exhaustive-deps */

'use client';

import {
  CheckCircle,
  Copy,
  Download,
  KeyRound,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { CardKey } from '@/lib/types';

// 卡密类型映射
const CARD_KEY_TYPE_LABELS: Record<string, string> = {
  year: '1年',
  quarter: '1季（90天）',
  month: '1月（30天）',
  week: '1周（7天）',
};

// 卡密状态映射
const CARD_KEY_STATUS_LABELS: Record<string, string> = {
  unused: '未使用',
  used: '已使用',
  expired: '已过期',
};

// 卡密来源映射
const CARD_KEY_SOURCE_LABELS: Record<string, string> = {
  admin_created: '管理员创建',
  promotion_register: '推广注册',
  points_redeem: '积分兑换',
};

interface CardKeyManagerProps {
  onClose?: () => void;
}

export default function CardKeyManager({ onClose }: CardKeyManagerProps) {
  const [cardKeys, setCardKeys] = useState<CardKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newKeyType, setNewKeyType] = useState<
    'year' | 'quarter' | 'month' | 'week'
  >('week');
  const [newKeyCount, setNewKeyCount] = useState(1);
  const [createdKeys, setCreatedKeys] = useState<string[]>([]);
  const [showCreatedKeys, setShowCreatedKeys] = useState(false);

  // 系统模式相关状态
  const [systemMode, setSystemMode] = useState<'promotion' | 'operation'>(
    'operation',
  );
  const [promotionCardKeyType, setPromotionCardKeyType] = useState<
    'year' | 'quarter' | 'month' | 'week'
  >('week');
  const [modeLoading, setModeLoading] = useState(false);
  const [promotionStats, setPromotionStats] = useState({
    totalPromotionCardKeys: 0,
    activePromotionCardKeys: 0,
  });

  // 获取卡密列表
  const fetchCardKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cardkey');
      if (!res.ok) {
        throw new Error(`获取卡密列表失败: ${res.status}`);
      }
      const data = await res.json();
      setCardKeys(data.cardKeys || []);
    } catch (err) {
      console.error('获取卡密列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取系统模式配置
  const fetchSystemMode = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cardkey/system-mode');
      if (!res.ok) {
        throw new Error(`获取系统模式失败: ${res.status}`);
      }
      const data = await res.json();
      setSystemMode(data.systemMode || 'operation');
      setPromotionCardKeyType(data.promotionCardKeyType || 'week');
      setPromotionStats(
        data.promotionStats || {
          totalPromotionCardKeys: 0,
          activePromotionCardKeys: 0,
        },
      );
    } catch (err) {
      console.error('获取系统模式失败:', err);
    }
  }, []);

  // 设置系统模式
  const handleSetSystemMode = async (
    mode: 'promotion' | 'operation',
    cardKeyType?: 'year' | 'quarter' | 'month' | 'week',
  ) => {
    setModeLoading(true);
    try {
      const res = await fetch('/api/admin/cardkey/system-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemMode: mode,
          ...(cardKeyType && { promotionCardKeyType: cardKeyType }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `设置失败: ${res.status}`);
      }

      const data = await res.json();
      setSystemMode(data.systemMode);
      setPromotionCardKeyType(data.promotionCardKeyType);
      setPromotionStats(data.promotionStats);
    } catch (err) {
      alert(err instanceof Error ? err.message : '设置系统模式失败');
    } finally {
      setModeLoading(false);
    }
  };

  // 创建卡密
  const handleCreateCardKeys = async () => {
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/cardkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          type: newKeyType,
          count: newKeyCount,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `创建卡密失败: ${res.status}`);
      }

      const data = await res.json();
      setCreatedKeys(data.result.keys || []);
      setShowCreatedKeys(true);
      setShowCreateModal(false);
      await fetchCardKeys();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建卡密失败');
    } finally {
      setCreateLoading(false);
    }
  };

  // 清理过期卡密
  const handleCleanupExpired = async () => {
    if (!confirm('确定要清理所有过期的未使用卡密吗？')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/cardkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup',
        }),
      });

      if (!res.ok) {
        throw new Error(`清理失败: ${res.status}`);
      }

      const data = await res.json();
      alert(`已清理 ${data.cleanedCount} 个过期卡密`);
      await fetchCardKeys();
    } catch (err) {
      console.error('清理过期卡密失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 删除卡密
  const handleDeleteCardKey = async (keyHash: string) => {
    if (!confirm('确定要删除此卡密吗？')) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/cardkey?hash=${encodeURIComponent(keyHash)}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `删除失败: ${res.status}`);
      }

      await fetchCardKeys();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除卡密失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出卡密
  const handleExportCardKeys = async () => {
    try {
      const res = await fetch('/api/admin/cardkey/export');
      if (!res.ok) {
        throw new Error(`导出失败: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cardkeys-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出卡密失败:', err);
      alert('导出卡密失败');
    }
  };

  // 格式化时间
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 复制卡密
  const copyCardKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      alert('卡密已复制到剪贴板');
    } catch (err) {
      // 如果 clipboard API 失败，使用备用方法
      const textarea = document.createElement('textarea');
      textarea.value = key;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert('卡密已复制到剪贴板');
      } catch (err) {
        alert('复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  };

  // 复制全部卡密
  const copyAllCardKeys = async () => {
    const allKeys = createdKeys.join('\n');
    try {
      await navigator.clipboard.writeText(allKeys);
      alert(`已复制 ${createdKeys.length} 个卡密到剪贴板`);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = allKeys;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert(`已复制 ${createdKeys.length} 个卡密到剪贴板`);
      } catch (err) {
        alert('复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  };

  useEffect(() => {
    fetchCardKeys();
    fetchSystemMode();
  }, [fetchCardKeys, fetchSystemMode]);

  return (
    <div className='space-y-6'>
      {/* 系统模式设置区域 */}
      <div className='bg-gradient-to-r from-blue-50/50 via-indigo-50/50 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 backdrop-blur-3xl p-6 rounded-2xl border border-blue-200/30 dark:border-blue-800/30 shadow-xl shadow-blue-500/10'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='relative'>
            <div className='absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl blur-xl opacity-30 animate-pulse-soft' />
            <div className='relative p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30'>
              <Settings className='w-6 h-6 text-white' />
            </div>
          </div>
          <div>
            <h3 className='text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent'>
              系统模式设置
            </h3>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
              切换推广模式或运营模式，控制用户注册流程
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
          {/* 推广模式 */}
          <button
            type='button'
            onClick={() => handleSetSystemMode('promotion')}
            disabled={modeLoading}
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
              systemMode === 'promotion'
                ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg shadow-green-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <div className='flex items-center gap-3 mb-2'>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  systemMode === 'promotion'
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {systemMode === 'promotion' && (
                  <CheckCircle className='w-3 h-3 text-white' />
                )}
              </div>
              <span className='font-bold text-gray-900 dark:text-white'>
                推广模式
              </span>
            </div>
            <p className='text-sm text-gray-600 dark:text-gray-400 ml-8'>
              新用户注册时自动生成并绑定指定类型卡密，无需用户输入卡密
            </p>
          </button>

          {/* 运营模式 */}
          <button
            type='button'
            onClick={() => handleSetSystemMode('operation')}
            disabled={modeLoading}
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
              systemMode === 'operation'
                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-lg shadow-blue-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            <div className='flex items-center gap-3 mb-2'>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  systemMode === 'operation'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {systemMode === 'operation' && (
                  <CheckCircle className='w-3 h-3 text-white' />
                )}
              </div>
              <span className='font-bold text-gray-900 dark:text-white'>
                运营模式
              </span>
            </div>
            <p className='text-sm text-gray-600 dark:text-gray-400 ml-8'>
              用户注册时需手动输入卡密，保持现有注册机制
            </p>
          </button>
        </div>

        {/* 推广模式配置 */}
        {systemMode === 'promotion' && (
          <div className='bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 border border-green-200/30 dark:border-green-800/30'>
            <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
              <div className='flex-1'>
                <label className='block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2'>
                  推广卡密类型
                </label>
                <select
                  value={promotionCardKeyType}
                  onChange={(e) =>
                    handleSetSystemMode(
                      'promotion',
                      e.target.value as 'year' | 'quarter' | 'month' | 'week',
                    )
                  }
                  disabled={modeLoading}
                  className='w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white'
                >
                  <option value='year'>1年（365天）</option>
                  <option value='quarter'>1季（90天）</option>
                  <option value='month'>1月（30天）</option>
                  <option value='week'>1周（7天）</option>
                </select>
              </div>
              <div className='flex-1'>
                <div className='text-sm text-gray-600 dark:text-gray-400'>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    推广统计：
                  </span>
                  已生成 {promotionStats.totalPromotionCardKeys} 张推广卡密，
                  有效 {promotionStats.activePromotionCardKeys} 张
                </div>
              </div>
            </div>
          </div>
        )}

        {modeLoading && (
          <div className='absolute inset-0 bg-white/50 dark:bg-gray-900/50 rounded-2xl flex items-center justify-center'>
            <RefreshCw className='w-6 h-6 animate-spin text-blue-500' />
          </div>
        )}
      </div>

      {/* 页面标题和操作栏 */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-50/50 via-amber-50/50 to-yellow-50/50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-yellow-950/20 backdrop-blur-3xl p-6 rounded-2xl border border-orange-200/30 dark:border-orange-800/30 shadow-xl shadow-orange-500/10'>
        <div className='flex items-center gap-3'>
          <div className='relative'>
            <div className='absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl blur-xl opacity-30 animate-pulse-soft' />
            <div className='relative p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-500/30'>
              <CheckCircle className='w-6 h-6 text-white' />
            </div>
          </div>
          <div>
            <h2 className='text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 dark:from-orange-400 dark:via-amber-400 dark:to-yellow-400 bg-clip-text text-transparent'>
              卡密管理
            </h2>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
              创建和管理您的卡密
            </p>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={() => setShowCreateModal(true)}
            className='inline-flex items-center px-5 py-2.5 text-white bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:scale-95'
          >
            <Plus className='w-4 h-4 mr-2' />
            <span className='font-semibold'>创建卡密</span>
          </button>
          <button
            type='button'
            onClick={handleExportCardKeys}
            className='inline-flex items-center px-4 py-2.5 text-white bg-gradient-to-br from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95'
          >
            <Download className='w-4 h-4 mr-2' />
            <span className='font-medium'>导出</span>
          </button>
          <button
            type='button'
            onClick={handleCleanupExpired}
            disabled={loading}
            className='inline-flex items-center px-4 py-2.5 text-white bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            <span className='font-medium'>清理过期</span>
          </button>
          <button
            type='button'
            onClick={fetchCardKeys}
            disabled={loading}
            className='inline-flex items-center px-4 py-2.5 text-white bg-gradient-to-br from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 rounded-xl transition-all duration-300 shadow-lg shadow-gray-500/30 hover:shadow-xl hover:shadow-gray-500/40 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none'
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            <span className='font-medium'>刷新</span>
          </button>
          {onClose && (
            <button
              type='button'
              onClick={onClose}
              className='inline-flex items-center px-4 py-2.5 text-white bg-gradient-to-br from-gray-400 to-slate-400 hover:from-gray-500 hover:to-slate-500 rounded-xl transition-all duration-300 shadow-lg shadow-gray-400/30 hover:shadow-xl hover:shadow-gray-400/40 hover:-translate-y-0.5 active:scale-95'
            >
              <X className='w-4 h-4 mr-2' />
              <span className='font-medium'>关闭</span>
            </button>
          )}
        </div>
      </div>

      {/* 精美卡密列表表格 */}
      <div className='bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl rounded-3xl overflow-hidden shadow-2xl shadow-orange-500/10 dark:shadow-orange-500/20 border border-orange-200/30 dark:border-orange-800/30'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='bg-gradient-to-r from-orange-50/80 via-amber-50/80 to-yellow-50/80 dark:from-orange-950/40 dark:via-amber-950/40 dark:to-yellow-950/40 border-b-2 border-orange-200/40 dark:border-orange-800/40'>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  卡密
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  类型
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  状态
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  来源
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  创建时间
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  过期时间
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  绑定用户
                </th>
                <th className='px-6 py-4 text-left text-xs font-bold tracking-wider uppercase text-orange-900 dark:text-orange-200'>
                  操作
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-orange-100/30 dark:divide-orange-900/30'>
              {loading && cardKeys.length === 0 ? (
                <tr>
                  <td colSpan={8} className='px-6 py-12 text-center'>
                    <div className='flex flex-col items-center justify-center gap-4'>
                      <div className='relative'>
                        <div className='w-16 h-16 border-4 border-orange-200 dark:border-orange-800 rounded-full' />
                        <div className='absolute inset-0 w-16 h-16 border-4 border-t-transparent border-orange-500 rounded-full animate-spin' />
                      </div>
                      <span className='text-gray-600 dark:text-gray-400 font-medium'>
                        加载中...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : cardKeys.length === 0 ? (
                <tr>
                  <td colSpan={8} className='px-6 py-12 text-center'>
                    <div className='flex flex-col items-center justify-center gap-4'>
                      <div className='relative'>
                        <div className='absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 rounded-full blur-2xl opacity-20' />
                        <div className='relative p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-full'>
                          <CheckCircle className='w-12 h-12 text-orange-400 dark:text-orange-500' />
                        </div>
                      </div>
                      <span className='text-gray-600 dark:text-gray-400 font-medium text-lg'>
                        暂无卡密
                      </span>
                      <p className='text-sm text-gray-500 dark:text-gray-500'>
                        点击上方"创建卡密"按钮开始创建
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                cardKeys.map((cardKey) => (
                  <tr
                    key={cardKey.keyHash}
                    className='transition-all duration-300 hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-amber-50/50 dark:hover:from-orange-950/20 dark:hover:to-amber-950/20'
                  >
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2'>
                        <code className='font-mono text-sm bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 px-3 py-1.5 rounded-lg border border-orange-200/30 dark:border-orange-800/30 text-gray-700 dark:text-gray-300'>
                          {cardKey.key}
                        </code>
                        <button
                          type='button'
                          onClick={() => copyCardKey(cardKey.key)}
                          className='p-2 hover:bg-gradient-to-br hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/30 dark:hover:to-amber-900/30 rounded-xl transition-all duration-300 group hover:shadow-md hover:shadow-orange-500/20'
                          title='复制卡密'
                        >
                          <Copy className='w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors' />
                        </button>
                      </div>
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      <span className='inline-flex items-center px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/30 dark:border-amber-800/30'>
                        {CARD_KEY_TYPE_LABELS[cardKey.keyType] ||
                          cardKey.keyType}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      {cardKey.status === 'used' ? (
                        <span className='inline-flex items-center px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/30 dark:border-emerald-800/30 shadow-sm shadow-emerald-500/10'>
                          <CheckCircle className='w-4 h-4 mr-2' />
                          {CARD_KEY_STATUS_LABELS[cardKey.status]}
                        </span>
                      ) : cardKey.status === 'expired' ? (
                        <span className='inline-flex items-center px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 text-red-700 dark:text-red-300 border border-red-200/30 dark:border-red-800/30 shadow-sm shadow-red-500/10'>
                          <X className='w-4 h-4 mr-2' />
                          {CARD_KEY_STATUS_LABELS[cardKey.status]}
                        </span>
                      ) : (
                        <span className='inline-flex items-center px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 text-gray-700 dark:text-gray-300 border border-gray-200/30 dark:border-gray-800/30'>
                          {CARD_KEY_STATUS_LABELS[cardKey.status]}
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                          cardKey.source === 'promotion_register'
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 text-green-700 dark:text-green-300 border border-green-200/30 dark:border-green-800/30'
                            : cardKey.source === 'points_redeem'
                              ? 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/30 dark:border-purple-800/30'
                              : 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 text-gray-600 dark:text-gray-400 border border-gray-200/30 dark:border-gray-800/30'
                        }`}
                      >
                        {
                          CARD_KEY_SOURCE_LABELS[
                            cardKey.source || 'admin_created'
                          ]
                        }
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium'>
                      {formatDate(cardKey.createdAt)}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium'>
                      {formatDate(cardKey.expiresAt)}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium'>
                      {cardKey.boundTo || (
                        <span className='text-gray-400 dark:text-gray-600'>
                          -
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      {cardKey.status === 'unused' && (
                        <button
                          type='button'
                          onClick={() => handleDeleteCardKey(cardKey.keyHash)}
                          className='group relative inline-flex items-center px-4 py-2 bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 hover:from-red-600 hover:via-rose-600 hover:to-pink-600 text-white rounded-xl transition-all duration-300 shadow-md shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40 hover:-translate-y-0.5 active:scale-95 overflow-hidden'
                        >
                          <div className='absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                          <Trash2 className='w-4 h-4 relative z-10' />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 创建卡密弹窗 */}
      {showCreateModal && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          {/* 动态背景 */}
          <div className='absolute inset-0 bg-gradient-to-br from-indigo-900/95 via-purple-900/90 to-pink-900/95 animate-gradient-x' />
          <div
            className='absolute inset-0 bg-gradient-to-tr from-blue-900/80 via-cyan-900/80 to-teal-900/80 animate-gradient-y'
            style={{
              animationDuration: '3s',
              animationIterationCount: 'infinite',
            }}
          />

          {/* 浮动粒子效果 */}
          <div className='absolute inset-0 overflow-hidden pointer-events-none'>
            <div
              className='absolute top-1/4 left-1/4 w-2 h-2 bg-white/10 rounded-full animate-float'
              style={{ animationDelay: '0s' }}
            />
            <div
              className='absolute top-1/2 right-1/4 w-3 h-3 bg-white/10 rounded-full animate-float'
              style={{ animationDelay: '1s' }}
            />
            <div
              className='absolute bottom-1/3 left-1/3 w-2 h-2 bg-white/10 rounded-full animate-float'
              style={{ animationDelay: '2s' }}
            />
            <div
              className='absolute top-1/3 right-1/3 w-2.5 h-2.5 bg-white/10 rounded-full animate-float'
              style={{ animationDelay: '1.5s' }}
            />
          </div>

          {/* 弹窗容器 - 玻璃态效果 */}
          <div className='relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8'>
            {/* 光晕效果 */}
            <div className='absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl animate-pulse-slow' />

            {/* 标题区域 */}
            <div className='relative mb-8'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-4'>
                  {/* 3D 图标 */}
                  <div className='relative w-14 h-14'>
                    <div className='absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg animate-bounce-in' />
                    <div
                      className='absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg animate-bounce-in'
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <KeyRound className='w-8 h-8 text-white drop-shadow-lg' />
                    </div>
                  </div>
                  <div>
                    <h2 className='text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent'>
                      创建卡密
                    </h2>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      为用户生成观影时长卡密
                    </p>
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => setShowCreateModal(false)}
                  className='group relative p-2.5 hover:bg-white/50 dark:hover:bg-gray-800 rounded-2xl transition-all duration-300'
                >
                  <X className='w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors' />
                </button>
              </div>
            </div>

            {/* 卡密类型选择 - 玻璃态卡片 */}
            <div className='grid grid-cols-2 gap-4 mb-8'>
              {[
                { type: 'year', label: '1年', desc: '365天', icon: '📅' },
                { type: 'quarter', label: '1季', desc: '90天', icon: '📆' },
                { type: 'month', label: '1月', desc: '30天', icon: '🗓️' },
                { type: 'week', label: '1周', desc: '7天', icon: '⏰' },
              ].map((item) => (
                <button
                  key={item.type}
                  type='button'
                  onClick={() => setNewKeyType(item.type as any)}
                  className={`group relative p-6 rounded-2xl transition-all duration-300 ${
                    newKeyType === item.type
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/50 scale-105'
                      : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 hover:scale-102'
                  }`}
                >
                  {/* 光晕效果 */}
                  {newKeyType === item.type && (
                    <div className='absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl opacity-20 animate-pulse' />
                  )}

                  <div className='text-4xl mb-2'>{item.icon}</div>
                  <div className='text-lg font-bold text-gray-800 dark:text-gray-200 mb-1'>
                    {item.label}
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* 数量选择 */}
            <div className='mb-8'>
              <label className='block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3'>
                生成数量
              </label>
              <div className='flex items-center gap-4'>
                <button
                  type='button'
                  onClick={() => setNewKeyCount(Math.max(1, newKeyCount - 1))}
                  className='w-12 h-12 rounded-full bg-white/80 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xl font-bold transition-all duration-300 hover:scale-110'
                >
                  -
                </button>
                <div className='flex-1 text-center'>
                  <input
                    type='number'
                    min='1'
                    max='100'
                    value={newKeyCount}
                    onChange={(e) =>
                      setNewKeyCount(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className='w-24 text-center text-2xl font-bold bg-white/80 dark:bg-gray-700 rounded-2xl py-3 border-2 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 text-gray-800 dark:text-gray-200'
                  />
                </div>
                <button
                  type='button'
                  onClick={() => setNewKeyCount(Math.min(100, newKeyCount + 1))}
                  className='w-12 h-12 rounded-full bg-white/80 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xl font-bold transition-all duration-300 hover:scale-110'
                >
                  +
                </button>
              </div>
            </div>

            {/* 统计信息 */}
            <div className='mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200/30 dark:border-indigo-800/30'>
              <div className='flex items-center justify-between text-sm'>
                <span className='font-medium text-gray-700 dark:text-gray-300'>
                  预计生成数量
                </span>
                <span className='font-bold text-indigo-600 dark:text-indigo-400'>
                  {newKeyCount} 个
                </span>
              </div>
              <div className='flex items-center justify-between text-sm mt-2'>
                <span className='font-medium text-gray-700 dark:text-gray-300'>
                  总时长
                </span>
                <span className='font-bold text-purple-600 dark:text-purple-400'>
                  {CARD_KEY_TYPE_LABELS[newKeyType]} × {newKeyCount}
                </span>
              </div>
            </div>

            {/* 按钮区域 */}
            <div className='flex gap-4 mt-auto pt-6 border-t border-gray-200 dark:border-gray-700'>
              <button
                type='button'
                onClick={() => setShowCreateModal(false)}
                className='flex-1 px-6 py-3.5 text-gray-700 dark:text-gray-300 font-bold bg-white dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 hover:scale-105'
              >
                取消
              </button>
              <button
                type='button'
                onClick={handleCreateCardKeys}
                disabled={createLoading}
                className={`flex-2 px-8 py-3.5 text-white font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-2xl transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  createLoading ? 'animate-pulse' : ''
                }`}
              >
                {createLoading ? (
                  <div className='flex items-center gap-2'>
                    <div className='w-5 h-5 border-2 border-white/30 border-t-transparent animate-spin rounded-full' />
                    <span>创建中...</span>
                  </div>
                ) : (
                  <div className='flex items-center gap-2'>
                    <Settings className='w-5 h-5' />
                    <span>生成卡密</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 精美已创建卡密显示弹窗 - 简洁版 */}
      {showCreatedKeys && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto'>
          <div className='relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border border-gray-200 dark:border-gray-700 animate-bounce-in'>
            {/* 顶部操作栏 - 固定 */}
            <div className='sticky top-0 z-10 bg-white dark:bg-gray-800 rounded-t-2xl border-b border-gray-200 dark:border-gray-700 p-4'>
              <div className='flex items-center justify-between gap-4'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg'>
                    <CheckCircle className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                      已生成 {createdKeys.length} 个卡密
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      点击卡密可单独复制
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={copyAllCardKeys}
                    className='inline-flex items-center px-4 py-2 text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg transition-all text-sm font-medium shadow-md'
                  >
                    <Copy className='w-4 h-4 mr-2' />
                    一键复制全部
                  </button>
                  <button
                    type='button'
                    onClick={() => setShowCreatedKeys(false)}
                    className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                  >
                    <X className='w-5 h-5 text-gray-500' />
                  </button>
                </div>
              </div>
            </div>

            {/* 卡密列表 - 紧凑网格 */}
            <div className='p-4 max-h-[60vh] overflow-y-auto'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {createdKeys.map((key, index) => (
                  <div
                    key={index}
                    onClick={() => copyCardKey(key)}
                    className='group flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg cursor-pointer transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                  >
                    <span className='flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-400'>
                      {index + 1}
                    </span>
                    <code className='flex-1 text-sm font-mono text-gray-700 dark:text-gray-300 truncate'>
                      {key}
                    </code>
                    <Copy className='w-4 h-4 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0' />
                  </div>
                ))}
              </div>
            </div>

            {/* 底部 */}
            <div className='p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl'>
              <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
                卡密已保存至数据库，可随时在列表中查看
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
