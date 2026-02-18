/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import {
  AlertCircle,
  CheckCircle,
  Copy,
  Gift,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface UserInvitationInfo {
  code: string;
  totalInvites: number;
  totalRewards: number;
  balance: number;
}

interface InvitationConfig {
  rewardPoints: number;
  redeemThreshold: number;
  cardKeyType: 'year' | 'quarter' | 'month' | 'week';
}

const cardKeyTypeLabels: Record<string, string> = {
  year: '年卡',
  quarter: '季卡',
  month: '月卡',
  week: '周卡',
};

export default function UserReferralInfo() {
  const [invitationInfo, setInvitationInfo] =
    useState<UserInvitationInfo | null>(null);
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
    cardKey?: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [infoRes, configRes] = await Promise.all([
        fetch('/api/invitation/info'),
        fetch('/api/invitation-config'),
      ]);

      if (!infoRes.ok) {
        throw new Error('获取邀请信息失败');
      }

      const infoData = await infoRes.json();
      setInvitationInfo(infoData);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制到剪贴板');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert('已复制到剪贴板');
      } catch {
        alert('复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  };

  const handleRedeem = async () => {
    if (!config) return;

    setRedeeming(true);
    setRedeemResult(null);

    try {
      const res = await fetch('/api/redeem/cardkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRedeemResult({
          success: true,
          message: '兑换成功！',
          cardKey: data.cardKey,
        });
        await fetchData();
      } else {
        setRedeemResult({
          success: false,
          message: data.error || '兑换失败',
        });
      }
    } catch (err) {
      setRedeemResult({
        success: false,
        message: err instanceof Error ? err.message : '兑换失败',
      });
    } finally {
      setRedeeming(false);
    }
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
          onClick={fetchData}
          className='mt-3 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors'
        >
          重试
        </button>
      </div>
    );
  }

  const canRedeem =
    config &&
    invitationInfo &&
    invitationInfo.balance >= config.redeemThreshold;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
          推广码与积分
        </h2>
        <button
          type='button'
          onClick={fetchData}
          disabled={loading}
          className='inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50'
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          刷新
        </button>
      </div>

      {invitationInfo && (
        <>
          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <Users className='w-6 h-6 text-blue-600 dark:text-blue-400' />
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                我的推广码
              </h3>
            </div>

            <div className='space-y-4'>
              <div className='flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                <div>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                    专属推广码
                  </p>
                  <code className='text-lg font-mono font-bold text-blue-800 dark:text-blue-200'>
                    {invitationInfo.code}
                  </code>
                </div>
                <button
                  type='button'
                  onClick={() => copyToClipboard(invitationInfo.code)}
                  className='p-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors'
                  title='复制推广码'
                >
                  <Copy className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                </button>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <Gift className='w-6 h-6 text-green-600 dark:text-green-400' />
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                积分信息
              </h3>
            </div>

            <div className='grid grid-cols-3 gap-4'>
              <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center'>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                  当前积分
                </p>
                <p className='text-2xl font-bold text-green-700 dark:text-green-300'>
                  {invitationInfo.balance}
                </p>
              </div>
              <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center'>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                  邀请人数
                </p>
                <p className='text-2xl font-bold text-blue-700 dark:text-blue-300'>
                  {invitationInfo.totalInvites}
                </p>
              </div>
              <div className='p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center'>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                  累计获得
                </p>
                <p className='text-2xl font-bold text-purple-700 dark:text-purple-300'>
                  {invitationInfo.totalRewards}
                </p>
              </div>
            </div>
          </div>

          {config && (
            <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
              <div className='flex items-center gap-3 mb-4'>
                <Gift className='w-6 h-6 text-orange-600 dark:text-orange-400' />
                <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                  积分兑换
                </h3>
              </div>

              <div className='p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-4'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    兑换门槛
                  </span>
                  <span className='font-medium text-orange-700 dark:text-orange-300'>
                    {config.redeemThreshold} 积分
                  </span>
                </div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    邀请奖励
                  </span>
                  <span className='font-medium text-green-700 dark:text-green-300'>
                    {config.rewardPoints} 积分/人
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    兑换卡密类型
                  </span>
                  <span className='font-medium text-blue-700 dark:text-blue-300'>
                    {cardKeyTypeLabels[config.cardKeyType] ||
                      config.cardKeyType}
                  </span>
                </div>
              </div>

              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>
                  您的积分：
                  <span className='font-bold text-gray-900 dark:text-gray-100'>
                    {invitationInfo.balance}
                  </span>{' '}
                  / {config.redeemThreshold}
                </span>
                <div className='w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden'>
                  <div
                    className={`h-full transition-all ${
                      canRedeem ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (invitationInfo.balance / config.redeemThreshold) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {redeemResult && (
                <div
                  className={`p-4 rounded-lg mb-4 ${
                    redeemResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    {redeemResult.success ? (
                      <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />
                    ) : (
                      <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400' />
                    )}
                    <span
                      className={`text-sm ${
                        redeemResult.success
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}
                    >
                      {redeemResult.message}
                    </span>
                  </div>
                  {redeemResult.success && redeemResult.cardKey && (
                    <div className='mt-3 flex items-center gap-2'>
                      <code className='px-3 py-1 bg-white dark:bg-gray-800 rounded text-sm font-mono'>
                        {redeemResult.cardKey}
                      </code>
                      <button
                        type='button'
                        onClick={() => copyToClipboard(redeemResult.cardKey!)}
                        className='p-1 hover:bg-green-100 dark:hover:bg-green-900/40 rounded transition-colors'
                        title='复制卡密'
                      >
                        <Copy className='w-4 h-4 text-green-600 dark:text-green-400' />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type='button'
                onClick={handleRedeem}
                disabled={!canRedeem || redeeming}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  canRedeem
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {redeeming
                  ? '兑换中...'
                  : canRedeem
                    ? `兑换 ${cardKeyTypeLabels[config.cardKeyType] || config.cardKeyType}`
                    : `积分不足（还需 ${config.redeemThreshold - invitationInfo.balance} 积分）`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
