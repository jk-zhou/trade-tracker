import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();
yf.historical('^GSPC', { period1: new Date() }).then(res => console.log('success')).catch(e => console.error(e.message));
