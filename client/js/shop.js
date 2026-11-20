/* FIR storefront */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const state = {
  products: [], settings: { stores: [], whatsappNumber: '' },
  cat: 'all', brand: '', q: '', sort: 'popular', min: '', max: '', wishView: false,
  cart: JSON.parse(localStorage.getItem('fir_cart') || '[]'),
  wish: JSON.parse(localStorage.getItem('fir_wish') || '[]'),
};
const save = () => { localStorage.setItem('fir_cart', JSON.stringify(state.cart)); localStorage.setItem('fir_wish', JSON.stringify(state.wish)); };
const img0 = p => (p.images && p.images[0]) || '/img/af1.svg';
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); };
const isDesktop = () => matchMedia('(min-width:900px)').matches;

/* ---------- splash ---------- */
(function () { const el = $('#splash'); $('#splashWord').textContent = 'SHOES'; setTimeout(() => el.classList.add('out'), 1300); setTimeout(() => el.remove(), 1900); })();

/* ---------- scroll reveal (cards, sections fade/slide in as you scroll) ---------- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' }) : null;
function reveal(root = document) { $$('.rv:not(.in)', root).forEach(el => (io ? io.observe(el) : el.classList.add('in'))); }

/* ---------- data ---------- */
async function load() {
  const [products, settings] = await Promise.all([API.get('/products'), API.get('/settings')]);
  state.products = products; state.settings = settings;
  state.cart = state.cart.filter(c => products.some(p => p.id === c.productId));
  state.wish = state.wish.filter(id => products.some(p => p.id === id));
  save(); render(); route();
}

/* ---------- filtering ---------- */
function visible() {
  let l = state.products.filter(p => p.inStock !== false);
  if (state.wishView) l = l.filter(p => state.wish.includes(p.id));
  if (state.cat !== 'all') l = l.filter(p => p.category === state.cat);
  if (state.brand) l = l.filter(p => p.brand === state.brand);
  if (state.q) { const q = state.q.toLowerCase(); l = l.filter(p => (p.name + ' ' + p.brand + ' ' + p.category).toLowerCase().includes(q)); }
  if (state.min !== '') l = l.filter(p => p.price >= +state.min);
  if (state.max !== '') l = l.filter(p => p.price <= +state.max);
  const s = {
    popular: (a, b) => (b.popularity || 0) - (a.popularity || 0), new: (a, b) => b.createdAt - a.createdAt,
    plh: (a, b) => a.price - b.price, phl: (a, b) => b.price - a.price, disc: (a, b) => b.discount - a.discount,
  }[state.sort];
  return l.sort(s);
}

/* ---------- render ---------- */
function render() { renderHero(); renderBrands(); renderList(); renderStores(); renderCounts(); if (!$('#cart').hidden) renderCart(); reveal(); }

function renderCounts() {
  const c = state.cart.reduce((n, i) => n + i.qty, 0);
  $('#cartCount').textContent = c; $('#cartCount').hidden = !c;
  $('#wishCount').textContent = state.wish.length; $('#wishCount').hidden = !state.wish.length;
  $('#wishBtn').classList.toggle('on', state.wishView); $('#wishBtn').firstChild.textContent = state.wishView ? '♥' : '♡';
  $('#footPhone').textContent = '+' + (state.settings.whatsappNumber || '');
}

function renderBrands() {
  const brands = [...new Set(state.products.map(p => p.brand))].sort();
  const all = [...new Set(['Nike', 'Adidas', 'Puma', 'New Balance', 'Reebok', 'Skechers', ...brands])];
  $('#brands').innerHTML = all.map(b => `<button class="pill ${state.brand === b ? 'on' : ''}" data-b="${esc(b)}">${esc(b)}</button>`).join('');
  $('#fBrand').innerHTML = '<option value="">All Brands</option>' + brands.map(b => `<option ${b === state.brand ? 'selected' : ''}>${esc(b)}</option>`).join('');
}

