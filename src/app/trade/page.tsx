import TransactionForm from '@/components/TransactionForm';
import { cookies } from 'next/headers';

export default async function TradePage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'zh';

  return (
    <main className="min-h-screen bg-background">
      <TransactionForm lang={lang} />
    </main>
  );
}
