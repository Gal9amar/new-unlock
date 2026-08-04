/**
 * migrate-to-turso.js — one-time data migration from Firestore to Turso.
 * Usage: node scripts/migrate-to-turso.js
 *
 * Reads product/survey/invoice/hilanInvoice documents straight from the
 * Firestore REST API using the local `firebase login` session (via the
 * firebase-tools CLI's stored OAuth token — no service-account file needed),
 * and inserts them into the Turso database configured in `.env`
 * (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN).
 *
 * Safe to re-run: uses INSERT OR REPLACE keyed by the original Firestore doc id.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { createClient } = require('@libsql/client');
const { loadEnv } = require('./_lib/load-env');

const PROJECT_ID = 'hamanulan-3bbc7';

function getFirebaseAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return data.tokens.access_token;
}

function firestoreGet(token, collection) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?pageSize=300`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      // Buffer raw chunks and decode once at the end — concatenating chunks
      // as strings (`body += chunk`) corrupts multi-byte UTF-8 characters
      // that land on a chunk boundary (each chunk gets decoded independently).
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode !== 200) return reject(new Error(`Firestore ${collection} -> ${res.statusCode}: ${body.slice(0, 300)}`));
        resolve(JSON.parse(body).documents || []);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Decodes a Firestore REST "Value" object into a plain JS value.
function decodeValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('doubleValue' in v) return v.doubleValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}
function decodeDoc(doc) {
  const id = doc.name.split('/').pop();
  return { id, ...decodeFields(doc.fields || {}) };
}

function toIso(v) {
  return v ? new Date(v).toISOString() : new Date().toISOString();
}
function toInt(v) {
  return v ? 1 : 0;
}

async function migrateProducts(db, token) {
  const docs = (await firestoreGet(token, 'products')).map(decodeDoc);
  for (const p of docs) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO products
            (id, title, description, image, price, discount_price, price_from, brand, category, status, tags_json, phone, whatsapp, note, including_vat, sort_order)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        p.id, p.title || '', p.desc || '', p.image || '',
        p.price ?? null, p.discount_price ?? null, toInt(p.price_from),
        p.brand || '', p.category || '', p.status || '',
        JSON.stringify(p.tags || []), p.phone || '', p.whatsapp || '',
        p.note || '', p.including_vat || '', p.order ?? 0,
      ],
    });
  }
  return docs.length;
}

async function migrateSurveys(db, token) {
  const docs = (await firestoreGet(token, 'surveys')).map(decodeDoc);
  for (const s of docs) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO surveys
            (id, customer_name, phone, stars, quality, arrival, price, attitude, recommend, comment, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        s.id, s.customer_name || '', s.phone || '', s.stars || '', s.quality || '',
        s.arrival || '', s.price || '', s.attitude || '', s.recommend || '',
        s.comment || '', toIso(s.createdAt),
      ],
    });
  }
  return docs.length;
}

async function migrateInvoices(db, token) {
  const docs = (await firestoreGet(token, 'invoices')).map(decodeDoc);
  for (const i of docs) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO invoices
            (id, name, phone, email, id_number, service_address, message, amount, vat_type, payment_method, midrag_name, invoice_issued, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        i.id, i.name || '', i.phone || '', i.email || '', i.id_number || '',
        i.service_address || '', i.message || '', i.amount || '', i.vat_type || '',
        i.payment_method || '', i.midrag_name || '', toInt(i.invoice_issued), toIso(i.createdAt),
      ],
    });
  }
  return docs.length;
}

async function migrateHilanInvoices(db, token) {
  const docs = (await firestoreGet(token, 'hilanInvoices')).map(decodeDoc);
  for (const h of docs) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO hilan_invoices
            (id, name, phone, email, id_number, service_address, invoice_date, items_json, subtotal, vat, total, payment_method, invoice_issued, is_test, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        h.id, h.name || '', h.phone || '', h.email || '', h.id_number || '',
        h.service_address || '', h.date || '', JSON.stringify(h.items || []),
        h.subtotal ?? 0, h.vat ?? 0, h.total ?? 0, h.payment_method || '',
        toInt(h.invoice_issued), toInt(h.is_test), toIso(h.createdAt),
      ],
    });
  }
  return docs.length;
}

async function main() {
  loadEnv();
  if (!process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL missing from .env');

  const token = getFirebaseAccessToken();
  const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

  const counts = {};
  counts.products = await migrateProducts(db, token);
  console.log(`✓ products: ${counts.products}`);
  counts.surveys = await migrateSurveys(db, token);
  console.log(`✓ surveys: ${counts.surveys}`);
  counts.invoices = await migrateInvoices(db, token);
  console.log(`✓ invoices: ${counts.invoices}`);
  counts.hilan_invoices = await migrateHilanInvoices(db, token);
  console.log(`✓ hilan_invoices: ${counts.hilan_invoices}`);

  console.log('\nDone. Verify counts match the Firestore console before proceeding.');
}

main().catch((e) => { console.error('MIGRATION FAILED:', e.message); process.exit(1); });
