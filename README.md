# JayB Shop

A professional, multi-page clothing e-commerce site for JayB Shop (Kigali, Nyarugenge, at Charitsie Matheus). Built as a classic **Multi-Page Application (MPA)** — every page is a full server-rendered HTML page (Express + EJS), not a single-page React/Vue app.

## What's inside

- **Buyer side**: browse clothing sold in bundles, add to cart, sign up / log in, buy, and track order status.
- **Admin portal**: locked behind a fixed security code, controls every product, order, announcement, and buyer.
- **WhatsApp handoff**: clicking "Buy" reserves the bundle, then sends the buyer to WhatsApp (0796 164 748) with the order pre-filled, so you can confirm and arrange payment directly.
- **Bundle-based stock**: you set how many bundles are in stock and how many pieces are in each bundle. Stock drops automatically as bundles are bought, and buyers are told clearly when something is sold out.
- **Order status pipeline**: `Proceeding` → you confirm on WhatsApp → `Confirmed` (shown to the buyer as a green **Paid** badge).

## 1. Install

You need [Node.js](https://nodejs.org) 18 or newer installed.

```bash
cd jayb-shop
npm install
```

No native build tools, Python, or database server are required — the whole thing runs on plain JavaScript and a local JSON data file (`data/jayb.json`), which is created automatically the first time you run the app.

## 2. Run it

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

To use a different port: `PORT=4000 npm start`.

## 3. Log in as admin

Go to **http://localhost:3000/admin/login** (there's also an "Admin" link in the site footer).

The security code is:

```
JayB admin
```

This code is fixed in the code (`routes/admin.js`, constant `ADMIN_SECURITY_CODE`) and does not change on its own — edit that one line if you ever want to change it.

From the admin portal you can:
- **Products** — add clothing, set price per bundle, pieces per bundle, and bundles in stock.
- **Orders** — see every buyer's order, confirm payment (flips status to Confirmed/Paid), or cancel (automatically restocks the bundles).
- **Buyers** — see everyone who has created an account.
- **Announcements** — post updates (e.g. "New collection arriving next week").
- **Messages** — read what people send through the Contact page.
- **Settings** — update MTN MoMo / Airtel Money numbers, bank details, and the WhatsApp number used for order handoff.

## 4. How the "Buy" flow works

1. A visitor adds bundles to their cart. No login needed yet.
2. On the cart page they click **Buy**.
3. If they aren't logged in, they're sent to a buyer-only login page. Logging in (or signing up) sends them right back to finish buying.
4. Once logged in, clicking Buy:
   - Checks that enough bundles are still in stock (if not, they're told clearly and nothing is charged or reserved).
   - Reserves the bundles (stock count drops immediately).
   - Creates an order with status **Proceeding**.
   - Takes them to a payment page showing MoMo / Airtel / bank details, and a **"Chat on WhatsApp"** button.
5. The WhatsApp button opens `wa.me/250796164748` with a pre-filled message listing the order number, items, and total — so you immediately know who's buying what.
6. You confirm the order in **Admin → Orders**. The buyer's order then shows **Confirmed** and a green **Paid** badge on their "My Orders" page.

### About the WhatsApp connection

This uses WhatsApp's `wa.me` deep-link, which works instantly with no setup, no approval process, and no monthly cost — it just opens a WhatsApp chat with your number and the order text ready to send. This is the right choice for a single-owner shop like JayB Shop.

Meta also offers an official **WhatsApp Cloud API** that can send messages *automatically* without the buyer pressing send — but that requires a verified Meta Business account, a dedicated business phone number, and approval, which takes time and isn't something that can be wired up without your own Meta Business credentials. If you later get that set up, the `buildWhatsAppLink` function in `utils/helpers.js` is the one place to swap in a real API call.

## 5. Buyer accounts — how uniqueness works

- Signing up requires full name, email, phone, and password.
- If you try to log in with an email/phone that has no account: *"This account does not exist. Please create an account first."*
- If you try to sign up with an email or phone that's already registered: *"This email or phone number has already been registered. Please log in instead."*

## 6. Project structure

```
jayb-shop/
├── server.js              Main app entry point
├── db/database.js         JSON data store (lowdb) + defaults
├── routes/
│   ├── pages.js            Home, About, Contact, Announcements
│   ├── auth.js              Buyer signup/login/logout
│   ├── shop.js               Product catalogue, product detail, order history
│   ├── cart.js                Cart add/update/remove
│   ├── orders.js              Buy flow + payment page
│   └── admin.js                 Admin portal (products, orders, settings, etc.)
├── utils/helpers.js         Auth guards, currency formatting, WhatsApp link builder
├── views/                    EJS templates (buyer-facing + views/admin for the portal)
├── public/css/style.css     Design system
└── data/jayb.json          Auto-created on first run — your live data lives here
```

## 7. Notes for going to production

- Sessions currently use Express's default in-memory store, which is fine for local use and testing, but resets whenever the server restarts. For a live deployment, swap in a persistent session store (e.g. `connect-sqlite3` or Redis).
- Change the `secret` value in `server.js`'s `session(...)` config to something private before deploying publicly.
- `data/jayb.json` is your entire database — back it up regularly once you're live.
- If you outgrow the JSON file (thousands of orders), the `db/database.js` module is the only place to swap in a real database like Postgres/Supabase — nothing else in the codebase talks to the database directly except through `db.get(...)`.
