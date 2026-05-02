import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();
yf.quote('AAPL').then(q => console.log(q.regularMarketPrice));
