export const dynamic = 'force-dynamic';
import { getAllTransactions } from '@/actions/transaction';
import { analyzePortfolio, calculateAnnualizedROIC } from '@/lib/portfolioUtils';
import { getBatchPrices, getBenchmarkHistory } from '@/lib/marketData';
import { getDict } from '@/lib/i18n';
import { Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import DashboardClient from '@/components/DashboardClient';
import { analyzePerformanceHistory } from '@/lib/portfolioUtils';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value || 'zh';
  const t = getDict(lang);

  const transactions = await getAllTransactions();
  const summary = analyzePortfolio(transactions);
  const performanceHistory = analyzePerformanceHistory(transactions);

  // Fetch real-time market data — deduplicate symbol requests
  const uniqueSymbols = [...new Set(summary.positions.map(p => p.symbol))];
  const priceMap = await getBatchPrices(uniqueSymbols);

  const positionsWithLivePrice = summary.positions.map((pos) => {
    const livePrice = priceMap.get(pos.symbol) || pos.averageCost;
    const currentPrice = livePrice;

    let unrealizedPnL = 0;
    if (pos.assetType === 'STOCK') {
      unrealizedPnL = (currentPrice - pos.averageCost) * pos.quantity;
    }
    // Note: Option unrealized PnL requires option chain data (not yet supported)

    return {
      ...pos,
      currentPrice,
      unrealizedPnL,
    };
  });

  const totalUnrealizedPnL = positionsWithLivePrice.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalPnL = summary.totalRealizedPnL + totalUnrealizedPnL;
  const roic = summary.historicalMaxCapitalDeployed > 0 ? (totalPnL / summary.historicalMaxCapitalDeployed) : 0;
  const annualizedRoic = calculateAnnualizedROIC(roic, summary.firstTradeDate);

  // Fetch benchmark data
  let sp500Data: any[] = [];
  let nasdaqData: any[] = [];
  if (summary.firstTradeDate) {
    const [sp500, ndx] = await Promise.all([
      getBenchmarkHistory('^GSPC', summary.firstTradeDate),
      getBenchmarkHistory('^NDX', summary.firstTradeDate)
    ]);
    sp500Data = sp500;
    nasdaqData = ndx;
  }

  return (
    <main className="w-full min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.portfolio}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <Settings size={20} />
          </Link>
          <Link 
            href="/trade" 
            className="bg-primary hover:bg-blue-600 text-primary-foreground px-4 py-2 rounded-full font-medium flex items-center shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} className="mr-1" /> {t.newTrade}
          </Link>
        </div>
      </header>

      <DashboardClient 
        dict={t}
        summary={summary}
        performanceHistory={performanceHistory}
        positionsWithLivePrice={positionsWithLivePrice}
        transactions={transactions}
        sp500Data={sp500Data}
        nasdaqData={nasdaqData}
        totalPnL={totalPnL}
        totalUnrealizedPnL={totalUnrealizedPnL}
        roic={roic}
        annualizedRoic={annualizedRoic}
        lang={lang}
      />
    </main>
  );
}
