import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();
async function test() {
  try {
    const res = await yf.chart('^GSPC', { period1: '2024-01-01' });
    console.log('chart works', res.quotes[0]);
  } catch (e) {
    console.error('chart failed:', e.message);
  }
}
test();
