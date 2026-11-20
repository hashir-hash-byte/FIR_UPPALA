import { firebaseConfig, DEV_MODE } from './firebase-config.js';

const $ = (s, r = document) => r.querySelector(s);
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); };
const SIZES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
let products = [], orders = [], settings = { stores: [] }, editing = null, images = [];

/* ================= AUTH ================= */
let auth = null, fbAuth = null;
if (!DEV_MODE) {
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const [{ initializeApp }, A] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js')]);
  fbAuth = A; auth = A.getAuth(initializeApp(firebaseConfig));
  A.onAuthStateChanged(auth, async u => { if (u) { API.token = await u.getIdToken(); enter(); } else leave(); });
  setInterval(async () => { if (auth.currentUser) API.token = await auth.currentUser.getIdToken(); }, 20 * 60 * 1000); // refresh token
} else {
  $('#devNote').hidden = false; $('#devBtn').hidden = false;
  if (sessionStorage.getItem('fir_dev')) { API.token = 'dev-admin'; enter(); }
}
const authErr = e => ($('#loginErr').textContent = (e.code || e.message || '').replace('auth/', '').replace(/-/g, ' '));

$('#loginForm').onsubmit = async e => {
  e.preventDefault(); $('#loginErr').textContent = '';
  if (DEV_MODE) return devLogin();
  try { await fbAuth.signInWithEmailAndPassword(auth, $('#email').value, $('#password').value); } catch (x) { authErr(x); }
};
$('#googleBtn').onclick = async () => {
  if (DEV_MODE) return ($('#loginErr').textContent = 'Add your Firebase config in client/js/firebase-config.js to enable Google sign-in.');
  try { await fbAuth.signInWithPopup(auth, new fbAuth.GoogleAuthProvider()); } catch (x) { authErr(x); }
};
function devLogin() { API.token = 'dev-admin'; sessionStorage.setItem('fir_dev', '1'); enter(); }
$('#devBtn').onclick = devLogin;
$('#logout').onclick = async () => { sessionStorage.removeItem('fir_dev'); API.token = null; if (auth) await fbAuth.signOut(auth); else leave(); };

async function enter() {
  $('#login').hidden = true; $('#app').hidden = false;
  try { await refresh(); } catch (e) {
    if (e.status === 403 || e.status === 401) { $('#loginErr').textContent = e.message; if (auth) await fbAuth.signOut(auth); else leave(); }
  }
}
function leave() { $('#login').hidden = false; $('#app').hidden = true; }

/* ================= DATA ================= */
async function refresh() {
  [products, orders, settings] = await Promise.all([API.get('/products'), API.get('/orders'), API.get('/settings')]);
  renderProducts(); renderOrders(); renderSettings();
}
if (!window.__live) { window.__live = API.live({ orders: () => !$('#app').hidden && refresh(), products: () => !$('#app').hidden && refresh() }); }

/* ================= NAV ================= */
$('#nav').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  [...$('#nav').children].forEach(x => x.classList.toggle('on', x === b));
  ['products', 'orders', 'settings'].forEach(v => ($('#v-' + v).hidden = v !== b.dataset.v));
};

