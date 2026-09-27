import http from 'node:http';

const port = Number(process.env.PORT ?? 4173);
const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const candidate = url.pathname.startsWith('/candidate');
  const target = candidate ? 'candidate' : 'control';
  const fixed = process.env.DEMO_FIXED === '1';
  if (url.pathname.endsWith('/api/health')) {
    response.writeHead(200, { 'content-type': 'application/json' });
    return response.end(JSON.stringify({ healthy: true, target }));
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Two Bars Bookshop</title>
  <style>body{font:18px/1.6 system-ui;background:#f5f6f2;color:#172c34;margin:0}main{max-width:760px;margin:60px auto;padding:24px}h1{font-size:48px;line-height:1.1}small{color:#15705b;letter-spacing:.12em;text-transform:uppercase}section{background:white;border:1px solid #d6dfde;border-radius:16px;padding:24px;margin:20px 0}button{background:#15705b;color:white;border:0;border-radius:8px;padding:12px 18px;font:inherit;cursor:pointer}a{color:#15705b}.price{font-size:28px;font-weight:700}</style>
  <main><small>Playwright Two Bars / ${target}</small><h1>The little bookshop.</h1><p>A tiny application with a healthy feature, a new regression, and a shared failure.</p>
  <section><h2>A Field Guide to Testing</h2><p>One book. Fewer surprises.</p><p class="price">$24.00</p><button id="add">Add to cart</button><p role="status">Cart: 0 items</p></section>
  <section><h2>Delivery estimate</h2><p data-testid="delivery">${candidate && !fixed ? 'Delivery unavailable' : 'Arrives in 3 days'}</p></section>
  <section><h2>Reader rewards</h2><p data-testid="rewards">${fixed ? 'Rewards online' : 'Rewards temporarily unavailable'}</p></section>
  <p><a href="/control/">Control</a> · <a href="/candidate/">Candidate</a></p></main>
  <script>let count=0;document.querySelector('#add').onclick=()=>{count++;document.querySelector('[role=status]').textContent='Cart: '+count+' items'};</script></html>`);
});
server.listen(port, '127.0.0.1', () => console.log(`Bookshop demo: http://127.0.0.1:${port}/control/`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close());
