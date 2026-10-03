import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { getSessionUser } from '@/lib/auth/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  return (
    <AppLayout user={session}>
      {children}
    </AppLayout>
  );
}
