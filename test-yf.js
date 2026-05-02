const yf = require('yahoo-finance2').default;
async function test() {
  try {
    await yf.historical('^GSPC', { period1: new Date() });
    console.log('Date works');
  } catch (e) {
    console.error('Date failed:', e.message);
  }
  try {
    await yf.historical('^GSPC', { period1: '2024-01-01' });
    console.log('String works');
  } catch (e) {
    console.error('String failed:', e.message);
  }
}
test();
