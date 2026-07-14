import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { getAllSales, initDatabase } from '../src/db';

function run(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function close(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'revara-sales-migration-'));
  const dbPath = path.join(dir, 'inventory.db');

  const legacyDb = new sqlite3.Database(dbPath);
  await run(legacyDb, `CREATE TABLE sales (
    id TEXT PRIMARY KEY,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity_sold INTEGER DEFAULT 1,
    sale_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    sale_datetime TEXT NOT NULL
  )`);
  await run(legacyDb, `INSERT INTO sales (
    id, product_code, product_name, quantity_sold, sale_price, cost_price, sale_datetime
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
    'sale-1',
    'RV-GP-ER-0001',
    'Legacy Earrings',
    2,
    499,
    125,
    '2026-07-01T10:00:00.000Z',
  ]);
  await close(legacyDb);

  const upgradedDb = await initDatabase(dbPath);
  const [sale] = await getAllSales(upgradedDb);
  await close(upgradedDb);
  fs.rmSync(dir, { recursive: true, force: true });

  assert.equal(sale.mrp, 499);
  assert.equal(sale.salePrice, 499);
  assert.equal(sale.offerPrice, 0);
  assert.equal(sale.lineDiscount, 0);
}

main()
  .then(() => {
    console.log('sales migration tests passed');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
