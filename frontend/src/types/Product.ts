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
  productCode: string;
  productName: string;
  quantitySold: number;
  salePrice: number;
  costPrice: number;
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

export const CATEGORY_OPTIONS = ['All', ...Object.values(CATEGORY_MAP)];

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
}

export const MIN_LABEL_COLUMNS_PER_ROW = 1;
export const MAX_LABEL_COLUMNS_PER_ROW = 4;

export function normalizeLabelColumnsPerRow(columnsPerRow: number): number {
  if (!Number.isFinite(columnsPerRow)) {
    return MIN_LABEL_COLUMNS_PER_ROW;
  }

  return Math.min(
    MAX_LABEL_COLUMNS_PER_ROW,
    Math.max(MIN_LABEL_COLUMNS_PER_ROW, Math.trunc(columnsPerRow))
  );
}

/** Total printable row width including leading margin and gaps. */
export function getLabelRowWidthMm(dimensions: LabelDimensions): number {
  const columnsPerRow = normalizeLabelColumnsPerRow(dimensions.columnsPerRow);
  const leading = dimensions.leadingMarginMm ?? 0;
  const gaps = dimensions.gapMm * Math.max(0, columnsPerRow - 1);
  return leading + dimensions.labelWidthMm * columnsPerRow + gaps;
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
