// routes/cart.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');

function getCartWithDetails(req) {
  const cart = req.session.cart || [];
  return cart
    .map((item) => {
      const product = db.get('products').find({ id: item.productId }).value();
      if (!product) return null;
      const quantity = Math.min(item.quantity, product.bundlesInStock || 0) || item.quantity;
      const subtotal = product.pricePerBundle * item.quantity;
      return { product, quantity: item.quantity, subtotal };
    })
    .filter(Boolean);
}

// ---------- View cart ----------
router.get('/cart', (req, res) => {
  const items = getCartWithDetails(req);
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  res.render('cart', { title: 'Your Cart — JayB Shop', items, total, error: req.query.error });
});

// ---------- Add to cart ----------
router.post('/cart/add', (req, res) => {
  const { productId } = req.body;
  let quantity = parseInt(req.body.quantity, 10);
  if (!quantity || quantity < 1) quantity = 1;

  const product = db.get('products').find({ id: productId }).value();
  if (!product) return res.redirect('/shop');

  const cart = req.session.cart || [];
  const existing = cart.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }
  req.session.cart = cart;
  res.redirect('/cart?bump=1&toast=' + encodeURIComponent(`Added ${product.name} to your cart`));
});

// ---------- Update quantity ----------
router.post('/cart/update', (req, res) => {
  const { productId } = req.body;
  const quantity = parseInt(req.body.quantity, 10);
  const cart = req.session.cart || [];
  const item = cart.find((i) => i.productId === productId);
  if (item) {
    if (quantity > 0) item.quantity = quantity;
    else req.session.cart = cart.filter((i) => i.productId !== productId);
  }
  req.session.cart = cart;
  res.redirect('/cart?toast=' + encodeURIComponent('Cart updated'));
});

// ---------- Remove item ----------
router.post('/cart/remove', (req, res) => {
  const { productId } = req.body;
  req.session.cart = (req.session.cart || []).filter((i) => i.productId !== productId);
  res.redirect('/cart?toast=' + encodeURIComponent('Item removed from cart'));
});

module.exports = router;
