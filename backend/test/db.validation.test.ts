import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SyncValidationError,
  validateProductsForSync,
  validateSalesForSync,
} from '../src/db';

const timestamp = '2026-10-10T06:30:00.000Z';

function validProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    code: 'RV-GP-ER-0001',
    name: 'Ear Set',
    category: 'Ear Set',
    supplier: 'Gold Prince',
    quantity: 5,
    sellingPrice: 999,
    offerPrice: 799,
    costPrice: 400,
    imageUrl: undefined,
    labelPrinted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function validSale(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sale-1',
    transactionId: 'txn-1',
    productCode: 'RV-GP-ER-0001',
    productName: 'Ear Set',
    category: 'Ear Set',
    quantitySold: 1,
    mrp: 999,
    offerPrice: 799,
    lineDiscount: 0,
    salePrice: 799,
    costPrice: 400,
    saleDateTime: timestamp,
    ...overrides,
  };
}

function assertValidationError(fn: () => void, messagePart: string) {
  assert.throws(
    fn,
    (error: unknown) => error instanceof SyncValidationError && error.message.includes(messagePart),
  );
}

test('product sync validation accepts valid product snapshots', () => {
  assert.doesNotThrow(() => validateProductsForSync([
    validProduct(),
    validProduct({ id: 'product-2', code: 'RV-SP-BA-0002', offerPrice: undefined }),
  ]));
});

test('product sync validation rejects null and fractional stock quantities', () => {
  assertValidationError(
    () => validateProductsForSync([validProduct({ quantity: null })]),
    'field "quantity"',
  );
  assertValidationError(
    () => validateProductsForSync([validProduct({ quantity: 1.5 })]),
    'must be an integer',
  );
});

test('sale sync validation accepts valid sale snapshots', () => {
  assert.doesNotThrow(() => validateSalesForSync([
    validSale(),
    validSale({ id: 'sale-2', mrp: undefined, offerPrice: undefined, lineDiscount: undefined }),
  ]));
});

test('sale sync validation rejects negative quantities and non-finite prices', () => {
  assertValidationError(
    () => validateSalesForSync([validSale({ quantitySold: -1 })]),
    'field "quantitySold"',
  );
  assertValidationError(
    () => validateSalesForSync([validSale({ salePrice: Number.NaN })]),
    'field "salePrice"',
  );
});