function card(p, i) {
  const w = state.wish.includes(p.id);
  return `<article class="card rv" style="--d:${i % 5}" data-id="${p.id}">
    ${p.badge ? `<span class="tag ${p.badge.toLowerCase()}">${esc(p.badge)}</span>` : ''}
    <button class="heart ${w ? 'on' : ''}" data-heart="${p.id}" aria-label="Wishlist">${w ? '♥' : '♡'}</button>
    <div class="card-img"><img loading="lazy" src="${esc(img0(p))}" alt="${esc(p.name)}"></div>
    <div class="card-b"><small>${esc(p.brand)}</small><h3>${esc(p.name)}</h3>
      <div class="rate"><span class="star">${p.rating.toFixed(1)} ★</span><small>(${p.ratingCount})</small></div>
      <div class="price"><b>${rupee(p.price)}</b>${p.discount ? `<s>${rupee(p.mrp)}</s><em>${p.discount}% off</em>` : ''}</div>
      <button class="btn-out" data-open="${p.id}">Select size</button></div></article>`;
}

function renderList() {
  const l = visible();
  const name = state.wishView ? 'My Wishlist' : ({ all: 'All items', shoes: 'Shoes', chappals: 'Chappals' }[state.cat]);
  $('#listTitle').textContent = state.q ? `Results for “${state.q}”` : name;
  $('#listCount').textContent = `(${l.length} item${l.length === 1 ? '' : 's'})`;
  $('#grid').innerHTML = l.length ? l.map(card).join('')
    : `<p class="empty">${state.wishView ? 'Nothing in your wishlist yet. Tap the heart on any shoe to save it.' : 'No items match. Try resetting filters.'}</p>`;
  reveal($('#grid'));
}
function renderStores() { $('#stores').innerHTML = (state.settings.stores || []).map(s => `<div class="store rv"><b>${esc(s.name)}</b><span>${esc(s.address)}</span></div>`).join(''); }

/* ---------- coverflow (hero + more-from-FIR) ---------- */
function coverflow(track, items, { onOpen, dotsEl }) {
  track.innerHTML = items.map(p => `<div class="cf-item" data-id="${p.id}"><img src="${esc(img0(p))}" alt=""><div class="cf-cap"><small>${esc(p.brand)}</small><b>${esc(p.name)}</b><span>${rupee(p.price)}</span></div></div>`).join('');
  const els = [...track.children];
  const update = () => {
    const c = track.scrollLeft + track.clientWidth / 2; let best = 0, bd = 1e9;
    els.forEach((el, i) => {
      const d = (el.offsetLeft + el.offsetWidth / 2 - c) / el.offsetWidth, a = Math.abs(d);
      el.style.transform = `translateZ(${-Math.min(a, 2) * 60}px) scale(${1 - Math.min(a, 1.6) * .2}) rotateY(${clamp(d, -1, 1) * -20}deg)`;
      el.style.opacity = Math.max(.4, 1 - a * .3); el.classList.toggle('mid', a < .5);
      if (a < bd) { bd = a; best = i; }
    });
    if (dotsEl) dotsEl.innerHTML = els.map((_, i) => `<i class="${i === best ? 'on' : ''}"></i>`).join('');
  };
  track.onscroll = () => requestAnimationFrame(update);
  // centre an item by scrolling ONLY this track (scrollIntoView would also scroll the page)
  const centre = (el, smooth) => track.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  track.onclick = e => { const it = e.target.closest('.cf-item'); if (!it) return; if (it.classList.contains('mid')) onOpen(it.dataset.id); else centre(it, true); };
  requestAnimationFrame(() => { if (els.length) centre(els[Math.min(1, els.length - 1)], false); update(); });
  return { step: dir => track.scrollBy({ left: dir * (els[0]?.offsetWidth || 150) * .85, behavior: 'smooth' }) };
}

let heroCtl, heroAuto;
function renderHero() {
  const chap = state.cat === 'chappals';
  $('#heroTitle').innerHTML = chap ? 'Soft steps.<br>Easy days.' : 'Fill In Right.<br>Make an entrance.';
  $('#heroSub').innerHTML = chap ? 'Chappals, slides and sandals for everyday comfort — find your pair at Uppala or Kanhangad.'
    : 'At FIR, we fit every step. From everyday sneakers to statement pairs — find your right shoe at Uppala or Kanhangad.';
  $('#heroHint').textContent = chap ? 'SWIPE TO EXPLORE · TAP A CHAPPAL TO OPEN' : 'SWIPE TO EXPLORE · TAP A SHOE TO OPEN';
  let items = state.products.filter(p => p.inStock !== false && (state.cat === 'all' || p.category === state.cat));
  const f = items.filter(p => p.featured); items = (f.length >= 3 ? f : items).slice(0, 8);
  heroCtl = coverflow($('#heroCf'), items, { onOpen: id => (location.hash = '#/p/' + id), dotsEl: $('#heroDots') });
}
// gentle parallax on the hero while the page scrolls
addEventListener('scroll', () => requestAnimationFrame(() => { const y = Math.min(scrollY, 700); $('.hero-vis').style.transform = `translateY(${y * .10}px)`; $('.hero-txt').style.transform = `translateY(${y * -.05}px)`; }), { passive: true });

