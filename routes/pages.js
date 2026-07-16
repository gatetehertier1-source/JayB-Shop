// routes/pages.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ---------- Home ----------
router.get('/', (req, res) => {
  const products = db.get('products').value();
  const featured = products.slice(-8).reverse(); // most recently added first
  const latestAnnouncement = db
    .get('announcements')
    .sortBy('createdAt')
    .last()
    .value();

  res.render('index', {
    title: 'JayB Shop — Premium Clothing, Made in Kigali',
    featured,
    latestAnnouncement
  });
});

// ---------- About ----------
router.get('/about', (req, res) => {
  res.render('about', { title: 'About Us — JayB Shop' });
});

// ---------- Announcements ----------
router.get('/announcements', (req, res) => {
  const announcements = db.get('announcements').sortBy('createdAt').reverse().value();
  res.render('announcements', { title: 'Announcements — JayB Shop', announcements });
});

// ---------- Contact ----------
router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us — JayB Shop', sent: false, errors: [] });
});

router.post('/contact', (req, res) => {
  const { name, contactInfo, message } = req.body;
  const errors = [];
  if (!name || !name.trim()) errors.push('Please tell us your name.');
  if (!contactInfo || !contactInfo.trim()) errors.push('Please leave an email or phone number so we can reach you back.');
  if (!message || !message.trim()) errors.push('Please write your message.');

  if (errors.length) {
    return res.render('contact', { title: 'Contact Us — JayB Shop', sent: false, errors });
  }

  const { v4: uuidv4 } = require('uuid');
  db.get('messages')
    .push({
      id: uuidv4(),
      name: name.trim(),
      contactInfo: contactInfo.trim(),
      message: message.trim(),
      read: false,
      createdAt: new Date().toISOString()
    })
    .write();

  res.render('contact', { title: 'Contact Us — JayB Shop', sent: true, errors: [] });
});

module.exports = router;
