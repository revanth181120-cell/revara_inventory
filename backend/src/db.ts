import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'database', 'inventory.db');

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
  transaction_id: string | null;
  product_code: string;
  product_name: string;
  category: string;
  quantity_sold: number;
  mrp: number;
  offer_price: number;
  line_discount: number;
  sale_price: number;
  cost_price: number;
  sale_datetime: string;
}

export interface DbWhatsappInvoice {
  id: string;
  transaction_id: string;
  customer_phone: string;
  bill_total: number;
  message_text: string;
  sent_at: string;
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

  const saleMigrations = [
    'ALTER TABLE sales ADD COLUMN transaction_id TEXT',
    'ALTER TABLE sales ADD COLUMN category TEXT DEFAULT \'\'',
    'ALTER TABLE sales ADD COLUMN mrp REAL DEFAULT 0',
    'ALTER TABLE sales ADD COLUMN offer_price REAL DEFAULT 0',
    'ALTER TABLE sales ADD COLUMN line_discount REAL DEFAULT 0',
  ];
  for (const sql of saleMigrations) {
    try {
      await run(db, sql);
    } catch {
      // column already exists
    }
  }

  await run(db, `CREATE TABLE IF NOT EXISTS whatsapp_invoices (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    bill_total REAL DEFAULT 0,
    message_text TEXT NOT NULL,
    sent_at TEXT NOT NULL
  )`);

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
  const salePrice = row.sale_price ?? 0;
  return {
    id: row.id,
    transactionId: row.transaction_id || undefined,
    productCode: row.product_code,
    productName: row.product_name,
    category: row.category || '',
    quantitySold: row.quantity_sold,
    mrp: row.mrp ?? salePrice,
    offerPrice: row.offer_price ?? 0,
    lineDiscount: row.line_discount ?? 0,
    salePrice,
    costPrice: row.cost_price,
    saleDateTime: row.sale_datetime,
  };
}

export class SyncValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncValidationError';
  }
}

type SyncRow = Record<string, unknown>;

function describeField(rowIndex: number, field: string): string {
  return `row ${rowIndex + 1} field "${field}"`;
}

function assertPlainRow(row: unknown, rowIndex: number): asserts row is SyncRow {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new SyncValidationError(`Invalid sync payload: row ${rowIndex + 1} must be an object.`);
  }
}

function assertRequiredString(row: SyncRow, rowIndex: number, field: string): void {
  const value = row[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new SyncValidationError(`Invalid sync payload: ${describeField(rowIndex, field)} must be a non-empty string.`);
  }
}

function assertString(row: SyncRow, rowIndex: number, field: string): void {
  const value = row[field];
  if (typeof value !== 'string') {
    throw new SyncValidationError(`Invalid sync payload: ${describeField(rowIndex, field)} must be a string.`);
  }
}

function assertOptionalString(row: SyncRow, rowIndex: number, field: string): void {
  const value = row[field];
  if (value !== undefined && typeof value !== 'string') {
    throw new SyncValidationError(`Invalid sync payload: ${describeField(rowIndex, field)} must be a string when provided.`);
  }
}

function assertOptionalNullableString(row: SyncRow, rowIndex: number, field: string): void {
  const value = row[field];
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new SyncValidationError(`Invalid sync payload: ${describeField(rowIndex, field)} must be a string when provided.`);
  }
}

function assertNonNegativeNumber(row: SyncRow, rowIndex: number, field: string, options: { optional?: boolean; integer?: boolean } = {}): void {
  const value = row[field];
  if (value === undefined && options.optional) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new SyncValidationError(`Invalid sync payload: ${describeField(rowIndex, field)} must be a non-negative finite number.`);
  }
  if (options.integer && !Number.isInteger(value)) {
    throw new SyncValidationError(`Invalid sync payload: ${describeField(rowIndex, field)} must be an integer.`);
  }
}

function assertPositiveInteger(row: SyncRow, rowIndex: number, field: string): void {
  const value = row[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new SyncValidationError(`Invalid sync payload: ${describeField(rowIndex, field)} must be a positive integer.`);
  }
}

