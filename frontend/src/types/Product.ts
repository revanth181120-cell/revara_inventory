export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  supplier: string;
  quantity: number;
  sellingPrice: number;
  offerPrice: number;
  costPrice: number;
  imageUrl?: string;
  labelPrinted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleRecord {
  id: string;
  transactionId?: string;
  productCode: string;
  productName: string;
  category: string;
  quantitySold: number;
  mrp: number;
  offerPrice: number;
  lineDiscount: number;
  salePrice: number;
  costPrice: number;
  saleDateTime: string;
  /** Sold from cart without inventory — no stock deducted */
  isCustom?: boolean;
  pendingStockId?: string;
}

export interface CartItem {
  cartLineId: string;
  isCustom?: boolean;
  productId?: string;
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  mrp: number;
  offerPrice: number;
  unitPrice: number;
  costPrice: number;
}

/** Misc items sold but not yet in product master — add to inventory at end of day */
export interface PendingStockItem {
  id: string;
  saleId: string;
  name: string;
  category: string;
  quantitySold: number;
  sellingPrice: number;
  costPrice: number;
  saleDateTime: string;
  resolved: boolean;
}

export interface CompletedTransaction {
  transactionId: string;
  items: SaleRecord[];
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
  saleDateTime: string;
}

export type ProductFormData = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'labelPrinted'>;

export const CATEGORY_MAP: Record<string, string> = {
  ER: 'Ear Set',
  BA: 'Bangles',
  NS: 'Necklace Set',
  BR: 'Bracelet',
  RI: 'Ring',
  JU: 'Jumka',
  MA: 'Maang Tikka',
  AN: 'Anklet',
  PE: 'Pendant',
};

export const MATERIAL_MAP: Record<string, string> = {
  GP: 'Gold Plated',
  SP: 'Silver Plated',
  RG: 'Rose Gold',
  OX: 'Oxidised',
  RD: 'Rhodium',
};

/** Supplier codes embedded in product codes (RV-GP-ER-0001 → GP) */
export const SUPPLIER_MAP: Record<string, string> = {
  GP: 'Gold Prince',
  SP: 'Silver Palace',
  LS: 'Lovely Shoppe',
  RG: 'Rose Gold Traders',
  OX: 'Oxidised Arts',
  RD: 'Rhodium House',
};

export const CATEGORY_OPTIONS = ['All', ...Object.values(CATEGORY_MAP), 'Misc'];

export function parseSupplierFromCode(code: string): string {
  const parts = code.split('-');
  if (parts.length >= 2) {
    const supplierCode = parts[1].toUpperCase();
    return SUPPLIER_MAP[supplierCode] || supplierCode;
  }
  return '';
}

/** Price charged at sale — offer price if set, otherwise MRP/selling price */
export function getSalePrice(product: Pick<Product, 'sellingPrice' | 'offerPrice'>): number {
  return product.offerPrice > 0 ? product.offerPrice : product.sellingPrice;
}

export function productToCartItem(product: Product, quantity = 1): CartItem {
  return {
    cartLineId: product.id,
    isCustom: false,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    category: product.category || 'Uncategorized',
    quantity,
    mrp: product.sellingPrice,
    offerPrice: product.offerPrice,
    unitPrice: getSalePrice(product),
    costPrice: product.costPrice,
  };
}

export function createCustomCartItem(input: {
  name: string;
  unitPrice: number;
  costPrice?: number;
  quantity?: number;
  category?: string;
}): CartItem {
  const cartLineId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const unitPrice = input.unitPrice;
  return {
    cartLineId,
    isCustom: true,
    productCode: 'MISC',
    productName: input.name.trim(),
    category: input.category?.trim() || 'Misc',
    quantity: Math.max(1, input.quantity ?? 1),
    mrp: unitPrice,
    offerPrice: 0,
    unitPrice,
    costPrice: input.costPrice ?? 0,
  };
}

export function normalizeSaleRecord(raw: Partial<SaleRecord> & { productCode: string }): SaleRecord {
  const salePrice = raw.salePrice ?? 0;
  return {
    id: raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    transactionId: raw.transactionId,
    productCode: raw.productCode,
    productName: raw.productName || '',
    category: raw.category || '',
    quantitySold: raw.quantitySold ?? 1,
    mrp: raw.mrp ?? salePrice,
    offerPrice: raw.offerPrice ?? 0,
    lineDiscount: raw.lineDiscount ?? 0,
    salePrice,
    costPrice: raw.costPrice ?? 0,
    saleDateTime: raw.saleDateTime || new Date().toISOString(),
    isCustom: raw.isCustom ?? false,
    pendingStockId: raw.pendingStockId,
  };
}

export function saleLineProfit(sale: SaleRecord): number {
  const sellUnit = profitUnitPrice(sale);
  const gross = (sellUnit - sale.costPrice) * sale.quantitySold;
  return gross - (sale.lineDiscount ?? 0);
}

export function saleLineTotal(sale: Pick<SaleRecord, 'salePrice' | 'quantitySold'>): number {
  return sale.salePrice * sale.quantitySold;
}

