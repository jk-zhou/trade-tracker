import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();
yf.historical('^GSPC', { period1: '2024-01-01' }).then(res => console.log(res[0])).catch(console.error);
