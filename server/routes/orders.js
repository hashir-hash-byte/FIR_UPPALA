const router = require('express').Router();
const db = require('../db/store');
const requireAdmin = require('../middleware/auth');
const { broadcast } = require('../events');

const clean = (v, max = 200) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);

function validateCustomer(c = {}) {
  const out = {
    name: clean(c.name, 80), phone: String(c.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''),
    address: clean(c.address, 300), landmark: clean(c.landmark, 100), city: clean(c.city, 80),
    pincode: String(c.pincode || '').replace(/\D/g, ''), note: clean(c.note, 200),
  };
  if (out.name.length < 2) return { error: 'Please enter your name' };
  if (!/^[6-9]\d{9}$/.test(out.phone)) return { error: 'Enter a valid 10-digit mobile number' };
  if (out.address.length < 6) return { error: 'Please enter your full address' };
  if (out.city.length < 2) return { error: 'Please enter your city / town' };
  if (!/^\d{6}$/.test(out.pincode)) return { error: 'Enter a valid 6-digit pincode' };
  return { value: out };
}

// Customer places an order (with delivery details) → saved, then WhatsApp link with everything pre-filled
router.post('/', async (req, res) => {
  const { items = [] } = req.body || {};
  const v = validateCustomer(req.body.customer);
  if (v.error) return res.status(400).json({ error: v.error });
  if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
  const customer = v.value;

  const lines = []; let total = 0;
  for (const it of items) {
    const p = await db.get('products', it.productId);
    if (!p || p.inStock === false) continue;
    const size = Number(it.size);
    if (!p.sizes.includes(size)) return res.status(400).json({ error: `Size ${it.size} is not available for ${p.name}` });
    const qty = Math.min(10, Math.max(1, Number(it.qty) || 1));
    total += p.price * qty;
    lines.push({ productId: p.id, name: p.name, brand: p.brand, size, qty, price: p.price });
  }
  if (!lines.length) return res.status(400).json({ error: 'No valid products in order' });

  const order = await db.create('orders', { items: lines, total, customer, status: 'new', createdAt: Date.now() });
  const s = await db.getSettings();
  const text = [
    `Hi FIR! I'd like to order:`,
    ...lines.map(l => `• ${l.name} — Size ${l.size} × ${l.qty} — ₹${l.price * l.qty}`),
    `Total: ₹${total}`,
    ``,
    `*Delivery details*`,
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    `Address: ${customer.address}`,
    customer.landmark ? `Landmark: ${customer.landmark}` : null,
    `City: ${customer.city} - ${customer.pincode}`,
    customer.note ? `Note: ${customer.note}` : null,
    ``,
    `Order #${order.id}`,
  ].filter(x => x !== null).join('\n');
  broadcast('orders');
  res.status(201).json({ order, whatsappUrl: `https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent(text)}` });
});

router.get('/', requireAdmin, async (req, res) => {
  res.json((await db.list('orders')).sort((a, b) => b.createdAt - a.createdAt));
});
router.patch('/:id', requireAdmin, async (req, res) => {
  const u = await db.update('orders', req.params.id, { status: req.body.status });
  u ? res.json(u) : res.status(404).json({ error: 'Not found' });
});

module.exports = router;