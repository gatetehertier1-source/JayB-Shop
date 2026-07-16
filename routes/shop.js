// routes/shop.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireBuyer } = require('../utils/helpers');

// ---------- Full catalogue ----------
router.get('/shop', (req, res) => {
  const category = req.query.category || 'all';
  let products = db.get('products').sortBy('createdAt').reverse().value();

  const categories = [...new Set(products.map((p) => p.category))];

  if (category !== 'all') {
    products = products.filter((p) => p.category === category);
  }

  res.render('shop', {
    title: 'Shop All Clothing — JayB Shop',
    products,
    categories,
    activeCategory: category
  });
});

// ---------- Product detail ----------
router.get('/product/:id', (req, res) => {
  const product = db.get('products').find({ id: req.params.id }).value();
  if (!product) {
    return res.status(404).render('404', { title: 'Product not found' });
  }
  res.render('product', { title: `${product.name} — JayB Shop`, product });
});

// ---------- Buyer order history ----------
router.get('/account/orders', requireBuyer, (req, res) => {
  const orders = db
    .get('orders')
    .filter({ buyerId: req.session.buyerId })
    .sortBy('createdAt')
    .reverse()
    .value();
  res.render('my-orders', { title: 'My Orders — JayB Shop', orders });
});

module.exports = router;
