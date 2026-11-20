// Server-Sent Events: pushes "products changed" to every open storefront instantly
const clients = new Set();
exports.handler = (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write('retry: 3000\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
};
exports.broadcast = (type) => { for (const c of clients) c.write(`event: ${type}\ndata: ${Date.now()}\n\n`); };
