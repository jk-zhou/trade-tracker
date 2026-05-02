export const dynamic = 'force-dynamic';
import { getAllTransactions } from '@/actions/transaction';
import HistoryClient from './HistoryClient';
import { cookies } from 'next/headers';

export default async function HistoryPage() {
  const transactions = await getAllTransactions();
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'zh';

  return (
    <main className="min-h-screen bg-background">
      <HistoryClient initialTransactions={transactions} lang={lang} />
    </main>
  );
}
