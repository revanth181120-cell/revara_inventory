import { LabelDimensions } from '../types/Product';

export interface LabelSizing {
  paddingMm: number;
  brandPx: number;
  codePx: number;
  pricePx: number;
  mrpPx: number;
  offerPx: number;
  barcodeWidth: number;
  barcodeHeight: number;
}

/** Scale text and barcode to label dimensions (base layout: 50×25 mm). */
export function getLabelSizing(dimensions: LabelDimensions): LabelSizing {
  const scale = Math.min(dimensions.labelWidthMm / 50, dimensions.labelHeightMm / 25);

  return {
    paddingMm: 1,
    brandPx: Math.round(16 * scale),
    codePx: Math.round(12*scale),
    pricePx: Math.round(12 * scale),
    mrpPx: Math.round(10 * scale),
    offerPx: Math.round(11 * scale),
    barcodeWidth: Math.max(1.5,2.0 * scale),
    barcodeHeight: Math.round(Math.min(dimensions.labelHeightMm * 0.68, 22 * scale)),
  };
}

export function buildLabelPrintCss(dimensions: LabelDimensions): string {
  const s = getLabelSizing(dimensions);
  const { labelWidthMm, labelHeightMm } = dimensions;

  return `
    .tt-label {
      width: ${labelWidthMm}mm;
      height: ${labelHeightMm}mm;
      padding: ${s.paddingMm}mm;
      background: white;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      overflow: hidden;
      break-inside: avoid;
    }
    .tt-label__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      line-height: 1.1;
    }
    .tt-label__brand { font-size: ${s.brandPx}px; letter-spacing: 0.5px; }
    .tt-label__code { font-size: ${s.codePx}px; font-family: monospace; font-weight: 700; }
    .tt-label__barcode {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      min-height: 0;
    }
    .tt-label__barcode svg { max-width: 100%; height: auto; }
    .tt-label__prices {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      width: 100%;
      font-weight: bold;
      line-height: 1.15;
      gap: 2px;
    }
    .tt-label__mrp { font-size: ${s.mrpPx}px; color: #333; text-align: left; }
    .tt-label__offer { font-size: ${s.offerPx}px; text-align: right; }
  `;
}
