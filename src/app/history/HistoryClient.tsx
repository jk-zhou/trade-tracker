'use client';

import { Transaction } from '@prisma/client';
import { deleteTransaction } from '@/actions/transaction';
import { formatUTCDate } from '@/lib/portfolioUtils';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const DICT = {
  en: {
    back: 'Back to Dashboard',
    title: 'Transaction History',
    subtitle: 'Deleting a transaction recalculates all metrics.',
    confirmDelete: 'Are you sure you want to delete this transaction? This will recalculate all PnL.',
    failedDelete: 'Failed to delete transaction',
    units: 'Units',
    strike: 'Strike',
    fees: 'Fees',
    empty: 'No transactions found.',
    buy: 'BUY',
    sell: 'SELL',
  },
  zh: {
    back: '返回控制面板',
    title: '交易历史记录',
    subtitle: '删除交易将重新计算所有指标。',
    confirmDelete: '确定要删除此交易吗？这将重新计算所有盈亏。',
    failedDelete: '删除交易失败',
    units: '单位',
    strike: '行权价',
    fees: '费用',
    empty: '未找到交易记录。',
    buy: '买入',
    sell: '卖出',
  }
};

export default function HistoryClient({ initialTransactions, lang = 'zh' }: { initialTransactions: Transaction[], lang?: string }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const t_dict = DICT[lang as keyof typeof DICT] || DICT.zh;

  const handleDelete = async (id: string) => {
    if (!confirm(t_dict.confirmDelete)) return;
    
    const res = await deleteTransaction(id);
    if (res.success) {
      setTransactions(transactions.filter(t => t.id !== id));
    } else {
      alert(t_dict.failedDelete);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} className="mr-1" /> {t_dict.back}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{t_dict.title}</h1>
        <p className="text-muted-foreground text-sm">{t_dict.subtitle}</p>
      </div>

      <div className="space-y-4">
        {transactions.map((t) => (
          <div key={t.id} className="bg-card border border-border p-4 rounded-xl flex justify-between items-center group">
            <div>
              <div className="font-semibold text-lg flex items-center gap-2">
                {t.symbol} 
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {t.assetType}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  t.action === 'BUY' ? 'text-success bg-success/10' :
                  t.action === 'SELL' ? 'text-destructive bg-destructive/10' :
                  'text-primary bg-primary/10'
                }`}>
                  {t.action === 'BUY' ? t_dict.buy : t.action === 'SELL' ? t_dict.sell : t.action}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {t.quantity} {t_dict.units} @ {formatCurrency(t.price)}
                {t.strike && ` • ${t_dict.strike} ${t.strike}`}
                {t.fees > 0 && ` • ${t_dict.fees} ${formatCurrency(t.fees)}`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatUTCDate(t.tradeDate, 'PP')}
              </div>
            </div>

            <button 
              onClick={() => handleDelete(t.id)}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
              title="Delete Transaction"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl border-dashed">
            {t_dict.empty}
          </div>
        )}
      </div>
    </div>
  );
}
