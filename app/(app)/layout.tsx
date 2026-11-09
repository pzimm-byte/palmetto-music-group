import { requireMember } from '@/lib/auth/session';
import { TabBar } from '@/components/TabBar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireMember();
  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
