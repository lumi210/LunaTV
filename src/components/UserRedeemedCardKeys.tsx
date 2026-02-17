/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  KeyRound,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface RedeemedCardKey {
  id: string;
  plainKey: string;
  type: 'year' | 'quarter' | 'month' | 'week';
  status: 'unused' | 'used' | 'expired';
  source: string;
  createdAt: number;
  expiresAt: number;
  daysRemaining: number;
  isExpired: boolean;
}

const cardKeyTypeLabels: Record<string, string> = {
  year: '年卡',
  quarter: '季卡',
  month: '月卡',
  week: '周卡',
};

export default function UserRedeemedCardKeys() {
  const [cardKeys, setCardKeys] = useState<RedeemedCardKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCardKeys = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user/cardkeys');

      if (!res.ok) {
        throw new Error('获取卡密列表失败');
      }

      const data = await res.json();
      setCardKeys(data.cardKeys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCardKeys();
  }, [fetchCardKeys]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('卡密已复制到剪贴板');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert('卡密已复制到剪贴板');
      } catch {
        alert('复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getStatusBadge = (cardKey: RedeemedCardKey) => {
    if (cardKey.isExpired) {
      return (
        <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'>
          <XCircle className='w-3 h-3 mr-1' />
          已过期
        </span>
      );
    }
    if (cardKey.status === 'used') {
      return (
        <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200'>
          <CheckCircle className='w-3 h-3 mr-1' />
          已使用
        </span>
      );
    }
    return (
      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'>
        <CheckCircle className='w-3 h-3 mr-1' />
        未使用
      </span>
    );
  };

  if (loading) {
    return (
      <div className='flex justify-center items-center py-8'>
        <div className='flex items-center gap-3'>
          <RefreshCw className='w-5 h-5 animate-spin text-blue-600' />
          <span className='text-sm text-gray-600 dark:text-gray-400'>
            加载中...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
        <div className='flex items-center gap-2'>
          <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400' />
          <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
        </div>
        <button
          type='button'
          onClick={fetchCardKeys}
          className='mt-3 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors'
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
          已兑换卡密
        </h2>
        <button
          type='button'
          onClick={fetchCardKeys}
          disabled={loading}
          className='inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50'
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          刷新
        </button>
      </div>

      {cardKeys.length === 0 ? (
        <div className='p-8 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-center'>
          <KeyRound className='w-12 h-12 text-gray-400 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>暂无已兑换的卡密</p>
          <p className='text-sm text-gray-500 dark:text-gray-500 mt-2'>
            邀请好友注册获取积分，积分可用于兑换卡密
          </p>
        </div>
      ) : (
        <div className='space-y-4'>
          {cardKeys.map((cardKey) => (
            <div
              key={cardKey.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${
                cardKey.isExpired
                  ? 'border-red-200 dark:border-red-800'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className='flex items-start justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <KeyRound
                    className={`w-5 h-5 ${
                      cardKey.isExpired
                        ? 'text-red-500'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  />
                  <span className='font-medium text-gray-900 dark:text-gray-100'>
                    {cardKeyTypeLabels[cardKey.type] || cardKey.type}
                  </span>
                </div>
                {getStatusBadge(cardKey)}
              </div>

              <div className='space-y-2'>
                {cardKey.plainKey && (
                  <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                        卡密
                      </p>
                      <code className='text-sm font-mono font-bold text-gray-900 dark:text-gray-100'>
                        {cardKey.plainKey}
                      </code>
                    </div>
                    <button
                      type='button'
                      onClick={() => copyToClipboard(cardKey.plainKey)}
                      className='p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors'
                      title='复制卡密'
                    >
                      <Copy className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                    </button>
                  </div>
                )}

                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <p className='text-gray-500 dark:text-gray-400'>兑换时间</p>
                    <p className='text-gray-900 dark:text-gray-100 font-medium'>
                      {formatDate(cardKey.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className='text-gray-500 dark:text-gray-400'>过期时间</p>
                    <p
                      className={`font-medium ${
                        cardKey.isExpired
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {formatDate(cardKey.expiresAt)}
                    </p>
                  </div>
                </div>

                {!cardKey.isExpired && cardKey.status === 'unused' && (
                  <div className='flex items-center gap-2 text-sm text-green-600 dark:text-green-400'>
                    <Clock className='w-4 h-4' />
                    <span>剩余 {cardKey.daysRemaining} 天</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
