// routes/auth.js
// Buyer-only authentication. Admin login lives in routes/admin.js.
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { redirectIfBuyerLoggedIn } = require('../utils/helpers');

// ---------- Signup ----------
router.get('/signup', redirectIfBuyerLoggedIn, (req, res) => {
  res.render('signup', { title: 'Create Account — JayB Shop', errors: [], form: {} });
});

router.post('/signup', redirectIfBuyerLoggedIn, (req, res) => {
  const { fullName, email, phone, password, confirmPassword } = req.body;
  const errors = [];

  if (!fullName || !fullName.trim()) errors.push('Please enter your full name.');
  if (!email || !email.trim()) errors.push('Please enter your email address.');
  if (!phone || !phone.trim()) errors.push('Please enter your phone number.');
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters.');
  if (password !== confirmPassword) errors.push('Passwords do not match.');

  if (!errors.length) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const existing = db
      .get('buyers')
      .find(
        (b) => b.email.toLowerCase() === normalizedEmail || b.phone === normalizedPhone
      )
      .value();

    if (existing) {
      errors.push('This email or phone number has already been registered. Please log in instead.');
    }
  }

  if (errors.length) {
    return res.render('signup', {
      title: 'Create Account — JayB Shop',
      errors,
      form: { fullName, email, phone }
    });
  }

  const buyer = {
    id: uuidv4(),
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString()
  };
  db.get('buyers').push(buyer).write();

  req.session.buyerId = buyer.id;
  const redirectTo = req.session.redirectAfterLogin || '/';
  delete req.session.redirectAfterLogin;
  res.redirect(redirectTo);
});

// ---------- Login ----------
router.get('/login', redirectIfBuyerLoggedIn, (req, res) => {
  res.render('login', { title: 'Log In — JayB Shop', errors: [], form: {} });
});

router.post('/login', redirectIfBuyerLoggedIn, (req, res) => {
  const { identifier, password } = req.body;
  const errors = [];

  if (!identifier || !identifier.trim() || !password) {
    errors.push('Please enter your email/phone and password.');
    return res.render('login', { title: 'Log In — JayB Shop', errors, form: { identifier } });
  }

  const normalized = identifier.trim().toLowerCase();
  const buyer = db
    .get('buyers')
    .find((b) => b.email.toLowerCase() === normalized || b.phone === identifier.trim())
    .value();

  if (!buyer) {
    errors.push('This account does not exist. Please create an account first.');
    return res.render('login', { title: 'Log In — JayB Shop', errors, form: { identifier } });
  }

  const passwordOk = bcrypt.compareSync(password, buyer.passwordHash);
  if (!passwordOk) {
    errors.push('Incorrect password. Please try again.');
    return res.render('login', { title: 'Log In — JayB Shop', errors, form: { identifier } });
  }

  req.session.buyerId = buyer.id;
  const redirectTo = req.session.redirectAfterLogin || '/';
  delete req.session.redirectAfterLogin;
  res.redirect(redirectTo);
});

// ---------- Logout ----------
router.post('/logout', (req, res) => {
  delete req.session.buyerId;
  res.redirect('/');
});

module.exports = router;