/** Unit sell price used for profit — offer (or MRP) for inventory, sell price for misc */
export function profitUnitPrice(item: CartItem | SaleRecord): number {
  return catalogUnitPrice(item);
}

/** Profit on one cart line before overall bill discount */
export function cartLineProfit(item: CartItem): number {
  return (profitUnitPrice(item) - item.costPrice) * item.quantity;
}

/** Unit profit for a product master record (scanner / table) */
export function productUnitProfit(product: Pick<Product, 'sellingPrice' | 'offerPrice' | 'costPrice'>): number {
  return getSalePrice(product) - product.costPrice;
}

/** Human-readable label for invoice / receipt lines */
export function invoiceLineLabel(item: Pick<SaleRecord, 'productCode' | 'productName' | 'quantitySold' | 'isCustom'>): string {
  const qty = item.quantitySold > 1 ? ` ×${item.quantitySold}` : '';
  if (item.isCustom) {
    return `${item.productName}${qty}`;
  }
  return `${item.productCode}${qty}`;
}

/** Product has a store offer below MRP (not bill-level discount) */
export function itemHasStoreOffer(item: Pick<SaleRecord | CartItem, 'mrp' | 'offerPrice' | 'isCustom'>): boolean {
  return Boolean(!item.isCustom && item.offerPrice > 0 && item.offerPrice < item.mrp);
}

/** Unit price before any bill-level discount */
export function catalogUnitPrice(item: CartItem | SaleRecord): number {
  if (item.isCustom) {
    if ('unitPrice' in item) return item.unitPrice;
    const qty = Math.max(1, item.quantitySold);
    return (item.salePrice * qty + (item.lineDiscount ?? 0)) / qty;
  }
  return itemHasStoreOffer(item) ? item.offerPrice : item.mrp;
}

/** Line total before bill-level discount — sums to cart/invoice subtotal */
export function catalogLineTotal(item: CartItem | SaleRecord): number {
  const qty = 'quantity' in item ? item.quantity : item.quantitySold;
  return catalogUnitPrice(item) * qty;
}

/** MRP / offer text for invoice lines, e.g. "MRP ₹899 · Offer ₹699" */
export function formatInvoicePriceDetail(item: Pick<SaleRecord | CartItem, 'mrp' | 'offerPrice' | 'isCustom'>): string {
  if (item.isCustom) return '';
  const mrp = `MRP ₹${item.mrp.toLocaleString('en-IN')}`;
  if (!itemHasStoreOffer(item)) return mrp;
  return `${mrp} · Offer ₹${item.offerPrice.toLocaleString('en-IN')}`;
}

/** One label row per unit in stock (skips quantity 0). */
export function expandProductsByQuantity(products: Product[]): Product[] {
  const rows: Product[] = [];
  for (const product of products) {
    const qty = Math.max(0, Math.floor(product.quantity));
    for (let i = 0; i < qty; i++) {
      rows.push(product);
    }
  }
  return rows;
}

export function countPrintLabels(products: Product[], byStockQuantity: boolean): number {
  if (!byStockQuantity) return products.length;
  return products.reduce((sum, p) => sum + Math.max(0, Math.floor(p.quantity)), 0);
}

export type LabelLayout = 'standard' | 'dumbbell';

export const LABEL_FORMAT_PRESETS = {
  '50x25-2up': {
    id: '50x25-2up' as const,
    label: '50×25 mm (2 per row, 101mm stock)',
    labelWidthMm: 49.5,
    labelHeightMm: 25,
    columnsPerRow: 2,
    gapMm: 2,
    leadingMarginMm: 0,
    rowGapMm: 0,
    /** Physical vertical gap between die-cut rows on the roll (mm). */
    rowPitchGapMm: 2,
    printOffsetXMm: 0.3,
    printOffsetYMm: -1.0,
  },
  '100x25-single': {
    id: '100x25-single' as const,
    label: '100×25 mm (single)',
    labelWidthMm: 100,
    labelHeightMm: 25,
    columnsPerRow: 1,
    gapMm: 2,
  },
  '80x12-dumbbell': {
    id: '80x12-dumbbell' as const,
    label: '80×12 mm dumbbell (30+20+30)',
    layout: 'dumbbell' as LabelLayout,
    stockWidthMm: 80,
    labelWidthMm: 80,
    labelHeightMm: 12,
    dumbbellLeftMm: 30,
    dumbbellBridgeMm: 20,
    dumbbellRightMm: 30,
    columnsPerRow: 1,
    gapMm: 0,
    leadingMarginMm: 0,
    rowPitchGapMm: 3,
    /** Set true only if REVARA/MRP pads print on the wrong side. */
    dumbbellMirrorForPrint: false,
    printOffsetXMm: 0,
    printOffsetYMm: 0,
  },
  custom: {
    id: 'custom' as const,
    label: 'Custom',
    labelWidthMm: 50,
    labelHeightMm: 25,
    columnsPerRow: 2,
    gapMm: 2,
  },
};

