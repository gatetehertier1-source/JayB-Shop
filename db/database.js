// db/database.js
const path = require('path');
const fs = require('fs');
const os = require('os');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { Client } = require('pg');
require('dotenv').config();

// ---------- Determine a safe writable directory for Vercel ----------
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
const dbFile = isVercel 
  ? path.join(os.tmpdir(), 'jayb.json') 
  : path.join(__dirname, '..', 'data', 'jayb.json');

// Ensure the directory/file structurally exists before lowdb opens it to prevent crashes
const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({}));
}

const fileAdapter = new FileSync(dbFile);

// 1. We create a custom adapter class that intercepts lowdb's read/write actions
class SupabaseSyncAdapter {
  constructor(sourceAdapter) {
    this.source = sourceAdapter;
    this.pgClient = null;
    
    if (process.env.DATABASE_URL) {
      this.pgClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      this.pgClient.connect()
        .then(() => {
          console.log('✅ Supabase Background Synced Successfully!');
          this.initializeSupabaseBackupTable();
        })
        .catch(err => console.error('❌ Supabase connection failed, using local backup:', err.message));
    } else {
      console.log('⚠️ No DATABASE_URL found in .env, running in local-only mode.');
    }
  }

  // Ensure our backup table exists in Supabase
  async initializeSupabaseBackupTable() {
    if (!this.pgClient) return;
    try {
      await this.pgClient.query(`
        CREATE TABLE IF NOT EXISTS lowdb_backup (
          id INT PRIMARY KEY DEFAULT 1,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err) {
      console.error('Failed to create backup table in Supabase:', err.message);
    }
  }

  // Read data locally first (super fast!), but attempt to pull latest from Supabase if empty
  read() {
    const localData = this.source.read();
    
    // Asynchronously pull any updates from Supabase to keep our local file fresh
    if (this.pgClient) {
      this.pgClient.query('SELECT data FROM lowdb_backup WHERE id = 1')
        .then(res => {
          if (res.rows.length > 0) {
            const cloudData = res.rows[0].data;
            // If cloud has data, update local file silently so it's fresh for next restart
            this.source.write(cloudData);
          }
        })
        .catch(err => console.log('Could not fetch cloud updates:', err.message));
    }
    return localData;
  }

  // When .write() is called, write to the local file instantly AND sync to Supabase in the background
  write(data) {
    // 1. Write to local file instantly (prevents route lag/freezing)
    this.source.write(data);

    // 2. Sync to Supabase cloud in the background
    if (this.pgClient) {
      const queryText = `
        INSERT INTO lowdb_backup (id, data, updated_at) 
        VALUES (1, $1, NOW())
        ON CONFLICT (id) 
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
      `;
      this.pgClient.query(queryText, [JSON.stringify(data)])
        .catch(err => console.error('❌ Cloud sync backup failed:', err.message));
    }
  }
}

// 2. Initialize lowdb using our custom Supabase Smart Adapter
const db = low(new SupabaseSyncAdapter(fileAdapter));

// ---------- Default shape of the database ----------
db.defaults({
  buyers: [],          // registered customers
  products: [],        // clothing items sold in bundles
  orders: [],          // buyer orders
  announcements: [],    // admin announcements
  messages: [],         // contact form submissions
  settings: {
    momoNumber: '0796164748',
    airtelNumber: '0796164748',
    bankName: 'Bank of Kigali',
    bankAccountName: 'JayB Shop Ltd',
    bankAccountNumber: '00012345678900',
    whatsappNumber: '250796164748'
  }
}).write();

module.exports = db;