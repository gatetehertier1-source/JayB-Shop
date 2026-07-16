// db/database.js
// Simple, dependency-light JSON database using lowdb.
// This keeps JayB Shop easy to run on any machine (no native compilers needed)
// while still giving us a real, structured data layer.

const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const dbFile = path.join(__dirname, '..', 'data', 'jayb.json');
const adapter = new FileSync(dbFile);
const db = low(adapter);

// ---- Default shape of the database ----
db.defaults({
  buyers: [],          // registered customers
  products: [],         // clothing items sold in bundles
  orders: [],           // buyer orders (proceeding -> confirmed/paid)
  announcements: [],    // admin announcements
  messages: [],         // contact form submissions
  settings: {
    momoNumber: '0796164748',
    airtelNumber: '0796164748',
    bankName: 'Bank of Kigali',
    bankAccountName: 'JayB Shop Ltd',
    bankAccountNumber: '00012345678900',
    whatsappNumber: '250796164748' // international format, no +, no leading 0
  }
}).write();

module.exports = db;
