import { ProductFormData, parseSupplierFromCode, CATEGORY_MAP } from '../types/Product';

/** Priority order — first match wins. Offer Price is intentionally excluded from selling. */
const SELLING_PRICE_COLUMNS = [
  'Selling Price', 'sellingPrice', 'MRP', 'Retail Price', 'Sale Price', 'SP', 'Price', 'price',
];

const COST_PRICE_COLUMNS = [
  'Rate', 'rate', 'Cost Price', 'costPrice', 'Cost', 'Purchase Price', 'CP', 'Wholesale Price',
];

const OFFER_PRICE_COLUMNS = ['Offer Price', 'offerPrice', 'Offer', 'Discounted Price'];

const CODE_COLUMNS = ['Product Code', 'code', 'Code', 'SKU', 'Barcode', 'Product ID', 'Item Code'];
const NAME_COLUMNS = ['Product Name', 'name', 'Name', 'Item Name', 'Description', 'Product'];
const CATEGORY_COLUMNS = ['Category', 'category', 'Type', 'Product Type', 'Item Category'];
const SUPPLIER_COLUMNS = ['Supplier', 'supplier', 'Vendor', 'Wholesaler', 'Source'];
const QTY_COLUMNS = ['Qty', 'quantity', 'Quantity', 'Stock', 'Units', 'QTY'];

function findColumn(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
      return row[alias];
    }
  }
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const match = keys.find((k) => k.toLowerCase().trim() === alias.toLowerCase().trim());
    if (match && row[match] !== undefined && row[match] !== '') return row[match];
  }
  return undefined;
}

function parseNumber(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') return 0;
  const cleaned = String(raw).replace(/[₹,\s]/g, '');
  return Number(cleaned);
}

function parseCategory(raw: string, code: string): string {
  if (raw) return raw.trim();
  const parts = code.split('-');
  if (parts.length >= 3) {
    const catCode = parts[2].toUpperCase();
    return CATEGORY_MAP[catCode] || catCode;
  }
  return '';
}

export interface ImportRowResult {
  row: number;
  data?: ProductFormData;
  error?: string;
  warning?: string;
}

export interface ImportSummary {
  valid: ProductFormData[];
  errors: ImportRowResult[];
  warnings: string[];
  skipped: number;
  detectedColumns: string[];
}

export function parseExcelRows(rows: Record<string, unknown>[]): ImportSummary {
  const valid: ProductFormData[] = [];
  const errors: ImportRowResult[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const hasSellingCol = SELLING_PRICE_COLUMNS.some((c) =>
    detectedColumns.some((k) => k.toLowerCase().trim() === c.toLowerCase().trim())
  );
  const hasOfferCol = OFFER_PRICE_COLUMNS.some((c) =>
    detectedColumns.some((k) => k.toLowerCase().trim() === c.toLowerCase().trim())
  );
  const hasRateCol = COST_PRICE_COLUMNS.some((c) =>
    detectedColumns.some((k) => k.toLowerCase().trim() === c.toLowerCase().trim())
  );

  if (!hasSellingCol && hasOfferCol) {
    warnings.push(
      'Sheet has "Offer Price" but no "Selling Price" / "MRP" column. Offer prices will NOT be used — add a Selling Price column or rename it.'
    );
  }
  if (!hasRateCol && !detectedColumns.some((k) => /cost/i.test(k))) {
    warnings.push('No "Rate" or "Cost Price" column detected — wholesale costs may import as ₹0.');
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const codeRaw = findColumn(row, CODE_COLUMNS);
    const nameRaw = findColumn(row, NAME_COLUMNS);

    if (!codeRaw && !nameRaw) {
      skipped++;
      return;
    }

    const code = String(codeRaw || '').trim();
    const name = String(nameRaw || '').trim();

    if (!code) {
      errors.push({ row: rowNum, error: 'Missing product code' });
      return;
    }
    if (!name) {
      errors.push({ row: rowNum, error: `"${code}" has no product name` });
      return;
    }

    const quantity = parseNumber(findColumn(row, QTY_COLUMNS));
    const sellingPrice = parseNumber(findColumn(row, SELLING_PRICE_COLUMNS));
    const costPrice = parseNumber(findColumn(row, COST_PRICE_COLUMNS));
    const offerPrice = parseNumber(findColumn(row, OFFER_PRICE_COLUMNS));

    if (isNaN(quantity) || quantity < 0) {
      errors.push({ row: rowNum, error: `"${code}": invalid quantity` });
      return;
    }
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      errors.push({ row: rowNum, error: `"${code}": invalid selling price` });
      return;
    }
    if (isNaN(costPrice) || costPrice < 0) {
      errors.push({ row: rowNum, error: `"${code}": invalid cost price` });
      return;
    }

    if (sellingPrice === 0 && offerPrice > 0) {
      errors.push({
        row: rowNum,
        error: `"${code}": selling price is ₹0 but offer price is ₹${offerPrice}. Add a Selling Price column.`,
      });
      return;
    }

    if (costPrice === 0 && sellingPrice > 0) {
      warnings.push(`Row ${rowNum} (${code}): cost/rate is ₹0 — profit will look higher than reality.`);
    }

    if (sellingPrice > 0 && costPrice > 0 && sellingPrice < costPrice) {
      warnings.push(`Row ${rowNum} (${code}): selling ₹${sellingPrice} is below cost ₹${costPrice}.`);
    }

    if (offerPrice > 0 && sellingPrice > 0 && offerPrice < sellingPrice) {
      const marginOnSelling = ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(0);
      const marginOnOffer = ((offerPrice - costPrice) / offerPrice * 100).toFixed(0);
      if (Number(marginOnOffer) < Number(marginOnSelling) - 10) {
        warnings.push(
          `Row ${rowNum} (${code}): offer ₹${offerPrice} vs selling ₹${sellingPrice}. System uses selling price for inventory value.`
        );
      }
    }

    const supplierRaw = findColumn(row, SUPPLIER_COLUMNS);
    const categoryRaw = findColumn(row, CATEGORY_COLUMNS);

    valid.push({
      code,
      name,
      category: parseCategory(String(categoryRaw || ''), code),
      supplier: String(supplierRaw || parseSupplierFromCode(code) || 'Unknown').trim(),
      quantity,
      sellingPrice,
      offerPrice: offerPrice > 0 ? offerPrice : 0,
      costPrice,
    });
  });

  return { valid, errors, warnings: [...new Set(warnings)], skipped, detectedColumns };
}
