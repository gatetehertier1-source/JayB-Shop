// routes/admin.js
// Everything in JayB Shop is ultimately controlled from here: stock,
// order confirmation, announcements, and site settings.
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireAdmin, formatRWF } = require('../utils/helpers');

// The admin security code. Fixed on purpose — it does not rotate.
const ADMIN_SECURITY_CODE = 'JayB admin';

// ---------- Admin login ----------
router.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Access — JayB Shop', error: null });
});

router.post('/login', (req, res) => {
  const { securityCode } = req.body;
  if (securityCode === ADMIN_SECURITY_CODE) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render('admin/login', {
    title: 'Admin Access — JayB Shop',
    error: 'Incorrect security code.'
  });
});

router.post('/logout', (req, res) => {
  delete req.session.isAdmin;
  res.redirect('/admin/login');
});

router.use(requireAdmin);

// ---------- Dashboard ----------
router.get('/', (req, res) => {
  const products = db.get('products').value();
  const orders = db.get('orders').sortBy('createdAt').reverse().value();
  const buyers = db.get('buyers').value();
  const messages = db.get('messages').value();

  const stats = {
    totalProducts: products.length,
    totalBundlesInStock: products.reduce((s, p) => s + p.bundlesInStock, 0),
    outOfStock: products.filter((p) => p.bundlesInStock <= 0).length,
    totalOrders: orders.length,
    proceedingOrders: orders.filter((o) => o.status === 'proceeding').length,
    confirmedOrders: orders.filter((o) => o.status === 'confirmed').length,
    totalBuyers: buyers.length,
    unreadMessages: messages.filter((m) => !m.read).length,
    revenueConfirmed: orders
      .filter((o) => o.status === 'confirmed')
      .reduce((s, o) => s + o.total, 0)
  };

  res.render('admin/dashboard', {
    title: 'Admin Dashboard — JayB Shop',
    stats,
    recentOrders: orders.slice(0, 6),
    formatRWF
  });
});

// ---------- Products ----------
router.get('/products', (req, res) => {
  const products = db.get('products').sortBy('createdAt').reverse().value();
  res.render('admin/products', { title: 'Manage Products — JayB Shop', products, formatRWF });
});

router.get('/products/new', (req, res) => {
  res.render('admin/product-form', {
    title: 'Add Product — JayB Shop',
    product: null,
    errors: []
  });
});

router.post('/products/new', (req, res) => {
  const { name, category, description, pricePerBundle, piecesPerBundle, bundlesInStock, imageUrl } = req.body;
  const errors = [];
  if (!name || !name.trim()) errors.push('Product name is required.');
  if (!category || !category.trim()) errors.push('Category is required.');
  if (!pricePerBundle || isNaN(pricePerBundle) || Number(pricePerBundle) <= 0) errors.push('Price per bundle must be a positive number.');
  if (!piecesPerBundle || isNaN(piecesPerBundle) || Number(piecesPerBundle) <= 0) errors.push('Pieces per bundle must be a positive number.');
  if (bundlesInStock === undefined || isNaN(bundlesInStock) || Number(bundlesInStock) < 0) errors.push('Bundles in stock must be zero or more.');

  if (errors.length) {
    return res.render('admin/product-form', {
      title: 'Add Product — JayB Shop',
      product: req.body,
      errors
    });
  }

  db.get('products')
    .push({
      id: uuidv4(),
      name: name.trim(),
      category: category.trim(),
      description: (description || '').trim(),
      pricePerBundle: Number(pricePerBundle),
      piecesPerBundle: Number(piecesPerBundle),
      bundlesInStock: Number(bundlesInStock),
      imageUrl: (imageUrl || '').trim(),
      createdAt: new Date().toISOString()
    })
    .write();

  res.redirect('/admin/products');
});

router.get('/products/:id/edit', (req, res) => {
  const product = db.get('products').find({ id: req.params.id }).value();
  if (!product) return res.redirect('/admin/products');
  res.render('admin/product-form', {
    title: 'Edit Product — JayB Shop',
    product,
    errors: []
  });
});

