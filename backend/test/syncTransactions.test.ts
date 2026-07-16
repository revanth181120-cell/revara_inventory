import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import sqlite3 from 'sqlite3';
import { syncProducts, syncSales } from '../src/db';

function run(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function get<T>(db: sqlite3.Database, sql: string): Promise<T> {
  return new Promise((resolve, reject) => {
    db.get(sql, (err, row) => (err ? reject(err) : resolve(row as T)));
  });
}

function close(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

async function createTestDb(): Promise<sqlite3.Database> {
  const db = new sqlite3.Database(':memory:');
  await run(
    db,
    `CREATE TABLE products (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      supplier TEXT DEFAULT '',
      quantity INTEGER DEFAULT 0,
      selling_price REAL DEFAULT 0,
      offer_price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      image_url TEXT,
      label_printed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  );
  await run(
    db,
    `CREATE TABLE sales (
      id TEXT PRIMARY KEY,
      transaction_id TEXT,
      product_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      category TEXT DEFAULT '',
      quantity_sold INTEGER DEFAULT 1,
      mrp REAL DEFAULT 0,
      offer_price REAL DEFAULT 0,
      line_discount REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      sale_datetime TEXT NOT NULL
    )`,
  );
  return db;
}

test('sync transactions on one connection do not overlap', async () => {
  const db = await createTestDb();
  try {
    const now = new Date().toISOString();

    await Promise.all([
      syncProducts(db, [
        {
          id: 'product-1',
          code: 'GP001',
          name: 'Gold Earrings',
          category: 'Earrings',
          supplier: 'Gold Prince',
          quantity: 4,
          sellingPrice: 1200,
          offerPrice: 1100,
          costPrice: 700,
          imageUrl: undefined,
          labelPrinted: false,
          createdAt: now,
          updatedAt: now,
        },
      ]),
      syncSales(db, [
        {
          id: 'sale-1',
          transactionId: 'txn-1',
          productCode: 'GP001',
          productName: 'Gold Earrings',
          category: 'Earrings',
          quantitySold: 1,
          mrp: 1200,
          offerPrice: 1100,
          lineDiscount: 0,
          salePrice: 1100,
          costPrice: 700,
          saleDateTime: now,
        },
      ]),
    ]);

    const productCount = await get<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM products');
    const saleCount = await get<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM sales');

    assert.equal(productCount.count, 1);
    assert.equal(saleCount.count, 1);
  } finally {
    await close(db);
  }
});