/* ---------- product page: photo LEFT (sticky) + details RIGHT, animated by scroll ---------- */
let pdpSize = null, pdpScrollTop = 0;
function openPDP(id) {
  const p = state.products.find(x => x.id === id); if (!p) { location.hash = '#/'; return; }
  pdpSize = null;
  const w = state.wish.includes(p.id), imgs = p.images.length ? p.images : [img0(p)];
  const more = state.products.filter(x => x.id !== p.id && x.inStock !== false).slice(0, 8);
  const initials = p.brand.split(' ').map(x => x[0]).join('').toUpperCase();
  const stores = (state.settings.stores || []).map(s => `<div class="hl"><div><i>📍</i><span><b>${esc(s.name)}</b>${esc(s.address)}</span></div></div>`).join('');
  const pdp = $('#pdp');
  pdp.innerHTML = `
    <div class="pdp-bar"><button class="round" id="pBack" aria-label="Back">‹</button><div><button class="round ${w ? 'on' : ''}" id="pHeart" aria-label="Wishlist">${w ? '♥' : '♡'}</button><button class="round" id="pCart" aria-label="Cart">🛒</button></div></div>
    <div class="pdp-grid" id="pGrid">
      <div class="pdp-media" id="pMedia">
        <div class="pdp-bg" id="pBg">${esc(initials)}</div>
        <div class="pdp-top"><small>${esc(p.brand).toUpperCase()}</small><h1>${esc(p.name)}</h1></div>
        <div class="pdp-stack" id="pStack">${imgs.map((u, i) => `<img src="${esc(u)}" alt="${esc(p.name)} photo ${i + 1}" class="${i === 0 ? 'on' : ''}">`).join('')}</div>
        ${imgs.length > 1 ? `<span class="gal-n" id="galN">1/${imgs.length}</span><div class="pdp-thumbs">${imgs.map((u, i) => `<button data-t="${i}" class="${i === 0 ? 'on' : ''}"><img src="${esc(u)}" alt=""></button>`).join('')}</div>` : ''}
        <span class="scroll-cue">SCROLL ↓</span>
      </div>
      <div class="pdp-info" id="pInfo">
        <small class="br">${esc(p.brand)}</small><h2>${esc(p.name)}</h2>
        <div class="rate"><span class="star">${p.rating.toFixed(1)} ★</span><small>(${p.ratingCount} ratings)</small></div>
        <div class="price big"><b>${rupee(p.price)}</b>${p.discount ? `<s>${rupee(p.mrp)}</s><em>${p.discount}% off</em>` : ''}</div>
        <div class="lbl">Select size (UK/India)</div>
        <div class="sizes" id="sizes">${p.sizes.map(s => `<button data-s="${s}">${s}</button>`).join('')}</div>
        <div class="cta" id="cta"><button class="btn-or alt" id="addCart">ADD TO CART</button><button class="btn-or" id="buyNow">BUY NOW</button></div>
        <p class="fine">Available at FIR Uppala and FIR Kanhangad. Pay in store or confirm on WhatsApp.</p>
        <div class="blk rv"><div class="hl">
          <div><i>👟</i><span><b>Free try-on in store</b>Visit Uppala or Kanhangad and try before you buy.</span></div>
          <div><i>🔁</i><span><b>Easy exchange on size</b>Wrong fit? We’ll swap it.</span></div>
          <div><i>💬</i><span><b>Order on WhatsApp</b>Your order and address go straight to the shop.</span></div></div></div>
        <div class="blk rv"><h3 class="serif" style="font-size:24px;margin-bottom:14px">How ordering works</h3><div class="steps"><div>Pick your size and tap Buy Now</div><div>Enter your name, phone and delivery address</div><div>We open WhatsApp with everything filled in — just press send</div></div></div>
        <div class="blk rv"><h3 class="serif" style="font-size:24px;margin-bottom:6px">Product details</h3><table class="spec">
          <tr><td>Brand</td><td>${esc(p.brand)}</td></tr><tr><td>Category</td><td>${p.category === 'chappals' ? 'Chappals' : 'Shoes'}</td></tr>
          <tr><td>Sizes in stock</td><td>${p.sizes.join(', ')}</td></tr><tr><td>MRP</td><td>${rupee(p.mrp)}</td></tr></table></div>
        <div class="blk rv"><h3 class="serif" style="font-size:24px;margin-bottom:12px">Find us</h3>${stores}</div>
      </div>
    </div>
    <div class="more"><div class="wrap"><h3 class="serif">More from FIR</h3><p>Swipe · tap a pair to switch</p></div><div class="cf small" id="moreCf"></div><button class="btn-black" id="backAll">Back to all shoes</button><small class="fine c">FIR – Fill In Right Shoes · Uppala &amp; Kanhangad</small></div>`;
  pdp.hidden = false; pdp.scrollTop = 0; document.body.classList.add('lock');
  coverflow($('#moreCf', pdp), more, { onOpen: i => (location.hash = '#/p/' + i) });
  reveal(pdp);

  /* scroll-linked animation: photo tilts/zooms, big letters slide, gallery advances */
  const grid = $('#pGrid'), media = $('#pMedia'), stack = $('#pStack'), bg = $('#pBg'), n = imgs.length;
  let cur = 0;
  const setImg = i => {
    if (i === cur) return; cur = i;
    $$('#pStack img').forEach((im, k) => im.classList.toggle('on', k === i));
    $$('.pdp-thumbs button').forEach((b, k) => b.classList.toggle('on', k === i));
    const g = $('#galN'); if (g) g.textContent = `${i + 1}/${n}`;
  };
  const range = () => Math.max(1, grid.offsetHeight - media.offsetHeight);
  const frame = () => {
    const pr = clamp(pdp.scrollTop / range(), 0, 1), d = isDesktop();
    stack.style.transform = `translateY(${pr * (d ? -30 : -24)}px) rotate(${(pr - .5) * (d ? 12 : 8)}deg) scale(${d ? 1 + pr * .08 : 1 - pr * .25})`;
    bg.style.transform = `translate(calc(-50% + ${-pr * 200}px), -50%)`;
    if (n > 1) setImg(Math.min(n - 1, Math.floor(pr * n * .999)));
  };
  pdp.onscroll = () => requestAnimationFrame(frame); frame();
  $$('.pdp-thumbs button', pdp).forEach(b => (b.onclick = () => pdp.scrollTo({ top: range() * ((+b.dataset.t + .5) / n), behavior: 'smooth' })));

  $('#pBack').onclick = $('#backAll').onclick = () => (location.hash = '#/');
  $('#pHeart').onclick = () => { toggleWish(p.id); const on = state.wish.includes(p.id); const h = $('#pHeart'); h.textContent = on ? '♥' : '♡'; h.classList.toggle('on', on); };
  $('#pCart').onclick = openCart;
  $('#sizes').onclick = e => { const b = e.target.closest('button'); if (!b) return; pdpSize = +b.dataset.s; $$('#sizes button').forEach(x => x.classList.toggle('on', x === b)); };
  $('#addCart').onclick = () => { if (needSize()) return; addToCart(p.id, pdpSize); toast('Added to cart'); };
  $('#buyNow').onclick = () => { if (needSize()) return; openCheckout([{ productId: p.id, size: pdpSize, qty: 1 }]); };
}
function needSize() {
  if (pdpSize) return false;
  $('#pdp').scrollTo({ top: 0, behavior: 'smooth' });
  const s = $('#sizes'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); toast('Please select a size first'); return true;
}
function closePDP() { $('#pdp').hidden = true; if ($('#co').hidden) document.body.classList.remove('lock'); }

