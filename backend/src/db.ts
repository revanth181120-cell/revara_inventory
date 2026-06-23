import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = process.env.INVENTORY_DB_PATH || path.join(__dirname, '..', 'database', 'inventory.db');

export class InvalidSyncPayloadError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'InvalidSyncPayloadError';
  }
}

export class EmptySyncRejectedError extends Error {
  statusCode = 409;

  constructor(tableName: string) {
    super(`Refusing to replace non-empty ${tableName} table with an empty sync payload. Use force=1 to clear it explicitly.`);
    this.name = 'EmptySyncRejectedError';
  }
}

export interface DbProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  supplier: string;
  quantity: number;
  selling_price: number;
  offer_price: number;
  cost_price: number;
  image_url: string | null;
  label_printed: number;
  created_at: string;
  updated_at: string;
}

export interface DbSale {
  id: string;
  product_code: string;
  product_name: string;
  quantity_sold: number;
  sale_price: number;
  cost_price: number;
  sale_datetime: string;
}

function run(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

function all<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });
}

function get<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
  });
}

async function countRows(db: sqlite3.Database, tableName: 'products' | 'sales'): Promise<number> {
  const row = await get<{ count: number }>(db, `SELECT COUNT(*) AS count FROM ${tableName}`);
  return row?.count ?? 0;
}

async function rejectAccidentalEmptyReplace(
  db: sqlite3.Database,
  tableName: 'products' | 'sales',
  incomingCount: number,
  allowEmpty: boolean
) {
  if (incomingCount > 0 || allowEmpty) return;
  if (await countRows(db, tableName) > 0) {
    throw new EmptySyncRejectedError(tableName);
  }
}

export async function initDatabase(): Promise<sqlite3.Database> {
  const db = new sqlite3.Database(DB_PATH);

  await run(db, `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    supplier TEXT DEFAULT '',
    quantity INTEGER DEFAULT 0,
    selling_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    image_url TEXT,
    label_printed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity_sold INTEGER DEFAULT 1,
    sale_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    sale_datetime TEXT NOT NULL
  )`);

  await run(db, `CREATE TABLE IF NOT EXISTS suppliers (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL
  )`);

  // Migration: add offer_price if missing
  try {
    await run(db, 'ALTER TABLE products ADD COLUMN offer_price REAL DEFAULT 0');
  } catch {
    // column already exists
  }

  const suppliers = [
    ['GP', 'Gold Prince'],
    ['SP', 'Silver Palace'],
    ['LS', 'Lovely Shoppe'],
    ['RG', 'Rose Gold Traders'],
    ['OX', 'Oxidised Arts'],
    ['RD', 'Rhodium House'],
  ];
  for (const [code, name] of suppliers) {
    await run(db, 'INSERT OR IGNORE INTO suppliers (code, name) VALUES (?, ?)', [code, name]);
  }

  return db;
}

export function toApiProduct(row: DbProduct) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    supplier: row.supplier,
    quantity: row.quantity,
    sellingPrice: row.selling_price,
    offerPrice: row.offer_price ?? 0,
    costPrice: row.cost_price,
    imageUrl: row.image_url || undefined,
    labelPrinted: row.label_printed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toApiSale(row: DbSale) {
  return {
    id: row.id,
    productCode: row.product_code,
    productName: row.product_name,
    quantitySold: row.quantity_sold,
    salePrice: row.sale_price,
    costPrice: row.cost_price,
    saleDateTime: row.sale_datetime,
  };
}

export async function getAllProducts(db: sqlite3.Database) {
  const rows = await all<DbProduct>(db, 'SELECT * FROM products ORDER BY code');
  return rows.map(toApiProduct);
}

export async function getAllSales(db: sqlite3.Database) {
  const rows = await all<DbSale>(db, 'SELECT * FROM sales ORDER BY sale_datetime DESC');
  return rows.map(toApiSale);
}

export interface SyncOptions {
  allowEmpty?: boolean;
}

export async function syncProducts(db: sqlite3.Database, products: ReturnType<typeof toApiProduct>[], options: SyncOptions = {}) {
  if (!Array.isArray(products)) {
    throw new InvalidSyncPayloadError('Products sync payload must be an array.');
  }
  await rejectAccidentalEmptyReplace(db, 'products', products.length, options.allowEmpty ?? false);
  await run(db, 'BEGIN TRANSACTION');
  try {
    await run(db, 'DELETE FROM products');
    for (const p of products) {
      await run(db, `INSERT INTO products (id, code, name, category, supplier, quantity, selling_price, offer_price, cost_price, image_url, label_printed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        p.id, p.code, p.name, p.category, p.supplier, p.quantity,
        p.sellingPrice, p.offerPrice ?? 0, p.costPrice, p.imageUrl || null, p.labelPrinted ? 1 : 0,
        p.createdAt, p.updatedAt,
      ]);
    }
    await run(db, 'COMMIT');
  } catch (e) {
    await run(db, 'ROLLBACK');
    throw e;
  }
}

export async function syncSales(db: sqlite3.Database, sales: ReturnType<typeof toApiSale>[], options: SyncOptions = {}) {
  if (!Array.isArray(sales)) {
    throw new InvalidSyncPayloadError('Sales sync payload must be an array.');
  }
  await rejectAccidentalEmptyReplace(db, 'sales', sales.length, options.allowEmpty ?? false);
  await run(db, 'BEGIN TRANSACTION');
  try {
    await run(db, 'DELETE FROM sales');
    for (const s of sales) {
      await run(db, `INSERT INTO sales (id, product_code, product_name, quantity_sold, sale_price, cost_price, sale_datetime)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        s.id, s.productCode, s.productName, s.quantitySold,
        s.salePrice, s.costPrice, s.saleDateTime,
      ]);
    }
    await run(db, 'COMMIT');
  } catch (e) {
    await run(db, 'ROLLBACK');
    throw e;
  }
}

export async function getSuppliers(db: sqlite3.Database) {
  return all<{ code: string; name: string }>(db, 'SELECT code, name FROM suppliers ORDER BY name');
}
