import YahooFinance from 'yahoo-finance2';

async function test() {
  const yf = new YahooFinance();
  try {
    const res = await yf.historical('AAPL', { period1: '2023-01-01', period2: '2023-01-05' });
    console.log('Stock historical:', res.length);
  } catch (e) {
    console.error('Stock error', e);
  }

  try {
    // A known past option symbol or just a test
    const quote = await yf.quote('AAPL250117C00150000');
    console.log('Option quote:', quote?.regularMarketPrice);
    
    const res2 = await yf.historical('AAPL250117C00150000', { period1: '2024-01-01', period2: '2024-01-05' });
    console.log('Option historical:', res2.length);
  } catch (e) {
    console.error('Option error', e);
  }
}

test();