router.post('/products/:id/edit', (req, res) => {
  const { name, category, description, pricePerBundle, piecesPerBundle, bundlesInStock, imageUrl } = req.body;
  const errors = [];
  if (!name || !name.trim()) errors.push('Product name is required.');
  if (!category || !category.trim()) errors.push('Category is required.');
  if (!pricePerBundle || isNaN(pricePerBundle) || Number(pricePerBundle) <= 0) errors.push('Price per bundle must be a positive number.');
  if (!piecesPerBundle || isNaN(piecesPerBundle) || Number(piecesPerBundle) <= 0) errors.push('Pieces per bundle must be a positive number.');
  if (bundlesInStock === undefined || isNaN(bundlesInStock) || Number(bundlesInStock) < 0) errors.push('Bundles in stock must be zero or more.');

  if (errors.length) {
    return res.render('admin/product-form', {
      title: 'Edit Product — JayB Shop',
      product: { ...req.body, id: req.params.id },
      errors
    });
  }

  db.get('products')
    .find({ id: req.params.id })
    .assign({
      name: name.trim(),
      category: category.trim(),
      description: (description || '').trim(),
      pricePerBundle: Number(pricePerBundle),
      piecesPerBundle: Number(piecesPerBundle),
      bundlesInStock: Number(bundlesInStock),
      imageUrl: (imageUrl || '').trim()
    })
    .write();

  res.redirect('/admin/products');
});

router.post('/products/:id/delete', (req, res) => {
  db.get('products').remove({ id: req.params.id }).write();
  res.redirect('/admin/products');
});

// ---------- Orders ----------
router.get('/orders', (req, res) => {
  const orders = db.get('orders').sortBy('createdAt').reverse().value();
  const buyers = db.get('buyers').value();
  const ordersWithBuyer = orders.map((o) => ({
    ...o,
    buyer: buyers.find((b) => b.id === o.buyerId) || { fullName: 'Unknown', phone: '', email: '' }
  }));
  res.render('admin/orders', { title: 'Orders — JayB Shop', orders: ordersWithBuyer, formatRWF });
});

router.post('/orders/:id/confirm', (req, res) => {
  db.get('orders')
    .find({ id: req.params.id })
    .assign({ status: 'confirmed', confirmedAt: new Date().toISOString() })
    .write();
  res.redirect('/admin/orders');
});

// Cancelling restocks the bundles that were reserved for this order.
router.post('/orders/:id/cancel', (req, res) => {
  const order = db.get('orders').find({ id: req.params.id }).value();
  if (order && order.status !== 'cancelled') {
    order.items.forEach((item) => {
      const product = db.get('products').find({ id: item.productId }).value();
      if (product) {
        db.get('products')
          .find({ id: item.productId })
          .assign({ bundlesInStock: product.bundlesInStock + item.quantity })
          .write();
      }
    });
    db.get('orders').find({ id: req.params.id }).assign({ status: 'cancelled' }).write();
  }
  res.redirect('/admin/orders');
});

// ---------- Announcements ----------
router.get('/announcements', (req, res) => {
  const announcements = db.get('announcements').sortBy('createdAt').reverse().value();
  res.render('admin/announcements', { title: 'Announcements — JayB Shop', announcements });
});

router.post('/announcements/new', (req, res) => {
  const { title, message } = req.body;
  if (title && title.trim() && message && message.trim()) {
    db.get('announcements')
      .push({
        id: uuidv4(),
        title: title.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString()
      })
      .write();
  }
  res.redirect('/admin/announcements');
});

router.post('/announcements/:id/delete', (req, res) => {
  db.get('announcements').remove({ id: req.params.id }).write();
  res.redirect('/admin/announcements');
});

// ---------- Contact messages ----------
router.get('/messages', (req, res) => {
  const messages = db.get('messages').sortBy('createdAt').reverse().value();
  res.render('admin/messages', { title: 'Messages — JayB Shop', messages });
});

router.post('/messages/:id/read', (req, res) => {
  db.get('messages').find({ id: req.params.id }).assign({ read: true }).write();
  res.redirect('/admin/messages');
});

// ---------- Buyers ----------
router.get('/buyers', (req, res) => {
  const buyers = db.get('buyers').sortBy('createdAt').reverse().value();
  const orders = db.get('orders').value();
  const buyersWithStats = buyers.map((b) => ({
    ...b,
    orderCount: orders.filter((o) => o.buyerId === b.id).length
  }));
  res.render('admin/buyers', { title: 'Buyers — JayB Shop', buyers: buyersWithStats });
});

// ---------- Settings ----------
router.get('/settings', (req, res) => {
  const settings = db.get('settings').value();
  res.render('admin/settings', { title: 'Settings — JayB Shop', settings, saved: false });
});

router.post('/settings', (req, res) => {
  const { momoNumber, airtelNumber, bankName, bankAccountName, bankAccountNumber, whatsappNumber } = req.body;
  db.set('settings', {
    momoNumber: momoNumber || '',
    airtelNumber: airtelNumber || '',
    bankName: bankName || '',
    bankAccountName: bankAccountName || '',
    bankAccountNumber: bankAccountNumber || '',
    whatsappNumber: whatsappNumber || ''
  }).write();
  res.render('admin/settings', { title: 'Settings — JayB Shop', settings: db.get('settings').value(), saved: true });
});

module.exports = router;
