import { LabelDimensions } from '../types/Product';

export interface LabelSizing {
  paddingMm: number;
  paddingTopMm: number;
  paddingBottomMm: number;
  /** Inset from left (REVARA, MRP) and right (code, Offer) edges (mm). */
  textInsetMm: number;
  brandPx: number;
  codePx: number;
  pricePx: number;
  mrpPx: number;
  offerPx: number;
  barcodeWidth: number;
  barcodeHeight: number;
  /** Vertical gap between REVARA, barcode, and MRP rows (mm). */
  sectionGapMm: number;
}

/** Scale text and barcode to label dimensions (base layout: 50×25 mm). */
export function getLabelSizing(dimensions: LabelDimensions, forPrint = false): LabelSizing {
  const scale = Math.min(dimensions.labelWidthMm / 50, dimensions.labelHeightMm / 25);

  return {
    paddingMm: forPrint ? 0.2 : 1,
    paddingTopMm: forPrint ? 0.2 : 1,
    paddingBottomMm: forPrint ? 0.2 : 1,
    textInsetMm: forPrint ? 1.5 : 2,
    brandPx: Math.round((forPrint ? 14 : 16) * scale),
    codePx: Math.round((forPrint ? 11 : 12) * scale),
    pricePx: Math.round(12 * scale),
    mrpPx: Math.round((forPrint ? 9 : 10) * scale),
    offerPx: Math.round((forPrint ? 10 : 11) * scale),
    barcodeWidth: Math.max(1.0, (forPrint ? 1.4 : 1.6) * scale),
    barcodeHeight: Math.round(Math.min(dimensions.labelHeightMm * (forPrint ? 0.50 : 0.62), (forPrint ? 16 : 20) * scale)),
    sectionGapMm: forPrint ? 3.0 : 3.0,
  };
}

export function buildLabelPrintCss(dimensions: LabelDimensions, forPrint = false): string {
  const s = getLabelSizing(dimensions, forPrint);
  const { labelWidthMm, labelHeightMm, printOffsetXMm = 0, printOffsetYMm = 0 } = dimensions;
  const padTop = forPrint ? s.paddingTopMm : s.paddingMm;
  const padBottom = forPrint ? s.paddingBottomMm : s.paddingMm;
  const padX = s.paddingMm;
  const nudge = forPrint && (printOffsetXMm || printOffsetYMm)
    ? `transform: translate(${printOffsetXMm}mm, ${printOffsetYMm}mm);`
    : '';

  return `
    .tt-label {
      width: ${labelWidthMm}mm;
      height: ${labelHeightMm}mm;
      max-height: ${labelHeightMm}mm;
      padding: ${padTop}mm ${padX}mm ${padBottom}mm ${padX}mm;
      background: white;
      border: none;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: ${s.sectionGapMm}mm;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      overflow: hidden;
      break-inside: avoid;
      box-sizing: border-box;
      ${nudge}
    }
    .tt-label__header {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      font-weight: bold;
      line-height: 1.1;
    }
    .tt-label__brand { font-size: ${s.brandPx}px; letter-spacing: 0.5px; margin-left: ${s.textInsetMm}mm; justify-self: start; }
    .tt-label__code {
      font-size: ${s.codePx}px; font-family: monospace; font-weight: 700;
      margin-right: ${s.textInsetMm}mm; justify-self: end;
      max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .tt-label__barcode {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 0 0 auto;
    }
    .tt-label__barcode svg { max-width: 100%; height: auto; }
    .tt-label__prices {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: baseline;
      width: 100%;
      font-weight: bold;
      line-height: 1.15;
    }
    .tt-label__mrp { font-size: ${s.mrpPx}px; color: #333; margin-left: ${s.textInsetMm}mm; justify-self: start; }
    .tt-label__offer {
      font-size: ${s.offerPx}px; margin-right: ${s.textInsetMm}mm;
      justify-self: end; text-align: right;
      max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
  `;
}
