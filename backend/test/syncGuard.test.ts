import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type sqlite3 from 'sqlite3';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'revara-sync-test-'));
const dbPath = path.join(tempDir, 'inventory.db');
process.env.INVENTORY_DB_PATH = dbPath;

const dbModulePromise = import('../src/db');

async function closeDb(db: sqlite3.Database): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

async function withFreshDb(
  runTest: (db: sqlite3.Database, dbModule: Awaited<typeof dbModulePromise>) => Promise<void>
) {
  fs.rmSync(dbPath, { force: true });
  const dbModule = await dbModulePromise;
  const db = await dbModule.initDatabase();
  try {
    await runTest(db, dbModule);
  } finally {
    await closeDb(db);
  }
}

const product = {
  id: 'product-1',
  code: 'RV-GP-ER-0001',
  name: 'Kundan Earrings',
  category: 'Ear Set',
  supplier: 'Gold Prince',
  quantity: 4,
  sellingPrice: 250,
  offerPrice: 225,
  costPrice: 100,
  imageUrl: undefined,
  labelPrinted: false,
  createdAt: '2026-06-23T00:00:00.000Z',
  updatedAt: '2026-06-23T00:00:00.000Z',
};

const sale = {
  id: 'sale-1',
  productCode: product.code,
  productName: product.name,
  quantitySold: 1,
  salePrice: 225,
  costPrice: 100,
  saleDateTime: '2026-06-23T01:00:00.000Z',
};

test('products sync rejects accidental empty replacement and preserves existing rows', async () => {
  await withFreshDb(async (db, { EmptySyncRejectedError, getAllProducts, syncProducts }) => {
    await syncProducts(db, [product]);

    await assert.rejects(() => syncProducts(db, []), EmptySyncRejectedError);

    const products = await getAllProducts(db);
    assert.equal(products.length, 1);
    assert.equal(products[0].code, product.code);
  });
});

test('sales sync rejects accidental empty replacement and preserves existing rows', async () => {
  await withFreshDb(async (db, { EmptySyncRejectedError, getAllSales, syncSales }) => {
    await syncSales(db, [sale]);

    await assert.rejects(() => syncSales(db, []), EmptySyncRejectedError);

    const sales = await getAllSales(db);
    assert.equal(sales.length, 1);
    assert.equal(sales[0].id, sale.id);
  });
});

test('empty sync can still clear data when explicitly forced', async () => {
  await withFreshDb(async (db, { getAllProducts, syncProducts }) => {
    await syncProducts(db, [product]);
    await syncProducts(db, [], { allowEmpty: true });

    assert.equal((await getAllProducts(db)).length, 0);
  });
});

test('sync rejects non-array payloads', async () => {
  await withFreshDb(async (db, { InvalidSyncPayloadError, syncProducts, syncSales }) => {
    await assert.rejects(() => syncProducts(db, {} as never), InvalidSyncPayloadError);
    await assert.rejects(() => syncSales(db, null as never), InvalidSyncPayloadError);
  });
});