export type LabelFormatId = keyof typeof LABEL_FORMAT_PRESETS;

export interface LabelDimensions {
  labelWidthMm: number;
  labelHeightMm: number;
  columnsPerRow: number;
  gapMm: number;
  layout?: LabelLayout;
  /** Total die-cut row width on the roll (mm). */
  stockWidthMm?: number;
  /** Dumbbell: left printable pad width (mm). */
  dumbbellLeftMm?: number;
  /** Dumbbell: center bridge / non-print gap (mm). */
  dumbbellBridgeMm?: number;
  /** Dumbbell: right printable pad width (mm). */
  dumbbellRightMm?: number;
  /** Space before the first label on each row (mm). */
  leadingMarginMm?: number;
  /** Vertical gap between printed label strips / rows (mm). */
  rowGapMm?: number;
  /** Physical gap between die-cut rows on the roll — used for multi-row pitch (mm). */
  rowPitchGapMm?: number;
  /** Print-only horizontal nudge (mm). Positive = right. */
  printOffsetXMm?: number;
  /** Print-only vertical nudge (mm). Negative = up. */
  printOffsetYMm?: number;
  /** Swap pad order when printing (fixes mirrored label printers). */
  dumbbellMirrorForPrint?: boolean;
}

export function isDumbbellLayout(dimensions: LabelDimensions): boolean {
  return dimensions.layout === 'dumbbell';
}

export function getDumbbellStockWidthMm(dimensions: LabelDimensions): number {
  if (dimensions.stockWidthMm) return dimensions.stockWidthMm;
  return (dimensions.dumbbellLeftMm ?? 30) + (dimensions.dumbbellBridgeMm ?? 20) + (dimensions.dumbbellRightMm ?? 30);
}

/** Build label dimensions from a preset (excludes custom). */
export function dimensionsFromPreset(formatId: Exclude<LabelFormatId, 'custom'>): LabelDimensions {
  const p = LABEL_FORMAT_PRESETS[formatId];
  return {
    labelWidthMm: p.labelWidthMm,
    labelHeightMm: p.labelHeightMm,
    columnsPerRow: p.columnsPerRow,
    gapMm: p.gapMm,
    layout: 'layout' in p ? p.layout : undefined,
    stockWidthMm: 'stockWidthMm' in p ? p.stockWidthMm : undefined,
    dumbbellLeftMm: 'dumbbellLeftMm' in p ? p.dumbbellLeftMm : undefined,
    dumbbellBridgeMm: 'dumbbellBridgeMm' in p ? p.dumbbellBridgeMm : undefined,
    dumbbellRightMm: 'dumbbellRightMm' in p ? p.dumbbellRightMm : undefined,
    leadingMarginMm: 'leadingMarginMm' in p ? p.leadingMarginMm : undefined,
    rowGapMm: 'rowGapMm' in p ? p.rowGapMm : undefined,
    rowPitchGapMm: 'rowPitchGapMm' in p ? p.rowPitchGapMm : undefined,
    printOffsetXMm: 'printOffsetXMm' in p ? p.printOffsetXMm : undefined,
    printOffsetYMm: 'printOffsetYMm' in p ? p.printOffsetYMm : undefined,
    dumbbellMirrorForPrint: 'dumbbellMirrorForPrint' in p ? p.dumbbellMirrorForPrint : undefined,
  };
}

/** Page height for @page — includes row pitch gap on dumbbell rolls. */
export function getLabelPageHeightMm(dimensions: LabelDimensions): number {
  if (isDumbbellLayout(dimensions)) {
    return getLabelRowPitchMm(dimensions);
  }
  return dimensions.labelHeightMm;
}

/** Total printable row width including leading margin and gaps. */
export function getLabelRowWidthMm(dimensions: LabelDimensions): number {
  if (isDumbbellLayout(dimensions)) {
    return (dimensions.leadingMarginMm ?? 0) + getDumbbellStockWidthMm(dimensions);
  }
  const leading = dimensions.leadingMarginMm ?? 0;
  const gaps = dimensions.gapMm * Math.max(0, dimensions.columnsPerRow - 1);
  return leading + dimensions.labelWidthMm * dimensions.columnsPerRow + gaps;
}

/** Distance from top of one row to top of the next on die-cut roll (label + gap). */
export function getLabelRowPitchMm(dimensions: LabelDimensions): number {
  const pitchGap = dimensions.rowPitchGapMm ?? 2;
  return dimensions.labelHeightMm + pitchGap;
}

/** Total height for a continuous multi-row strip. */
export function getLabelStripHeightMm(dimensions: LabelDimensions, rowCount: number): number {
  return getLabelRowPitchMm(dimensions) * Math.max(1, rowCount);
}

/** @deprecated Use LABEL_FORMAT_PRESETS */
export const TT_LABEL_PRESETS = {
  '50x25': { widthMm: 50, heightMm: 25 },
  '55x25': { widthMm: 55, heightMm: 25 },
  '60x30': { widthMm: 60, heightMm: 30 },
} as const;

export type TTLabelSize = keyof typeof TT_LABEL_PRESETS;
