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

export async function getBenchmarkHistory(symbol: string, startDate: Date) {
  try {
    let period1 = new Date(startDate);
    
    // Ensure period1 is strictly less than period2 (now) to avoid InvalidOptionsError
    const now = new Date();
    const diffDays = (now.getTime() - period1.getTime()) / (1000 * 3600 * 24);
    if (diffDays < 3) {
      period1.setDate(now.getDate() - 3);
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