/* ================= PRODUCTS ================= */
const rupee = n => '₹' + Number(n).toLocaleString('en-IN');
function renderProducts() {
  $('#pCount').textContent = `(${products.length})`;
  $('#pTable').innerHTML = products.length ? products.map(p => `
    <div class="row">
      <img src="${p.images[0] || '/img/af1.svg'}" alt="">
      <div class="grow"><b>${esc(p.name)}</b><small>${esc(p.brand)} · ${p.category} · sizes ${p.sizes.join(', ') || '—'}</small>
        <small><b>${rupee(p.price)}</b> ${p.discount ? `<s>${rupee(p.mrp)}</s> <em>${p.discount}% off</em>` : ''} ${p.inStock === false ? '<span class="pill red">Out of stock</span>' : ''}${p.badge ? `<span class="pill">${esc(p.badge)}</span>` : ''}</small></div>
      <div class="acts"><button class="btn ghost sm" data-edit="${p.id}">Edit</button><button class="btn danger sm" data-del="${p.id}">Delete</button></div>
    </div>`).join('') : '<p class="mut pad">No products yet. Click “Add product”.</p>';
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

$('#pTable').onclick = async e => {
  const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
  if (ed) openModal(products.find(p => p.id === ed.dataset.edit));
  if (del && confirm('Delete this product?')) { await API.del('/products/' + del.dataset.del); toast('Deleted'); refresh(); }
};

/* modal */
$('#fSizes').innerHTML = SIZES.map(s => `<label class="sz"><input type="checkbox" value="${s}"><span>${s}</span></label>`).join('');
$('#newBtn').onclick = () => openModal(null);
$('#mClose').onclick = $('#mCancel').onclick = () => ($('#modal').hidden = true);

function openModal(p) {
  editing = p; images = p ? [...p.images] : [];
  $('#mTitle').textContent = p ? 'Edit product' : 'Add product'; $('#mErr').textContent = '';
  $('#fName').value = p?.name || ''; $('#fBrand').value = p?.brand || ''; $('#fCat').value = p?.category || 'shoes';
  $('#fMrp').value = p?.mrp || ''; $('#fPrice').value = p?.price || ''; $('#fDisc').value = p?.discount || '';
  $('#fBadge').value = p?.badge || ''; $('#fRating').value = p?.rating ?? 4.3; $('#fRc').value = p?.ratingCount ?? 0;
  $('#fStock').checked = p ? p.inStock !== false : true; $('#fFeat').checked = p ? !!p.featured : true;
  [...document.querySelectorAll('#fSizes input')].forEach(i => (i.checked = p ? p.sizes.includes(+i.value) : [6, 7, 8, 9, 10, 11].includes(+i.value)));
  renderThumbs(); calc(); $('#modal').hidden = false;
}
function renderThumbs() {
  $('#thumbs').innerHTML = images.map((u, i) => `<div class="th ${i === 0 ? 'cover' : ''}"><img src="${u}"><button type="button" data-rm="${i}">✕</button>${i ? `<button type="button" class="mk" data-cover="${i}">Cover</button>` : '<em>Cover</em>'}</div>`).join('');
}
$('#thumbs').onclick = e => {
  const r = e.target.closest('[data-rm]'), c = e.target.closest('[data-cover]');
  if (r) images.splice(+r.dataset.rm, 1);
  if (c) images.unshift(images.splice(+c.dataset.cover, 1)[0]);
  renderThumbs();
};
$('#files').onchange = async e => {
  if (!e.target.files.length) return;
  $('#drop span').textContent = 'Uploading…';
  try { const r = await API.upload(e.target.files); images.push(...r.urls); renderThumbs(); }
  catch (x) { $('#mErr').textContent = x.message; }
  $('#drop span').textContent = '📷 Tap to upload shoe photos'; e.target.value = '';
};

// MRP + discount% <-> selling price stay in sync
function calc() {
  const m = +$('#fMrp').value, p = +$('#fPrice').value;
  $('#calc').textContent = m && p && p < m ? `Customers see ${rupee(p)} with ${Math.round((1 - p / m) * 100)}% off (MRP ${rupee(m)})` : '';
}
$('#fDisc').oninput = () => { const m = +$('#fMrp').value, d = +$('#fDisc').value; if (m) $('#fPrice').value = Math.round(m * (1 - d / 100)); calc(); };
$('#fPrice').oninput = () => { const m = +$('#fMrp').value, p = +$('#fPrice').value; $('#fDisc').value = m && p < m ? Math.round((1 - p / m) * 100) : 0; calc(); };
$('#fMrp').oninput = () => { const d = +$('#fDisc').value, m = +$('#fMrp').value; if (d) $('#fPrice').value = Math.round(m * (1 - d / 100)); calc(); };

$('#pForm').onsubmit = async e => {
  e.preventDefault(); $('#mErr').textContent = '';
  const body = {
    name: $('#fName').value, brand: $('#fBrand').value, category: $('#fCat').value,
    mrp: $('#fMrp').value, price: $('#fPrice').value, images,
    sizes: [...document.querySelectorAll('#fSizes input:checked')].map(i => +i.value),
    badge: $('#fBadge').value, rating: $('#fRating').value, ratingCount: $('#fRc').value,
    inStock: $('#fStock').checked, featured: $('#fFeat').checked,
  };
  if (!images.length) return ($('#mErr').textContent = 'Please upload at least one photo.');
  if (!body.sizes.length) return ($('#mErr').textContent = 'Select at least one size.');
  try {
    editing ? await API.put('/products/' + editing.id, body) : await API.post('/products', body);
    $('#modal').hidden = true; toast('Saved — live on the shop now'); refresh();
  } catch (x) { $('#mErr').textContent = x.message; }
};

/* ================= ORDERS ================= */
function renderOrders() {
  const n = orders.filter(o => o.status === 'new').length; $('#newOrders').textContent = n; $('#newOrders').hidden = !n;
  $('#oList').innerHTML = orders.length ? orders.map(o => `
    <div class="box order"><div class="head"><b>#${o.id}</b><small class="mut">${new Date(o.createdAt).toLocaleString()}</small>
      <select data-st="${o.id}">${['new', 'confirmed', 'delivered', 'cancelled'].map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      ${o.customer ? `<div class="cust"><b>${esc(o.customer.name)}</b> · <a href="tel:${esc(o.customer.phone)}">${esc(o.customer.phone)}</a> · <a target="_blank" href="https://wa.me/91${esc(o.customer.phone)}">WhatsApp customer</a><br><span class="mut">${esc(o.customer.address)}${o.customer.landmark ? ', ' + esc(o.customer.landmark) : ''}, ${esc(o.customer.city)} - ${esc(o.customer.pincode)}</span>${o.customer.note ? `<br><i class="mut">Note: ${esc(o.customer.note)}</i>` : ''}</div>` : ''}
      ${o.items.map(i => `<p class="small">${esc(i.name)} — size ${i.size} × ${i.qty} <b>${rupee(i.price * i.qty)}</b></p>`).join('')}
      <p><b>Total ${rupee(o.total)}</b></p></div>`).join('') : '<p class="mut pad">No orders yet.</p>';
}
$('#oList').onchange = async e => { const s = e.target.dataset.st; if (s) { await API.patch('/orders/' + s, { status: e.target.value }); toast('Order updated'); refresh(); } };

/* ================= SETTINGS ================= */
function renderSettings() {
  $('#sWa').value = settings.whatsappNumber || '';
  $('#sStores').innerHTML = (settings.stores || []).map((s, i) => `<div class="two"><label>Store name<input data-sn="${i}" value="${esc(s.name)}"></label><label>Address<input data-sa="${i}" value="${esc(s.address)}"></label></div>`).join('');
}
$('#addStore').onclick = () => { settings.stores = [...readStores(), { name: '', address: '' }]; renderSettings(); };
const readStores = () => (settings.stores || []).map((_, i) => ({ name: $(`[data-sn="${i}"]`).value, address: $(`[data-sa="${i}"]`).value })).filter(s => s.name);
$('#setForm').onsubmit = async e => {
  e.preventDefault();
  try { settings = await API.put('/settings', { whatsappNumber: $('#sWa').value, stores: readStores() }); toast('Settings saved'); renderSettings(); }
  catch (x) { toast(x.message); }
};