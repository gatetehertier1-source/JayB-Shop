// server.js
// JayB Shop - Multi-Page Application (MPA) server.
// Every route renders a full HTML page with EJS. No client-side framework.

const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db/database');
const { formatRWF } = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

// Available in every EJS template without passing it explicitly.
app.locals.formatRWF = formatRWF;

// ---------- View engine ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- Core middleware ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    name: 'jayb.sid',
    secret: 'jayb-shop-secret-change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  })
);

// ---------- Cart helper (session based) ----------
app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = []; // [{productId, quantity}]
  next();
});

// ---------- Global template locals ----------
app.use((req, res, next) => {
  res.locals.buyer = null;
  if (req.session.buyerId) {
    res.locals.buyer = db.get('buyers').find({ id: req.session.buyerId }).value() || null;
  }
  res.locals.isAdmin = !!req.session.isAdmin;
  res.locals.cartCount = (req.session.cart || []).reduce((sum, i) => sum + i.quantity, 0);
  res.locals.currentPath = req.path;
  next();
});

// ---------- Routes ----------
app.use('/', require('./routes/pages'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/shop'));
app.use('/', require('./routes/cart'));
app.use('/', require('./routes/orders'));
app.use('/admin', require('./routes/admin'));

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page not found' });
});

app.listen(PORT, () => {
  console.log(`JayB Shop running at http://localhost:${PORT}`);
});

// ---------- Export for Vercel Serverless ----------
module.exports = app;