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
    label: '50×25 mm (2 per row)',
    labelWidthMm: 50,
    labelHeightMm: 25,
    columnsPerRow: 2,
    gapMm: 0,
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
}

/** @deprecated Use LABEL_FORMAT_PRESETS */
export const TT_LABEL_PRESETS = {
  '50x25': { widthMm: 50, heightMm: 25 },
  '55x25': { widthMm: 55, heightMm: 25 },
  '60x30': { widthMm: 60, heightMm: 30 },
} as const;

export type TTLabelSize = keyof typeof TT_LABEL_PRESETS;