/* ---------- cart / wishlist ---------- */
function toggleWish(id) { const i = state.wish.indexOf(id); i < 0 ? state.wish.push(id) : state.wish.splice(i, 1); save(); renderList(); renderCounts(); }
function addToCart(productId, size) {
  const ex = state.cart.find(c => c.productId === productId && c.size === size);
  ex ? ex.qty++ : state.cart.push({ productId, size, qty: 1 }); save(); renderCounts(); if (!$('#cart').hidden) renderCart();
}
function openCart() { renderCart(); $('#cart').hidden = false; $('#scrim').hidden = false; }
function closeCart() { $('#cart').hidden = true; $('#scrim').hidden = true; }
function renderCart() {
  const n = state.cart.reduce((a, c) => a + c.qty, 0); $('#cartTitle').textContent = `My Cart (${n})`;
  let total = 0;
  $('#cartBody').innerHTML = state.cart.length ? state.cart.map((c, i) => {
    const p = state.products.find(x => x.id === c.productId); if (!p) return ''; total += p.price * c.qty;
    return `<div class="ci"><img src="${esc(img0(p))}" alt=""><div><b>${esc(p.name)}</b><small>Size ${c.size} · ${rupee(p.price)}</small>
      <div class="qty"><button data-q="-1" data-i="${i}">−</button><span>${c.qty}</span><button data-q="1" data-i="${i}">+</button><button class="rm" data-rm="${i}">Remove</button></div></div><b>${rupee(p.price * c.qty)}</b></div>`;
  }).join('') : '<p class="empty">Your cart is empty.<br>Add some shoes to get started.</p>';
  $('#cartFoot').innerHTML = state.cart.length ? `<div class="tot"><span>Total</span><b>${rupee(total)}</b></div><button class="btn-wa" id="cartCheckout">Checkout — add delivery address</button><small>You’ll confirm the order on WhatsApp.</small>` : '';
  const b = $('#cartCheckout'); if (b) b.onclick = () => { closeCart(); openCheckout(state.cart.map(c => ({ ...c })), true); };
}

