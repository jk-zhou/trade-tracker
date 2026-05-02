'use client';

import { useState } from 'react';
import { addTransaction } from '@/actions/transaction';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const DICT = {
  en: {
    back: 'Back to Dashboard',
    title: 'New Trade',
    subtitle: 'Enter transaction details below',
    assetType: 'Asset Type',
    action: 'Action',
    symbol: 'Symbol',
    tradeDate: 'Trade Date',
    quantity: 'Quantity',
    contracts: '(Contracts)',
    price: 'Price',
    strike: 'Strike Price',
    expiration: 'Expiration',
    fees: 'Total Fees (Commissions)',
    saving: 'Saving...',
    submit: 'Submit Trade',
    stock: 'Stock',
    call: 'Call Option',
    put: 'Put Option',
    buy: 'Buy',
    sell: 'Sell',
    exercise: 'Exercise',
    assignment: 'Assignment',
    expire: 'Expire',
    failed: 'Failed to add transaction',
  },
  zh: {
    back: '返回控制面板',
    title: '新建交易',
    subtitle: '在下方输入交易详情',
    assetType: '资产类型',
    action: '操作',
    symbol: '代码',
    tradeDate: '交易日期',
    quantity: '数量',
    contracts: '(合约数)',
    price: '价格',
    strike: '行权价',
    expiration: '到期日',
    fees: '总费用 (佣金)',
    saving: '保存中...',
    submit: '提交交易',
    stock: '股票',
    call: '看涨期权 (Call)',
    put: '看跌期权 (Put)',
    buy: '买入 (Buy)',
    sell: '卖出 (Sell)',
    exercise: '行权 (Exercise)',
    assignment: '指派 (Assignment)',
    expire: '到期归零 (Expire)',
    failed: '添加交易失败',
  }
};

export default function TransactionForm({ lang = 'zh' }: { lang?: string }) {
  const router = useRouter();
  const t = DICT[lang as keyof typeof DICT] || DICT.zh;
  const [loading, setLoading] = useState(false);
  const [assetType, setAssetType] = useState<'STOCK' | 'CALL' | 'PUT'>('STOCK');
  const [action, setAction] = useState<'BUY' | 'SELL' | 'EXERCISE' | 'ASSIGNMENT' | 'EXPIRATION'>('BUY');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get('tradeDate') as string;
    
    let qty = Number(formData.get('quantity'));
    if (action === 'SELL') {
      qty = -Math.abs(qty); 
    } else {
      qty = Math.abs(qty); 
    }

    const data = {
      tradeDate: new Date(dateStr),
      symbol: (formData.get('symbol') as string).toUpperCase(),
      assetType,
      action,
      quantity: qty,
      price: Number(formData.get('price')),
      strike: formData.get('strike') ? Number(formData.get('strike')) : undefined,
      expiration: formData.get('expiration') ? new Date(formData.get('expiration') as string) : undefined,
      multiplier: formData.get('multiplier') ? Number(formData.get('multiplier')) : (assetType === 'STOCK' ? 1 : 100),
      fees: Number(formData.get('fees') || 0),
    };

    const res = await addTransaction(data);
    setLoading(false);

    if (res.success) {
      router.push('/');
    } else {
      alert(t.failed);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-8 space-y-6">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} className="mr-1" /> {t.back}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground text-sm">{t.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.assetType}</label>
            <select 
              value={assetType} 
              onChange={(e) => setAssetType(e.target.value as any)}
              className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="STOCK">{t.stock}</option>
              <option value="CALL">{t.call}</option>
              <option value="PUT">{t.put}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.action}</label>
            <select 
              value={action} 
              onChange={(e) => setAction(e.target.value as any)}
              className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="BUY">{t.buy}</option>
              <option value="SELL">{t.sell}</option>
              {assetType !== 'STOCK' && <option value="EXERCISE">{t.exercise}</option>}
              {assetType !== 'STOCK' && <option value="ASSIGNMENT">{t.assignment}</option>}
              {assetType !== 'STOCK' && <option value="EXPIRATION">{t.expire}</option>}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.symbol}</label>
            <input required type="text" name="symbol" placeholder="AAPL" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm uppercase focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.tradeDate}</label>
            <input required type="date" name="tradeDate" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.quantity} {assetType !== 'STOCK' && t.contracts}</label>
            <input required type="number" name="quantity" min="1" step="1" placeholder="10" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.price}</label>
            <input required type="number" name="price" min="0" step="0.0001" placeholder="150.00" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
        </div>

        {assetType !== 'STOCK' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-background/50 rounded-lg border border-border/50">
            <div className="space-y-1">
              <label className="text-sm font-medium text-purple-400">{t.strike}</label>
              <input required type="number" name="strike" min="0" step="0.5" placeholder="155.00" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-purple-400">{t.expiration}</label>
              <input required type="date" name="expiration" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]" />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">{t.fees}</label>
          <input type="number" name="fees" step="0.01" defaultValue="0" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-6 bg-primary hover:bg-blue-600 text-primary-foreground font-semibold py-3 rounded-md transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
        >
          {loading ? t.saving : t.submit}
        </button>
      </form>
    </div>
  );
}
