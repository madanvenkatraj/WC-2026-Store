'use strict';

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 8),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 12000,
  keepAlive: true
});
pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error:', error.message));

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
app.use('/api/', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

const productSeed = [
  { id: 'argentina-skyline-home', name: 'Argentina Skyline Home', nation: 'Argentina', countryCode: 'ARG', category: 'Home', edition: 'Supporter Edition', price: 84, compareAt: 105, badge: 'Fan favourite', featured: true, description: 'Sky-blue hoops, crisp white panels and a lightweight match-day feel.', colors: ['#77c6ed', '#f8fbff', '#244b81'], pattern: 'stripes', tagline: 'For the champions in your heart.', stock: { XS: 8, S: 18, M: 24, L: 20, XL: 14, XXL: 7 } },
  { id: 'brazil-canary-home', name: 'Brazil Canary Home', nation: 'Brazil', countryCode: 'BRA', category: 'Home', edition: 'Supporter Edition', price: 82, compareAt: 99, badge: 'Bestseller', featured: true, description: 'A bright canary-yellow statement with green trim and a bold pitch-side look.', colors: ['#f5d629', '#177747', '#ffffff'], pattern: 'sunburst', tagline: 'Bring the samba to the stands.', stock: { XS: 7, S: 16, M: 22, L: 20, XL: 15, XXL: 6 } },
  { id: 'france-midnight-away', name: 'France Midnight Away', nation: 'France', countryCode: 'FRA', category: 'Away', edition: 'Supporter Edition', price: 86, compareAt: 108, badge: 'New drop', featured: true, description: 'Deep midnight blue, a tricolour flash and a clean modern silhouette.', colors: ['#132a57', '#e43e48', '#f8f4e8'], pattern: 'diagonal', tagline: 'Liberté in every thread.', stock: { XS: 6, S: 15, M: 23, L: 19, XL: 12, XXL: 5 } },
  { id: 'mexico-verde-home', name: 'Mexico Verde Home', nation: 'Mexico', countryCode: 'MEX', category: 'Home', edition: 'Supporter Edition', price: 80, compareAt: 96, badge: 'Crowd pick', featured: true, description: 'Rich green body with subtle geometric texture and red-white detailing.', colors: ['#087c50', '#e7f0dc', '#d84143'], pattern: 'geo', tagline: 'Hecho para alentar.', stock: { XS: 8, S: 17, M: 25, L: 21, XL: 13, XXL: 7 } },
  { id: 'usa-starry-away', name: 'USA Starry Away', nation: 'United States', countryCode: 'USA', category: 'Away', edition: 'Supporter Edition', price: 83, compareAt: 101, badge: 'Limited run', featured: false, description: 'A pale base, red accents and navy details for match nights under the lights.', colors: ['#e9edf5', '#c93b4b', '#172f5e'], pattern: 'stars', tagline: 'Made for the long way home.', stock: { XS: 7, S: 14, M: 18, L: 16, XL: 10, XXL: 4 } },
  { id: 'japan-blue-flame', name: 'Japan Blue Flame', nation: 'Japan', countryCode: 'JPN', category: 'Away', edition: 'Supporter Edition', price: 81, compareAt: 98, badge: 'Fan favourite', featured: false, description: 'Electric blue, sharp contrast lines and a design inspired by forward motion.', colors: ['#123f94', '#55b6e9', '#f7f8fb'], pattern: 'waves', tagline: 'Play with precision.', stock: { XS: 7, S: 15, M: 20, L: 18, XL: 11, XXL: 4 } },
  { id: 'spain-solar-home', name: 'Spain Solar Home', nation: 'Spain', countryCode: 'ESP', category: 'Home', edition: 'Supporter Edition', price: 84, compareAt: 103, badge: null, featured: false, description: 'Solar red with golden detailing and a confident, classic football silhouette.', colors: ['#c92f3e', '#f5c742', '#f7f5ec'], pattern: 'stripes', tagline: 'The beautiful game, played beautifully.', stock: { XS: 8, S: 18, M: 22, L: 20, XL: 12, XXL: 5 } },
  { id: 'germany-ice-away', name: 'Germany Ice Away', nation: 'Germany', countryCode: 'GER', category: 'Away', edition: 'Supporter Edition', price: 85, compareAt: 102, badge: null, featured: false, description: 'Ice-white base, graphite accents and a precision-cut graphic panel.', colors: ['#edf0f5', '#202a37', '#d43a47'], pattern: 'diagonal', tagline: 'Built for big moments.', stock: { XS: 6, S: 14, M: 21, L: 18, XL: 12, XXL: 5 } },
  { id: 'portugal-crimson-home', name: 'Portugal Crimson Home', nation: 'Portugal', countryCode: 'POR', category: 'Home', edition: 'Supporter Edition', price: 84, compareAt: 104, badge: 'Fan favourite', featured: false, description: 'Crimson and forest green details with a warm, premium finish.', colors: ['#c52e3d', '#176748', '#f8f0df'], pattern: 'blocks', tagline: 'Coração on your sleeve.', stock: { XS: 7, S: 15, M: 23, L: 19, XL: 12, XXL: 5 } },
  { id: 'netherlands-orange-training', name: 'Netherlands Orange Training', nation: 'Netherlands', countryCode: 'NED', category: 'Training', edition: 'Training Top', price: 59, compareAt: 72, badge: 'Easy layer', featured: false, description: 'A breathable warm-up layer in vivid orange with understated dark trim.', colors: ['#f06c21', '#202a37', '#ffffff'], pattern: 'diagonal', tagline: 'Warm up. Turn it up.', stock: { XS: 9, S: 20, M: 28, L: 22, XL: 15, XXL: 8 } },
  { id: 'england-white-home', name: 'England White Home', nation: 'England', countryCode: 'ENG', category: 'Home', edition: 'Supporter Edition', price: 82, compareAt: 99, badge: null, featured: false, description: 'Clean white body, restrained navy trim and a timeless terrace-inspired look.', colors: ['#f7f7f3', '#223764', '#cf3642'], pattern: 'pinstripe', tagline: 'Sing it till the final whistle.', stock: { XS: 8, S: 18, M: 24, L: 21, XL: 14, XXL: 6 } },
  { id: 'nigeria-lime-training', name: 'Nigeria Lime Training', nation: 'Nigeria', countryCode: 'NGA', category: 'Training', edition: 'Training Top', price: 62, compareAt: 74, badge: 'Fresh colour', featured: false, description: 'High-energy lime with dark green accents for training or everyday wear.', colors: ['#b6df35', '#126b4b', '#f7f7ec'], pattern: 'geo', tagline: 'Energy from first touch.', stock: { XS: 8, S: 17, M: 25, L: 20, XL: 13, XXL: 5 } },
  { id: 'argentina-retro-celeste', name: 'Celeste Retro Warm-Up', nation: 'Argentina', countryCode: 'ARG', category: 'Retro', edition: 'Retro Collection', price: 69, compareAt: 84, badge: 'Retro edit', featured: false, description: 'A relaxed retro-inspired warm-up shirt with vintage colours and soft handfeel.', colors: ['#83c4e4', '#f2f2ec', '#172f56'], pattern: 'stripes', tagline: 'Old-school feel. New-school passion.', stock: { XS: 8, S: 16, M: 23, L: 19, XL: 12, XXL: 5 } }
];

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nation TEXT NOT NULL,
      country_code TEXT NOT NULL,
      category TEXT NOT NULL,
      edition TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
      compare_at_price NUMERIC(10,2),
      badge TEXT,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      description TEXT NOT NULL,
      colors JSONB NOT NULL DEFAULT '[]'::jsonb,
      pattern TEXT NOT NULL DEFAULT 'stripes',
      tagline TEXT NOT NULL DEFAULT '',
      sizes_stock JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL,
      shipping NUMERIC(10,2) NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      size TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
    CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (LOWER(email));
    CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
  `);

  const existing = await pool.query('SELECT COUNT(*)::int AS count FROM products');
  if (existing.rows[0].count === 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const p of productSeed) {
        await client.query(
          `INSERT INTO products (id,name,nation,country_code,category,edition,price,compare_at_price,badge,featured,description,colors,pattern,tagline,sizes_stock)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15::jsonb)`,
          [p.id, p.name, p.nation, p.countryCode, p.category, p.edition, p.price, p.compareAt, p.badge,
            p.featured, p.description, JSON.stringify(p.colors), p.pattern, p.tagline, JSON.stringify(p.stock)]
        );
      }
      await client.query('COMMIT');
      console.log(`Seeded ${productSeed.length} sample jersey products.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

