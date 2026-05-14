'use client';

import { useState, useEffect } from 'react';
import { addTransaction, rollTransaction } from '@/actions/transaction';
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
  const [action, setAction] = useState<'BUY' | 'SELL' | 'EXERCISE' | 'ASSIGNMENT' | 'EXPIRATION' | 'ROLL' | 'SPREAD'>(initialAction);

  const [tradeDate, setTradeDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [price, setPrice] = useState<string>('');
  const [expiration, setExpiration] = useState<string>(initialExpiration);
  
  // States specific to ROLL
  const [posDir, setPosDir] = useState<'LONG' | 'SHORT'>('SHORT');
  const [oldPrice, setOldPrice] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newStrike, setNewStrike] = useState<string>('');
  const [newExp, setNewExp] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');

  // States specific to SPREAD
  const [spreadType, setSpreadType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [spreadStrike1, setSpreadStrike1] = useState<string>('');
  const [spreadPrice1, setSpreadPrice1] = useState<string>('');
  const [spreadExp1, setSpreadExp1] = useState<string>(initialExpiration);
  const [spreadStrike2, setSpreadStrike2] = useState<string>('');
  const [spreadPrice2, setSpreadPrice2] = useState<string>('');
  const [spreadExp2, setSpreadExp2] = useState<string>(initialExpiration);

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

  // Calculations
  const qtyNum = Number(quantity) || 0;
  const multiplier = assetType === 'STOCK' ? 1 : 100; // Simplified
  
  // Roll Summary Calculation
  const oldPriceNum = Number(oldPrice) || 0;
  const newPriceNum = Number(newPrice) || 0;
  let netPremium = 0;
  if (posDir === 'LONG') {
    netPremium = (oldPriceNum * qtyNum * multiplier) - (newPriceNum * qtyNum * multiplier);
  } else {
    netPremium = (newPriceNum * qtyNum * multiplier) - (oldPriceNum * qtyNum * multiplier);
  }

  // Spread Summary Calculation
  const spPrice1Num = Number(spreadPrice1) || 0;
  const spPrice2Num = Number(spreadPrice2) || 0;
  let spreadNetPremium = 0;
  if (spreadType === 'CREDIT') {
    spreadNetPremium = (spPrice1Num * qtyNum * multiplier) - (spPrice2Num * qtyNum * multiplier);
  } else {
    spreadNetPremium = (spPrice2Num * qtyNum * multiplier) - (spPrice1Num * qtyNum * multiplier);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const dateStr = isDateForced ? tradeDate : (formData.get('tradeDate') as string);
    const qty = Math.abs(Number(formData.get('quantity')));
    const fFees = Number(formData.get('fees') || 0);
    const fMult = Number(formData.get('multiplier') || multiplier);
    const symbolStr = (formData.get('symbol') as string).toUpperCase();

    if (action === 'ROLL') {
      const leg1Action = posDir === 'LONG' ? 'SELL' : 'BUY';
      const leg2Action = posDir === 'LONG' ? 'BUY' : 'SELL';
      
      const leg1 = {
        tradeDate: new Date(dateStr),
        symbol: symbolStr,
        assetType,
        action: leg1Action,
        quantity: qty,
        price: Number(oldPrice),
        strike: Number(initialStrike),
        expiration: new Date(initialExpiration),
        multiplier: fMult,
        fees: fFees / 2, // split fees
      };
      
      const leg2 = {
        tradeDate: new Date(dateStr),
        symbol: symbolStr,
        assetType,
        action: leg2Action,
        quantity: qty,
        price: Number(newPrice),
        strike: Number(newStrike),
        expiration: new Date(newExp),
        multiplier: fMult,
        fees: fFees / 2,
      };

      const res = await rollTransaction([leg1, leg2]);
      setLoading(false);
      if (res.success) {
        router.push('/');
      } else {
        alert(res.error || t.failed);
      }
      return;
    }

    if (action === 'SPREAD') {
      const leg1Action = spreadType === 'CREDIT' ? 'SELL' : 'BUY';
      const leg2Action = spreadType === 'CREDIT' ? 'BUY' : 'SELL';
      
      const leg1 = {
        tradeDate: new Date(dateStr),
        symbol: symbolStr,
        assetType,
        action: leg1Action,
        quantity: qty,
        price: Number(spreadPrice1),
        strike: Number(spreadStrike1),
        expiration: spreadExp1 ? new Date(spreadExp1) : new Date(),
        multiplier: fMult,
        fees: fFees / 2,
      };
      
      const leg2 = {
        tradeDate: new Date(dateStr),
        symbol: symbolStr,
        assetType,
        action: leg2Action,
        quantity: qty,
        price: Number(spreadPrice2),
        strike: Number(spreadStrike2),
        expiration: spreadExp2 ? new Date(spreadExp2) : new Date(),
        multiplier: fMult,
        fees: fFees / 2,
      };

      const res = await rollTransaction([leg1, leg2]);
      setLoading(false);
      if (res.success) {
        router.push('/');
      } else {
        alert(res.error || t.failed);
      }
      return;
    }

    const submittedPrice = isPriceForcedZero ? 0 : Number(formData.get('price'));

    const data = {
      tradeDate: new Date(dateStr),
      symbol: symbolStr,
      assetType,
      action,
      quantity: qty,
      price: submittedPrice,
      strike: formData.get('strike') ? Number(formData.get('strike')) : undefined,
      expiration: expiration ? new Date(expiration) : undefined,
      multiplier: formData.get('multiplier') ? Number(formData.get('multiplier')) : (assetType === 'STOCK' ? 1 : 100),
      fees: fFees,
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
              disabled={action === 'ROLL' || action === 'SPREAD'}
              className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
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
              disabled={action === 'ROLL'}
              className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
            >
              <option value="BUY">{t.buy}</option>
              <option value="SELL">{t.sell}</option>
              {assetType !== 'STOCK' && <option value="EXERCISE">{t.exercise}</option>}
              {assetType !== 'STOCK' && <option value="ASSIGNMENT">{t.assignment}</option>}
              {assetType !== 'STOCK' && <option value="EXPIRATION">{t.expire}</option>}
              {assetType !== 'STOCK' && <option value="ROLL">{t.roll}</option>}
              {assetType !== 'STOCK' && <option value="SPREAD">{t.spread}</option>}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t.symbol}</label>
            <input required type="text" name="symbol" defaultValue={initialSymbol} readOnly={action === 'ROLL'} placeholder="AAPL" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm uppercase focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50" />
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

        <div className="space-y-1">
          <label className="text-sm font-medium">{t.quantity} {assetType !== 'STOCK' && t.contracts}</label>
          <input 
            required 
            type="number" 
            name="quantity" 
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1" step="1" placeholder="10" 
            className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
          />
        </div>

        {action === 'ROLL' ? (
          <div className="space-y-6">
            {/* Position Direction Toggle */}
            <div className="space-y-1">
              <label className="text-sm font-medium">{t.positionDirection}</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPosDir('LONG')} className={`flex-1 py-2 text-sm rounded-md border ${posDir === 'LONG' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border text-muted-foreground'}`}>{t.long}</button>
                <button type="button" onClick={() => setPosDir('SHORT')} className={`flex-1 py-2 text-sm rounded-md border ${posDir === 'SHORT' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border text-muted-foreground'}`}>{t.short}</button>
              </div>
            </div>

            {/* Leg 1: Close */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
              <h3 className="text-sm font-semibold">{t.leg1}</h3>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{t.strikePrice}: {initialStrike}</span>
                <span>{t.expiration}: {initialExpiration}</span>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-purple-400">{t.oldPrice}</label>
                <input required type="number" value={oldPrice} onChange={e => setOldPrice(e.target.value)} min="0" step="0.0001" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>

            {/* Leg 2: Open */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
              <h3 className="text-sm font-semibold">{t.leg2}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-purple-400">{t.newStrike}</label>
                  <input required type="number" value={newStrike} onChange={e => setNewStrike(e.target.value)} min="0" step="0.5" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-purple-400">{t.newExpiration}</label>
                  <input required type="date" value={newExp} onChange={e => setNewExp(e.target.value)} className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-purple-400">{t.newPrice}</label>
                <input required type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} min="0" step="0.0001" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>
            
            {/* Net Premium Box */}
            <div className={`p-4 rounded-lg border flex justify-between items-center ${netPremium >= 0 ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
              <span className="text-sm font-medium">{t.rollSummary}</span>
              <span className="text-lg font-bold flex flex-col items-end">
                {netPremium >= 0 ? `+ $${netPremium.toFixed(2)}` : `- $${Math.abs(netPremium).toFixed(2)}`}
                <span className="text-xs opacity-80">{netPremium >= 0 ? t.netCredit : t.netDebit}</span>
              </span>
            </div>
          </div>
        ) : action === 'SPREAD' ? (
          <div className="space-y-6">
            {/* Spread Type Toggle */}
            <div className="space-y-1">
              <label className="text-sm font-medium">{t.spreadType}</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSpreadType('CREDIT')} className={`flex-1 py-2 text-sm rounded-md border ${spreadType === 'CREDIT' ? 'bg-success text-success-foreground border-success' : 'bg-transparent border-border text-muted-foreground'}`}>{t.creditSpread}</button>
                <button type="button" onClick={() => setSpreadType('DEBIT')} className={`flex-1 py-2 text-sm rounded-md border ${spreadType === 'DEBIT' ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-transparent border-border text-muted-foreground'}`}>{t.debitSpread}</button>
              </div>
            </div>
            
            {/* Leg 1: Main */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
              <h3 className="text-sm font-semibold">{t.mainLeg} ({spreadType === 'CREDIT' ? t.sellLeg : t.buyLeg})</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-purple-400">{t.strikePrice}</label>
                  <input required type="number" value={spreadStrike1} onChange={e => setSpreadStrike1(e.target.value)} min="0" step="0.5" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-purple-400">{t.expiration}</label>
                  <input required type="date" value={spreadExp1} onChange={e => {
                    const newVal = e.target.value;
                    setSpreadExp1(newVal);
                    if (!spreadExp2 || spreadExp2 === spreadExp1) setSpreadExp2(newVal);
                  }} className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-purple-400">{t.price}</label>
                <input required type="number" value={spreadPrice1} onChange={e => setSpreadPrice1(e.target.value)} min="0" step="0.0001" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>

            {/* Leg 2: Hedge */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
              <h3 className="text-sm font-semibold">{t.hedgeLeg} ({spreadType === 'CREDIT' ? t.buyLeg : t.sellLeg})</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-purple-400">{t.strikePrice}</label>
                  <input required type="number" value={spreadStrike2} onChange={e => setSpreadStrike2(e.target.value)} min="0" step="0.5" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-purple-400">{t.expiration}</label>
                  <input required type="date" value={spreadExp2} onChange={e => setSpreadExp2(e.target.value)} className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-purple-400">{t.price}</label>
                <input required type="number" value={spreadPrice2} onChange={e => setSpreadPrice2(e.target.value)} min="0" step="0.0001" className="w-full bg-input border-transparent rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>
            
            {/* Net Premium Box */}
            <div className={`p-4 rounded-lg border flex justify-between items-center ${spreadNetPremium >= 0 ? 'bg-success/10 border-success/30 text-success' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
              <span className="text-sm font-medium">{t.spreadSummary}</span>
              <span className="text-lg font-bold flex flex-col items-end">
                {spreadNetPremium >= 0 ? `+ $${spreadNetPremium.toFixed(2)}` : `- $${Math.abs(spreadNetPremium).toFixed(2)}`}
                <span className="text-xs opacity-80">{spreadNetPremium >= 0 ? t.netCredit : t.netDebit}</span>
              </span>
            </div>
          </div>
        ) : (
          <>
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
          </>
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
