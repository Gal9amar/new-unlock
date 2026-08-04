-- Turso / libSQL schema for new-unlock
-- Mirrors the Firestore collections: products, surveys, invoices, hilanInvoices
-- Run once against the target database (local file for dev, Turso for prod).

CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  image           TEXT,
  price           REAL,
  discount_price  REAL,
  price_from      INTEGER DEFAULT 0,
  brand           TEXT,
  category        TEXT,
  status          TEXT,
  tags_json       TEXT,
  phone           TEXT,
  whatsapp        TEXT,
  note            TEXT,
  including_vat   TEXT,
  sort_order      INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_products_order ON products(sort_order);

CREATE TABLE IF NOT EXISTS surveys (
  id              TEXT PRIMARY KEY,
  customer_name   TEXT,
  phone           TEXT,
  stars           TEXT,
  quality         TEXT,
  arrival         TEXT,
  price           TEXT,
  attitude        TEXT,
  recommend       TEXT,
  comment         TEXT,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_surveys_created ON surveys(created_at);

CREATE TABLE IF NOT EXISTS invoices (
  id                TEXT PRIMARY KEY,
  name              TEXT,
  phone             TEXT,
  email             TEXT,
  id_number         TEXT,
  service_address   TEXT,
  message           TEXT,
  amount            TEXT,
  vat_type          TEXT,
  payment_method    TEXT,
  midrag_name       TEXT,
  invoice_issued    INTEGER DEFAULT 0,
  is_test           INTEGER DEFAULT 0,
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);

CREATE TABLE IF NOT EXISTS hilan_invoices (
  id                TEXT PRIMARY KEY,
  name              TEXT,
  phone             TEXT,
  email             TEXT,
  id_number         TEXT,
  service_address   TEXT,
  invoice_date      TEXT,
  items_json        TEXT NOT NULL,
  subtotal          REAL,
  vat               REAL,
  total             REAL,
  payment_method    TEXT,
  invoice_issued    INTEGER DEFAULT 0,
  is_test           INTEGER DEFAULT 0,
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hilan_invoices_created ON hilan_invoices(created_at);

-- New table, not present in Firestore: email-code auth for the single admin user.
CREATE TABLE IF NOT EXISTS auth_codes (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  used          INTEGER DEFAULT 0,
  attempts      INTEGER DEFAULT 0,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_codes_email_created ON auth_codes(email, created_at);
