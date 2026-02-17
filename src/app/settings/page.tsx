/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

'use client';

import PageLayout from '@/components/PageLayout';
import UserCardKeyBinding from '@/components/UserCardKeyBinding';
import UserRedeemedCardKeys from '@/components/UserRedeemedCardKeys';
import UserReferralInfo from '@/components/UserReferralInfo';

export default function SettingsPage() {
  return (
    <PageLayout>
      <div className='max-w-4xl mx-auto p-6 space-y-8'>
        <UserReferralInfo />
        <UserRedeemedCardKeys />
        <UserCardKeyBinding />
      </div>
    </PageLayout>
  );
}