export function validateProductsForSync(products: unknown): asserts products is ReturnType<typeof toApiProduct>[] {
  if (!Array.isArray(products)) {
    throw new SyncValidationError('Invalid sync payload: products must be an array.');
  }
  products.forEach((product, index) => {
    assertPlainRow(product, index);
    assertRequiredString(product, index, 'id');
    assertRequiredString(product, index, 'code');
    assertRequiredString(product, index, 'name');
    assertRequiredString(product, index, 'createdAt');
    assertRequiredString(product, index, 'updatedAt');
    assertString(product, index, 'category');
    assertString(product, index, 'supplier');
    assertOptionalNullableString(product, index, 'imageUrl');
    assertNonNegativeNumber(product, index, 'quantity', { integer: true });
    assertNonNegativeNumber(product, index, 'sellingPrice');
    assertNonNegativeNumber(product, index, 'offerPrice', { optional: true });
    assertNonNegativeNumber(product, index, 'costPrice');
  });
}

export function validateSalesForSync(sales: unknown): asserts sales is ReturnType<typeof toApiSale>[] {
  if (!Array.isArray(sales)) {
    throw new SyncValidationError('Invalid sync payload: sales must be an array.');
  }
  sales.forEach((sale, index) => {
    assertPlainRow(sale, index);
    assertRequiredString(sale, index, 'id');
    assertRequiredString(sale, index, 'productCode');
    assertRequiredString(sale, index, 'productName');
    assertRequiredString(sale, index, 'saleDateTime');
    assertOptionalNullableString(sale, index, 'transactionId');
    assertOptionalString(sale, index, 'category');
    assertPositiveInteger(sale, index, 'quantitySold');
    assertNonNegativeNumber(sale, index, 'salePrice');
    assertNonNegativeNumber(sale, index, 'costPrice');
    assertNonNegativeNumber(sale, index, 'mrp', { optional: true });
    assertNonNegativeNumber(sale, index, 'offerPrice', { optional: true });
    assertNonNegativeNumber(sale, index, 'lineDiscount', { optional: true });
  });
}

export async function getAllProducts(db: sqlite3.Database) {
  const rows = await all<DbProduct>(db, 'SELECT * FROM products ORDER BY code');
  return rows.map(toApiProduct);
}

export async function getAllSales(db: sqlite3.Database) {
  const rows = await all<DbSale>(db, 'SELECT * FROM sales ORDER BY sale_datetime DESC');
  return rows.map(toApiSale);
}

export async function syncProducts(db: sqlite3.Database, products: ReturnType<typeof toApiProduct>[]) {
  validateProductsForSync(products);
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

export async function syncSales(db: sqlite3.Database, sales: ReturnType<typeof toApiSale>[]) {
  validateSalesForSync(sales);
  await run(db, 'BEGIN TRANSACTION');
  try {
    await run(db, 'DELETE FROM sales');
    for (const s of sales) {
      await run(db, `INSERT INTO sales (id, transaction_id, product_code, product_name, category, quantity_sold, mrp, offer_price, line_discount, sale_price, cost_price, sale_datetime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        s.id, s.transactionId || null, s.productCode, s.productName, s.category || '',
        s.quantitySold, s.mrp ?? s.salePrice, s.offerPrice ?? 0, s.lineDiscount ?? 0,
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

export function toApiWhatsappInvoice(row: DbWhatsappInvoice) {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    customerPhone: row.customer_phone,
    billTotal: row.bill_total,
    messageText: row.message_text,
    sentAt: row.sent_at,
  };
}

export async function getAllWhatsappInvoices(db: sqlite3.Database) {
  const rows = await all<DbWhatsappInvoice>(
    db,
    'SELECT * FROM whatsapp_invoices ORDER BY sent_at DESC',
  );
  return rows.map(toApiWhatsappInvoice);
}

export async function insertWhatsappInvoice(
  db: sqlite3.Database,
  record: ReturnType<typeof toApiWhatsappInvoice>,
) {
  await run(
    db,
    `INSERT INTO whatsapp_invoices (id, transaction_id, customer_phone, bill_total, message_text, sent_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.transactionId,
      record.customerPhone,
      record.billTotal,
      record.messageText,
      record.sentAt,
    ],
  );
}
