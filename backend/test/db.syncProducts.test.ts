import assert from 'assert';
import sqlite3 from 'sqlite3';
import { syncProducts, SyncValidationError } from '../src/db';

function run(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function get<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T)));
  });
}

function close(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

async function createTestDb(): Promise<sqlite3.Database> {
  const db = new sqlite3.Database(':memory:');
  await run(db, `CREATE TABLE products (
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
  )`);
  return db;
}

async function testRejectsCaseDuplicateCodesWithoutReplacingExistingRows(): Promise<void> {
  const db = await createTestDb();
  try {
    const existing = {
      id: 'existing',
      code: 'EXISTING-1',
      name: 'Existing Product',
      category: 'Test',
      supplier: 'Supplier',
      quantity: 4,
      sellingPrice: 100,
      offerPrice: 0,
      costPrice: 50,
      imageUrl: undefined,
      labelPrinted: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    await syncProducts(db, [existing]);

    await assert.rejects(
      () => syncProducts(db, [
        { ...existing, id: 'new-1', code: 'RV-GP-ER-0001' },
        { ...existing, id: 'new-2', code: 'rv-gp-er-0001' },
      ]),
      SyncValidationError,
    );

    const row = await get<{ count: number; code: string }>(
      db,
      'SELECT COUNT(*) as count, MIN(code) as code FROM products',
    );
    assert.strictEqual(row.count, 1);
    assert.strictEqual(row.code, 'EXISTING-1');
  } finally {
    await close(db);
  }
}

async function testRejectsWhitespaceDuplicateCodes(): Promise<void> {
  const db = await createTestDb();
  try {
    const product = {
      id: 'product',
      code: 'RV-GP-ER-0001',
      name: 'Product',
      category: 'Test',
      supplier: 'Supplier',
      quantity: 1,
      sellingPrice: 100,
      offerPrice: 0,
      costPrice: 50,
      imageUrl: undefined,
      labelPrinted: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    await assert.rejects(
      () => syncProducts(db, [
        product,
        { ...product, id: 'product-with-spaces', code: ' RV-GP-ER-0001 ' },
      ]),
      SyncValidationError,
    );
  } finally {
    await close(db);
  }
}

async function main(): Promise<void> {
  await testRejectsCaseDuplicateCodesWithoutReplacingExistingRows();
  await testRejectsWhitespaceDuplicateCodes();
  console.log('db.syncProducts.test.ts passed');
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
