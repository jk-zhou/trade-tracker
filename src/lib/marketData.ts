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
