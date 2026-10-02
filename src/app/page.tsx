import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/auth';

export default async function HomePage() {
  const session = await getSessionUser();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'ADMIN') {
    redirect('/admin/dashboard');
  }

  redirect('/dashboard');
}
