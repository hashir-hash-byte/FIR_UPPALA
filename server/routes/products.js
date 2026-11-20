const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const db = require('../db/store');
const requireAdmin = require('../middleware/auth');
const { broadcast } = require('../events');

const crypto = require('crypto');
const fs = require('fs');

// Photos are held in memory, then sent to Firebase Storage (or local disk in DEV MODE)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, f, cb) => cb(/^image\//.test(f.mimetype) ? null : new Error('Images only'), /^image\//.test(f.mimetype)),
});

async function saveImage(f) {
  const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(f.originalname).toLowerCase();
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (cloud && key && secret) {
    // Cloudinary free tier: signed upload, served from their fast CDN (auto format + compression)
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'fir-shoes';
    const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest('hex');
    const form = new FormData();
    form.append('file', new Blob([f.buffer], { type: f.mimetype }), name);
    form.append('api_key', key);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('signature', signature);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || 'Cloudinary upload failed');
    return j.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_900/');
  }
  fs.mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../uploads', name), f.buffer);
  return '/uploads/' + name;
}

const withDiscount = p => ({ ...p, discount: p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0 });

function clean(b) {
  const num = v => (v === '' || v == null ? undefined : Number(v));
  const out = {
    name: String(b.name || '').trim(), brand: String(b.brand || '').trim(),
    category: b.category === 'chappals' ? 'chappals' : 'shoes',
    mrp: num(b.mrp), price: num(b.price),
    sizes: [].concat(b.sizes || []).map(Number).filter(Boolean).sort((a, c) => a - c),
    images: [].concat(b.images || []).filter(Boolean),
    badge: String(b.badge || ''), rating: num(b.rating) ?? 4.2, ratingCount: num(b.ratingCount) ?? 0,
    inStock: b.inStock === false || b.inStock === 'false' ? false : true,
    popularity: num(b.popularity) ?? 0, featured: b.featured === true || b.featured === 'true',
  };
  if (num(b.discount) != null && out.mrp) out.price = Math.round(out.mrp * (1 - num(b.discount) / 100));
  return out;
}

router.get('/', async (req, res) => {
  const list = (await db.list('products')).map(withDiscount);
  res.json(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
});
router.get('/:id', async (req, res) => {
  const p = await db.get('products', req.params.id);
  p ? res.json(withDiscount(p)) : res.status(404).json({ error: 'Not found' });
});

router.post('/upload', requireAdmin, upload.array('images', 8), async (req, res, next) => {
  try { res.json({ urls: await Promise.all(req.files.map(saveImage)) }); } catch (e) { next(e); }
});

router.post('/', requireAdmin, async (req, res) => {
  const p = clean(req.body);
  if (!p.name || !p.brand || !p.price) return res.status(400).json({ error: 'name, brand and price are required' });
  if (!p.mrp) p.mrp = p.price;
  const created = await db.create('products', { ...p, createdAt: Date.now() });
  broadcast('products'); res.status(201).json(withDiscount(created));
});
router.put('/:id', requireAdmin, async (req, res) => {
  const p = clean(req.body); if (!p.mrp) p.mrp = p.price;
  const u = await db.update('products', req.params.id, p);
  if (!u) return res.status(404).json({ error: 'Not found' });
  broadcast('products'); res.json(withDiscount(u));
});
router.delete('/:id', requireAdmin, async (req, res) => {
  await db.remove('products', req.params.id); broadcast('products'); res.json({ ok: true });
});

module.exports = router;
