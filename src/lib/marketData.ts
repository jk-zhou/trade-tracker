import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const quote = await yahooFinance.quote(symbol);
    return (quote as any).regularMarketPrice ?? null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch prices for multiple symbols in parallel, deduplicating identical symbols.
 * Returns a Map of symbol -> price.
 */
export async function getBatchPrices(symbols: string[]): Promise<Map<string, number | null>> {
  const unique = [...new Set(symbols)];
  const results = new Map<string, number | null>();

  await Promise.all(
    unique.map(async (sym) => {
      results.set(sym, await getCurrentPrice(sym));
    })
  );

  return results;
}

export async function getBenchmarkHistory(symbol: string, startDate: Date) {
  try {
    let period1: Date;

    // Ensure period1 is strictly before now to avoid InvalidOptionsError
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 3600 * 24);

    if (diffDays < 3) {
      // Use 3 days before now (correctly computed from `now`)
      period1 = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
    } else {
      period1 = new Date(startDate);
    }

    const result = await yahooFinance.chart(symbol, {
      period1: period1.toISOString().split('T')[0],
    });
    return result.quotes || [];
  } catch (error) {
    console.error(`Failed to fetch historical benchmark for ${symbol}:`, error);
    return [];
  }
}