function publicProduct(row) {
  return {
    id: row.id,
    name: row.name,
    nation: row.nation,
    countryCode: row.country_code,
    category: row.category,
    edition: row.edition,
    price: Number(row.price),
    compareAt: row.compare_at_price == null ? null : Number(row.compare_at_price),
    badge: row.badge,
    featured: row.featured,
    description: row.description,
    colors: row.colors,
    pattern: row.pattern,
    tagline: row.tagline,
    stock: row.sizes_stock
  };
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

const checkoutLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const newsletterLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.get('/api/products', async (req, res, next) => {
  try {
    const clauses = [];
    const values = [];
    const add = (sql, value) => { values.push(value); clauses.push(sql.replace('?', `$${values.length}`)); };
    const q = String(req.query.q || '').trim().slice(0, 80);
    const category = String(req.query.category || '').trim();
    const nation = String(req.query.nation || '').trim();
    const min = req.query.min === undefined ? null : Number(req.query.min);
    const max = req.query.max === undefined ? null : Number(req.query.max);
    if (q) {
      values.push(q, q, q);
      const base = values.length - 2;
      clauses.push(`(name ILIKE '%' || $${base} || '%' OR nation ILIKE '%' || $${base + 1} || '%' OR description ILIKE '%' || $${base + 2} || '%')`);
    }
    if (category && ['Home', 'Away', 'Training', 'Retro'].includes(category)) add('category = ?', category);
    if (nation && nation.length <= 50) add('nation = ?', nation);
    if (Number.isFinite(min) && min >= 0) add('price >= ?', min);
    if (Number.isFinite(max) && max >= 0) add('price <= ?', max);
    const sort = String(req.query.sort || 'featured');
    const orderBy = {
      featured: 'featured DESC, created_at ASC',
      'price-asc': 'price ASC, name ASC',
      'price-desc': 'price DESC, name ASC',
      name: 'name ASC'
    }[sort] || 'featured DESC, created_at ASC';
    const sql = `SELECT * FROM products ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY ${orderBy}`;
    const result = await pool.query(sql, values);
    res.json({ products: result.rows.map(publicProduct), count: result.rowCount });
  } catch (error) { next(error); }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: publicProduct(result.rows[0]) });
  } catch (error) { next(error); }
});

