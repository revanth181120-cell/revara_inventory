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
  if (dimensions.layout === 'dumbbell') {
    return {
      paddingMm: forPrint ? 4.5 : 4.6,
      paddingTopMm: forPrint ? 0.35 : 0.5,
      paddingBottomMm: forPrint ? 0.35 : 0.5,
      textInsetMm: forPrint ? 0.8 : 1.0,
      brandPx: forPrint ? 14 : 15,
      codePx: forPrint ? 9 : 10,
      pricePx: forPrint ? 18 : 19,
      mrpPx: forPrint ? 12 : 13,
      offerPx: 0,
      barcodeWidth: 0,
      barcodeHeight: 0,
      sectionGapMm: forPrint ? 0.2 : 0.25,
    };
  }

  const scale = Math.min(dimensions.labelWidthMm / 50, dimensions.labelHeightMm / 25);

  return {
    paddingMm: forPrint ? 1.5 : 1,
    paddingTopMm: forPrint ? 5.5 : 1,
    paddingBottomMm: forPrint ? 0.2 : 1,
    textInsetMm: forPrint ? 1.5 : 2,
    brandPx: Math.round((forPrint ? 14 : 16) * scale),
    codePx: Math.round((forPrint ? 11 : 12) * scale),
    pricePx: Math.round(12 * scale),
    mrpPx: Math.round((forPrint ? 10 : 11) * scale),
    offerPx: 0,
    barcodeWidth: Math.max(1.0, (forPrint ? 1.4 : 1.6) * scale),
    barcodeHeight: Math.round(Math.min(dimensions.labelHeightMm * (forPrint ? 0.50 : 0.62), (forPrint ? 16 : 20) * scale)),
    sectionGapMm: forPrint ? 4.0 : 4.0,
  };
}

export function buildLabelPrintCss(dimensions: LabelDimensions, forPrint = false): string {
  if (dimensions.layout === 'dumbbell') {
    return buildDumbbellLabelPrintCss(dimensions, forPrint);
  }

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
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      font-weight: bold;
      line-height: 1.15;
    }
    .tt-label__mrp {
      font-size: ${s.mrpPx}px;
      color: #333;
      text-align: center;
      margin: 0;
      width: 100%;
    }
  `;
}

function buildDumbbellLabelPrintCss(dimensions: LabelDimensions, forPrint = false): string {
  const s = getLabelSizing(dimensions, forPrint);
  const {
    labelHeightMm,
    dumbbellLeftMm = 30,
    dumbbellBridgeMm = 20,
    dumbbellRightMm = 30,
    printOffsetXMm = 0,
    printOffsetYMm = 0,
  } = dimensions;
  const stockWidthMm = dumbbellLeftMm + dumbbellBridgeMm + dumbbellRightMm;
  const padY = forPrint ? s.paddingTopMm : s.paddingMm;
  const padX = s.paddingMm;
  const nudge = forPrint && (printOffsetXMm || printOffsetYMm)
    ? `transform: translate(${printOffsetXMm}mm, ${printOffsetYMm}mm);`
    : '';

  return `
    .tt-dumbbell {
      width: ${stockWidthMm}mm;
      height: ${labelHeightMm}mm;
      max-height: ${labelHeightMm}mm;
      display: flex;
      flex-direction: row;
      align-items: stretch;
      background: white;
      border: none;
      overflow: hidden;
      box-sizing: border-box;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      break-inside: avoid;
      direction: ltr;
      unicode-bidi: isolate;
      ${nudge}
    }
    .tt-dumbbell__left {
      width: ${dumbbellLeftMm}mm;
      height: ${labelHeightMm}mm;
      box-sizing: border-box;
      padding: ${padY}mm ${padX}mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: ${s.sectionGapMm}mm;
      overflow: hidden;
    }
    .tt-dumbbell__bridge {
      width: ${dumbbellBridgeMm}mm;
      height: ${labelHeightMm}mm;
      flex: 0 0 ${dumbbellBridgeMm}mm;
    }
    .tt-dumbbell__right {
      width: ${dumbbellRightMm}mm;
      height: ${labelHeightMm}mm;
      box-sizing: border-box;
      padding: ${padY}mm ${padX}mm;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .tt-dumbbell__brand {
      font-size: ${s.brandPx}px;
      font-weight: bold;
      letter-spacing: 0.3px;
      line-height: 1;
      padding-left: ${s.textInsetMm}mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      direction: ltr;
      unicode-bidi: plaintext;
    }
    .tt-dumbbell__code {
      font-size: ${s.codePx}px;
      font-family: monospace;
      font-weight: 700;
      line-height: 1;
      padding-left: ${s.textInsetMm}mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      direction: ltr;
      unicode-bidi: plaintext;
    }
    .tt-dumbbell__mrp {
      font-size: ${s.mrpPx}px;
      font-weight: bold;
      line-height: 1;
      text-align: center;
      white-space: nowrap;
      direction: ltr;
      unicode-bidi: plaintext;
    }
  `;
}
