// routes/orders.js
// Handles the full "Buy" flow described in the brief:
// cart -> must be logged in -> stock check -> order created as "proceeding"
// -> payment methods page + WhatsApp handoff to the admin.
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireBuyer, buildWhatsAppLink } = require('../utils/helpers');

router.post('/cart/buy', requireBuyer, (req, res) => {
  const cart = req.session.cart || [];
  if (!cart.length) {
    return res.redirect('/cart?error=' + encodeURIComponent('Your cart is empty.'));
  }

  // Validate stock for every item before committing anything.
  const products = db.get('products');
  for (const item of cart) {
    const product = products.find({ id: item.productId }).value();
    if (!product) {
      return res.redirect('/cart?error=' + encodeURIComponent('One of your items is no longer available.'));
    }
    if (product.bundlesInStock < item.quantity) {
      return res.redirect(
        '/cart?error=' +
          encodeURIComponent(
            `Sorry, "${product.name}" is out of stock or does not have enough bundles left.`
          )
      );
    }
  }

  // All good — decrement stock and build the order.
  const orderItems = cart.map((item) => {
    const product = products.find({ id: item.productId }).value();
    products
      .find({ id: item.productId })
      .assign({ bundlesInStock: product.bundlesInStock - item.quantity })
      .write();
    return {
      productId: product.id,
      productName: product.name,
      pricePerBundle: product.pricePerBundle,
      quantity: item.quantity,
      subtotal: product.pricePerBundle * item.quantity
    };
  });

  const total = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

  const order = {
    id: uuidv4().split('-')[0].toUpperCase(),
    buyerId: req.session.buyerId,
    items: orderItems,
    total,
    status: 'proceeding', // proceeding -> confirmed
    createdAt: new Date().toISOString(),
    confirmedAt: null
  };

  db.get('orders').push(order).write();
  req.session.cart = [];

  res.redirect(`/order/${order.id}/payment`);
});

router.get('/order/:id/payment', requireBuyer, (req, res) => {
  const order = db.get('orders').find({ id: req.params.id }).value();
  if (!order || order.buyerId !== req.session.buyerId) {
    return res.status(404).render('404', { title: 'Order not found' });
  }
  const buyer = db.get('buyers').find({ id: req.session.buyerId }).value();
  const settings = db.get('settings').value();
  const whatsappLink = buildWhatsAppLink(settings.whatsappNumber, order, buyer);

  res.render('payment', {
    title: `Order #${order.id} — JayB Shop`,
    order,
    settings,
    whatsappLink
  });
});

module.exports = router;