/* ---------- checkout: collect address → send to shop on WhatsApp ---------- */
let coItems = [], coFromCart = false;
const FIELDS = { name: '#cName', phone: '#cPhone', address: '#cAddr', landmark: '#cLand', city: '#cCity', pincode: '#cPin', note: '#cNote' };
function openCheckout(items, fromCart = false) {
  coItems = items; coFromCart = fromCart;
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('fir_cust') || '{}'); } catch {}
  Object.entries(FIELDS).forEach(([k, sel]) => { $(sel).value = saved[k] || ''; $(sel).classList.remove('bad'); });
  let total = 0;
  $('#coSum').innerHTML = items.map(it => {
    const p = state.products.find(x => x.id === it.productId); if (!p) return ''; total += p.price * it.qty;
    return `<div><span>${esc(p.name)} · Size ${it.size} × ${it.qty}</span><b>${rupee(p.price * it.qty)}</b></div>`;
  }).join('') + `<div class="t"><span>Total</span><span>${rupee(total)}</span></div>`;
  $('#coErr').textContent = ''; $('#coDone').hidden = true; $('#coSend').disabled = false;
  $('#co').hidden = false; document.body.classList.add('lock');
  setTimeout(() => $(saved.name ? '#cAddr' : '#cName').focus(), 350);
}
function closeCheckout() { $('#co').hidden = true; if ($('#pdp').hidden) document.body.classList.remove('lock'); }
function checkErr(c) {
  if (c.name.trim().length < 2) return ['name', 'Please enter your name'];
  if (!/^[6-9]\d{9}$/.test(c.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))) return ['phone', 'Enter a valid 10-digit mobile number'];
  if (c.address.trim().length < 6) return ['address', 'Please enter your full address'];
  if (c.city.trim().length < 2) return ['city', 'Please enter your city / town'];
  if (!/^\d{6}$/.test(c.pincode.trim())) return ['pincode', 'Enter a valid 6-digit pincode'];
  return null;
}
$('#coForm').onsubmit = async e => {
  e.preventDefault();
  const c = Object.fromEntries(Object.entries(FIELDS).map(([k, sel]) => [k, $(sel).value]));
  $$('.co-body .bad').forEach(x => x.classList.remove('bad'));
  const bad = checkErr(c);
  if (bad) { $(FIELDS[bad[0]]).classList.add('bad'); $(FIELDS[bad[0]]).focus(); $('#coErr').textContent = bad[1]; return; }
  $('#coErr').textContent = ''; $('#coSend').disabled = true;
  const win = window.open('', '_blank'); // opened now so popup blockers allow it
  try {
    const r = await API.post('/orders', { items: coItems.map(({ productId, size, qty }) => ({ productId, size, qty })), customer: c });
    localStorage.setItem('fir_cust', JSON.stringify(c));
    if (win) win.location.href = r.whatsappUrl;
    $('#coWa').href = r.whatsappUrl; $('#coDone').hidden = false;
    if (coFromCart) { state.cart = []; save(); render(); }
  } catch (err) { if (win) win.close(); $('#coErr').textContent = err.message; $('#coSend').disabled = false; }
};
$('#coClose').onclick = closeCheckout; $('#coDoneClose').onclick = () => { closeCheckout(); location.hash = '#/'; };
$('#co').onclick = e => { if (e.target === $('#co')) closeCheckout(); };
$('#cPhone').oninput = e => (e.target.value = e.target.value.replace(/[^\d+ ]/g, ''));
$('#cPin').oninput = e => (e.target.value = e.target.value.replace(/\D/g, ''));

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const h = t.closest('[data-heart]'); if (h) { e.stopPropagation(); toggleWish(h.dataset.heart); return; }
  const o = t.closest('[data-open]'); if (o) { location.hash = '#/p/' + o.dataset.open; return; }
  const c = t.closest('.card'); if (c && !t.closest('button')) { location.hash = '#/p/' + c.dataset.id; return; }
  const b = t.closest('[data-b]'); if (b) { state.brand = state.brand === b.dataset.b ? '' : b.dataset.b; render(); return; }
  const q = t.closest('[data-q]'); if (q) { const it = state.cart[+q.dataset.i]; it.qty += +q.dataset.q; if (it.qty < 1) state.cart.splice(+q.dataset.i, 1); save(); render(); return; }
  const r = t.closest('[data-rm]'); if (r) { state.cart.splice(+r.dataset.rm, 1); save(); render(); }
});
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!$('#co').hidden) closeCheckout(); else if (!$('#cart').hidden) closeCart(); else if (!$('#pdp').hidden) location.hash = '#/'; });
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; state.cat = b.dataset.cat; state.wishView = false; $$('#tabs button').forEach(x => x.classList.toggle('on', x === b)); render(); };
$('#searchForm').onsubmit = e => { e.preventDefault(); state.q = $('#q').value.trim(); state.wishView = false; render(); $('#list').scrollIntoView({ behavior: 'smooth' }); };
$('#q').oninput = e => { if (!e.target.value) { state.q = ''; render(); } };
$('#sort').onchange = e => { state.sort = e.target.value; renderList(); };
$('#fBrand').onchange = e => { state.brand = e.target.value; render(); };
$('#fMin').oninput = e => { state.min = e.target.value; renderList(); };
$('#fMax').oninput = e => { state.max = e.target.value; renderList(); };
$('#fReset').onclick = () => { Object.assign(state, { brand: '', q: '', min: '', max: '', sort: 'popular', wishView: false }); $('#q').value = $('#fMin').value = $('#fMax').value = ''; $('#sort').value = 'popular'; render(); };
$('#wishBtn').onclick = () => { state.wishView = !state.wishView; render(); $('#list').scrollIntoView({ behavior: 'smooth' }); };
$('#cartBtn').onclick = openCart; $('#cartClose').onclick = $('#scrim').onclick = closeCart;
$('#heroPrev').onclick = () => heroCtl && heroCtl.step(-1); $('#heroNext').onclick = () => heroCtl && heroCtl.step(1);

function route() {
  const m = location.hash.match(/^#\/p\/(.+)$/), pdp = $('#pdp');
  if (m && !pdp.hidden && pdp.dataset.id === m[1]) return; // live refresh: keep the open page as is
  if (m) { pdp.dataset.id = m[1]; openPDP(m[1]); } else { pdp.dataset.id = ''; closePDP(); }
}
addEventListener('hashchange', route);

/* live: when admin changes products, the page refreshes its data without reload */
API.live({ products: () => load(), settings: () => load() });
load();