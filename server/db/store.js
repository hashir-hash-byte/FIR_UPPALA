// Tiny data layer: JSON file by default, Firestore when DB_DRIVER=firestore
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fb = require('../config/firebase');

const FILE = path.join(__dirname, '../data/db.json');
const useFirestore = process.env.DB_DRIVER === 'firestore' && fb.enabled;

function readFile() {
  if (!fs.existsSync(FILE)) return null;
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}
function writeFile(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }

function jsonDb() {
  let data = readFile();
  if (!data) { data = require('../data/seed'); writeFile(data); }
  return {
    async list(col) { return [...(readFile()[col] || [])]; },
    async get(col, id) { return (readFile()[col] || []).find(x => x.id === id) || null; },
    async create(col, doc) {
      const d = readFile(); doc = { id: crypto.randomUUID().slice(0, 8), ...doc };
      d[col] = d[col] || []; d[col].push(doc); writeFile(d); return doc;
    },
    async update(col, id, patch) {
      const d = readFile(); const i = (d[col] || []).findIndex(x => x.id === id);
      if (i < 0) return null; d[col][i] = { ...d[col][i], ...patch, id }; writeFile(d); return d[col][i];
    },
    async remove(col, id) {
      const d = readFile(); const n = (d[col] || []).length;
      d[col] = (d[col] || []).filter(x => x.id !== id); writeFile(d); return d[col].length < n;
    },
    async getSettings() { return readFile().settings || {}; },
    async setSettings(s) { const d = readFile(); d.settings = { ...d.settings, ...s }; writeFile(d); return d.settings; },
  };
}

function firestoreDb() {
  const db = fb.admin.firestore();
  return {
    async list(col) { return (await db.collection(col).get()).docs.map(d => ({ id: d.id, ...d.data() })); },
    async get(col, id) { const d = await db.collection(col).doc(id).get(); return d.exists ? { id, ...d.data() } : null; },
    async create(col, doc) { const r = await db.collection(col).add(doc); return { id: r.id, ...doc }; },
    async update(col, id, patch) {
      const ref = db.collection(col).doc(id); if (!(await ref.get()).exists) return null;
      await ref.set(patch, { merge: true }); return { id, ...(await ref.get()).data() };
    },
    async remove(col, id) { await db.collection(col).doc(id).delete(); return true; },
    async getSettings() { const d = await db.collection('meta').doc('settings').get(); return d.exists ? d.data() : require('../data/seed').settings; },
    async setSettings(s) { await db.collection('meta').doc('settings').set(s, { merge: true }); return s; },
  };
}

module.exports = useFirestore ? firestoreDb() : jsonDb();
