'use client';

import { useState, useEffect } from 'react';
import { addTransaction } from '@/actions/transaction';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getDict } from '@/lib/i18n';

export default function TransactionForm({ lang = 'zh' }: { lang?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = getDict(lang);
  const [loading, setLoading] = useState(false);

  const initialAssetType = (searchParams.get('assetType') as any) || 'STOCK';
  const initialAction = (searchParams.get('action') as any) || 'BUY';
  const initialSymbol = searchParams.get('symbol') || '';
  const initialStrike = searchParams.get('strike') || '';
  const initialExpiration = searchParams.get('expiration')?.split('T')[0] || '';

  const [assetType, setAssetType] = useState<'STOCK' | 'CALL' | 'PUT'>(initialAssetType);
  const [action, setAction] = useState<'BUY' | 'SELL' | 'EXERCISE' | 'ASSIGNMENT' | 'EXPIRATION'>(initialAction);

  const [tradeDate, setTradeDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [price, setPrice] = useState<string>('');
  const [expiration, setExpiration] = useState<string>(initialExpiration);

  const isPriceForcedZero = action === 'EXERCISE' || action === 'ASSIGNMENT' || action === 'EXPIRATION';
  const isDateForced = action === 'EXPIRATION';

  useEffect(() => {
    if (isPriceForcedZero) {
      setPrice('0');
    }
    
    if (isDateForced && expiration) {
      setTradeDate(`${expiration}T16:00`);
    }
  }, [action, expiration, isPriceForcedZero, isDateForced]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const dateStr = isDateForced ? tradeDate : (formData.get('tradeDate') as string);
    const submittedPrice = isPriceForcedZero ? 0 : Number(formData.get('price'));
    
    const qty = Math.abs(Number(formData.get('quantity')));

    const data = {
      tradeDate: new Date(dateStr),
      symbol: (formData.get('symbol') as string).toUpperCase(),
      assetType,
      action,
      quantity: qty,
      price: submittedPrice,
      strike: formData.get('strike') ? Number(formData.get('strike')) : undefined,
      expiration: expiration ? new Date(expiration) : undefined,
      multiplier: formData.get('multiplier') ? Number(formData.get('multiplier')) : (assetType === 'STOCK' ? 1 : 100),
      fees: Number(formData.get('fees') || 0),
    };

    const res = await addTransaction(data);
    setLoading(false);

    if (res.success) {
      router.push('/');
    } else {
      alert(res.error || t.failed);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-8 space-y-6">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} className="mr-1" /> {t.back}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground text-sm">{t.formSubtitle}</p>
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
            <input required type="text" name="symbol" defaultValue={initialSymbol} placeholder="AAPL" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm uppercase focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.tradeDate}</label>
            <input 
              required 
              type="datetime-local" 
              name="tradeDate" 
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              readOnly={isDateForced}
              className={`w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none [&::-webkit-calendar-picker-indicator]:filter-[invert(1)] ${isDateForced ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.quantity} {assetType !== 'STOCK' && t.contracts}</label>
            <input required type="number" name="quantity" min="1" step="1" placeholder="10" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.price}</label>
            <input 
              required 
              type="number" 
              name="price" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              readOnly={isPriceForcedZero}
              min="0" 
              step="0.0001" 
              placeholder="150.00" 
              className={`w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none ${isPriceForcedZero ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        {assetType !== 'STOCK' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-background/50 rounded-lg border border-border/50">
            <div className="space-y-1">
              <label className="text-sm font-medium text-purple-400">{t.strikePrice}</label>
              <input required type="number" name="strike" defaultValue={initialStrike} min="0" step="0.5" placeholder="155.00" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-purple-400">{t.expiration}</label>
              <input 
                required 
                type="date" 
                name="expiration" 
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]" 
              />
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

        {(action === 'EXERCISE' || action === 'ASSIGNMENT') && (
          <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-md text-sm text-success-foreground">
            <strong>{lang === 'zh' ? '自动化提示：' : 'Auto-Sync:'}</strong> {lang === 'zh' 
              ? '系统已自动为您计算并记录了对应的正股买入/卖出交易（按行权价计算），无需手动添加。' 
              : 'The system has automatically recorded the corresponding stock BUY/SELL transaction at the strike price for you.'}
          </div>
        )}
      </form>
    </div>
  );
}