app.post('/api/orders', checkoutLimiter, async (req, res, next) => {
  const body = req.body || {};
  const customer = {
    name: String(body.name || '').trim().slice(0, 100),
    email: String(body.email || '').trim().toLowerCase().slice(0, 254),
    phone: String(body.phone || '').trim().slice(0, 30),
    address: String(body.address || '').trim().slice(0, 200),
    city: String(body.city || '').trim().slice(0, 100),
    postalCode: String(body.postalCode || '').trim().slice(0, 20),
    country: String(body.country || '').trim().slice(0, 80)
  };
  if (!customer.name || !customer.email || !customer.address || !customer.city || !customer.postalCode || !customer.country) {
    return badRequest(res, 'Please complete all required delivery details.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return badRequest(res, 'Enter a valid email address.');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) return badRequest(res, 'Your cart is empty or has too many separate items.');
  const normalized = [];
  const validSizes = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  for (const item of body.items) {
    const productId = String(item.productId || '').slice(0, 100);
    const size = String(item.size || '').toUpperCase();
    const quantity = Number(item.quantity);
    if (!productId || !validSizes.has(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return badRequest(res, 'One or more cart items have an invalid size or quantity.');
    }
    normalized.push({ productId, size, quantity });
  }

  const client = await pool.connect();
  const orderId = crypto.randomUUID();
  const orderNumber = `NPL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  try {
    await client.query('BEGIN');
    // Aggregate repeated product/size lines so stock is reserved accurately in concurrent checkouts.
    const grouped = new Map();
    for (const item of normalized) {
      const key = `${item.productId}::${item.size}`;
      const old = grouped.get(key);
      if (old) old.quantity += item.quantity;
      else grouped.set(key, { ...item });
    }
    const lineItems = [];
    let subtotal = 0;
    for (const item of grouped.values()) {
      const result = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
      if (!result.rowCount) throw Object.assign(new Error('A product in your cart is no longer available.'), { statusCode: 400 });
      const row = result.rows[0];
      const stock = row.sizes_stock || {};
      const available = Number(stock[item.size] || 0);
      if (available < item.quantity) throw Object.assign(new Error(`${row.name} (${item.size}) has only ${available} left in stock.`), { statusCode: 409 });
      stock[item.size] = available - item.quantity;
      await client.query('UPDATE products SET sizes_stock = $1::jsonb WHERE id = $2', [JSON.stringify(stock), item.productId]);
      const unitPrice = Number(row.price);
      subtotal += unitPrice * item.quantity;
      lineItems.push({ productId: row.id, name: row.name, size: item.size, quantity: item.quantity, unitPrice });
    }
    subtotal = Math.round(subtotal * 100) / 100;
    const shipping = subtotal >= 120 ? 0 : 6;
    const total = Math.round((subtotal + shipping) * 100) / 100;
    await client.query(
      `INSERT INTO orders (id,order_number,customer_name,email,phone,address,city,postal_code,country,subtotal,shipping,total,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'confirmed')`,
      [orderId, orderNumber, customer.name, customer.email, customer.phone, customer.address, customer.city, customer.postalCode, customer.country, subtotal, shipping, total]
    );
    for (const item of lineItems) {
      await client.query(
        'INSERT INTO order_items (order_id,product_id,product_name,size,quantity,unit_price) VALUES ($1,$2,$3,$4,$5,$6)',
        [orderId, item.productId, item.name, item.size, item.quantity, item.unitPrice]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({
      order: { orderNumber, status: 'confirmed', subtotal, shipping, total, itemCount: lineItems.reduce((n, item) => n + item.quantity, 0), customerName: customer.name },
      message: 'Your order has been saved.'
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  } finally { client.release(); }
});

app.get('/api/orders/:orderNumber', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.order_number,o.status,o.subtotal,o.shipping,o.total,o.created_at,o.customer_name,
              json_agg(json_build_object('name',i.product_name,'size',i.size,'quantity',i.quantity,'unitPrice',i.unit_price)) AS items
       FROM orders o JOIN order_items i ON i.order_id = o.id
       WHERE o.order_number = $1 GROUP BY o.id`,
      [String(req.params.orderNumber).slice(0, 80)]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Order not found.' });
    const order = result.rows[0];
    res.json({ order: { orderNumber: order.order_number, status: order.status, subtotal: Number(order.subtotal), shipping: Number(order.shipping), total: Number(order.total), createdAt: order.created_at, customerName: order.customer_name, items: order.items } });
  } catch (error) { next(error); }
});

app.post('/api/newsletter', newsletterLimiter, async (req, res, next) => {
  try {
    const email = String((req.body || {}).email || '').trim().toLowerCase().slice(0, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest(res, 'Enter a valid email address.');
    await pool.query('INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
    res.status(201).json({ message: 'You are on the list. Watch your inbox for the next drop.' });
  } catch (error) { next(error); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
app.get('/{*path}', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((error, req, res, next) => {
  console.error('Request failed:', error.message);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

async function start() {
  try {
    await initDatabase();
    const server = app.listen(PORT, '0.0.0.0', () => console.log(`Jersey store running at http://localhost:${PORT}`));
    const shutdown = async (signal) => {
      console.log(`${signal} received; shutting down gracefully.`);
      server.close(async () => { await pool.end(); process.exit(0); });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Could not initialise PostgreSQL. Check DATABASE_URL/network access.', error.message);
    process.exit(1);
  }
}

if (require.main === module) start();
module.exports = { app, pool, initDatabase, publicProduct };
