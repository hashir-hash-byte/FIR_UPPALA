require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const events = require('./events');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/settings', require('./routes/settings'));
app.get('/api/events', events.handler);
app.get('/api/health', (req, res) => res.json({ ok: true, firebase: require('./config/firebase').enabled }));

app.use(express.static(path.join(__dirname, '../client')));
app.use((err, req, res, next) => { console.error(err.message); res.status(400).json({ error: err.message }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FIR running →  shop: http://localhost:${PORT}   admin: http://localhost:${PORT}/admin.html`));
