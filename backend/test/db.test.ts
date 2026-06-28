import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { getAllSales, syncSales } from '../src/db';

function createTestDb(): Promise<sqlite3.Database> {
  const db = new sqlite3.Database(':memory:');
  return new Promise((resolve, reject) => {
    db.exec(
      `CREATE TABLE sales (
        id TEXT PRIMARY KEY,
        product_code TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity_sold INTEGER DEFAULT 1,
        sale_price REAL DEFAULT 0,
        cost_price REAL DEFAULT 0,
        sale_datetime TEXT NOT NULL
      )`,
      (err) => (err ? reject(err) : resolve(db))
    );
  });
}

function closeDb(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

test('syncSales preserves server sales missing from a stale client snapshot', async () => {
  const db = await createTestDb();
  try {
    await syncSales(db, [
      {
        id: 'newer-server-sale',
        productCode: 'RV-GP-ER-0001',
        productName: 'Gold Earrings',
        quantitySold: 1,
        salePrice: 120,
        costPrice: 80,
        saleDateTime: '2026-06-28T08:00:00.000Z',
      },
    ]);

    await syncSales(db, [
      {
        id: 'stale-client-sale',
        productCode: 'RV-SP-BA-0002',
        productName: 'Silver Bangle',
        quantitySold: 2,
        salePrice: 75,
        costPrice: 40,
        saleDateTime: '2026-06-27T08:00:00.000Z',
      },
    ]);

    const sales = await getAllSales(db);
    assert.deepEqual(
      sales.map((sale) => sale.id).sort(),
      ['newer-server-sale', 'stale-client-sale']
    );
  } finally {
    await closeDb(db);
  }
});
