const router = require('express').Router();
const db = require('../db/store');
const requireAdmin = require('../middleware/auth');
const { broadcast } = require('../events');

router.get('/', async (req, res) => res.json(await db.getSettings()));
router.put('/', requireAdmin, async (req, res) => {
  const { whatsappNumber, stores, heroShoes, heroChappals } = req.body;
  const patch = {};
  if (whatsappNumber) patch.whatsappNumber = String(whatsappNumber).replace(/\D/g, '');
  if (Array.isArray(stores)) patch.stores = stores;
  res.json(await db.setSettings(patch)); broadcast('settings');
});
module.exports = router;
