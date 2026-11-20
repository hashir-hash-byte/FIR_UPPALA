
// Shared helper for talking to the backend

const API_BASE = 'https://fir-uppala.onrender.com';

const API = {
  token: null,

  async req(method, url, body, isForm) {
    const headers = {};

    if (this.token) {
      headers.Authorization = 'Bearer ' + this.token;
    }

    if (body && !isForm) {
      headers['Content-Type'] = 'application/json';
    }

    const r = await fetch(API_BASE + '/api' + url, {
      method,
      headers,
      body: body
        ? (isForm ? body : JSON.stringify(body))
        : undefined
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      throw Object.assign(
        new Error(data.error || 'Request failed'),
        { status: r.status }
      );
    }

    return data;
  },

  get: (u) => API.req('GET', u),
  post: (u, b) => API.req('POST', u, b),
  put: (u, b) => API.req('PUT', u, b),
  patch: (u, b) => API.req('PATCH', u, b),
  del: (u) => API.req('DELETE', u),

  upload: (files) => {
    const f = new FormData();
    [...files].forEach(x => f.append('images', x));
    return API.req('POST', '/products/upload', f, true);
  },

  // Live updates
  live(handlers) {
    const es = new EventSource(API_BASE + '/api/events');

    Object.entries(handlers).forEach(([k, fn]) => {
      es.addEventListener(k, fn);
    });

    return es;
  },
};

const rupee = n => '₹' + Number(n).toLocaleString('en-IN');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));
