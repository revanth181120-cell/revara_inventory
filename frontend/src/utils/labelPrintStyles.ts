import { LabelDimensions, getLabelRowWidthMm, getLabelPageHeightMm, isDumbbellLayout } from '../types/Product';
import { buildLabelPrintCss } from './labelSizing';

function buildLabelRowPrintCss(dimensions: LabelDimensions, rowWidthMm: number): string {
  const { labelWidthMm, labelHeightMm, columnsPerRow, gapMm, leadingMarginMm = 0 } = dimensions;

  if (isDumbbellLayout(dimensions)) {
    return `
      .label-row {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        direction: ltr;
        padding: 0;
        padding-left: ${leadingMarginMm}mm;
        width: ${rowWidthMm}mm;
        height: ${labelHeightMm}mm;
        max-height: ${labelHeightMm}mm;
        margin: 0;
        overflow: hidden;
      }
      .tt-dumbbell {
        height: ${labelHeightMm}mm;
        max-height: ${labelHeightMm}mm;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    `;
  }

  return `
    .label-row {
      display: grid;
      grid-template-columns: repeat(${columnsPerRow}, ${labelWidthMm}mm);
      grid-auto-flow: column;
      align-items: start;
      align-content: start;
      direction: ltr;
      gap: ${gapMm}mm;
      padding: 0;
      padding-left: ${leadingMarginMm}mm;
      width: ${rowWidthMm}mm;
      height: ${labelHeightMm}mm;
      max-height: ${labelHeightMm}mm;
      margin: 0;
      overflow: hidden;
    }
    .tt-label {
      height: ${labelHeightMm}mm;
      max-height: ${labelHeightMm}mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  `;
}

/** CSS for an isolated print iframe — one page per label row. */
export function buildLabelPrintStyles(dimensions: LabelDimensions): string {
  const { labelHeightMm } = dimensions;
  const rowWidthMm = getLabelRowWidthMm(dimensions);
  const pageHeightMm = getLabelPageHeightMm(dimensions);
  const dumbbell = isDumbbellLayout(dimensions);

  return `
    @page {
      size: ${rowWidthMm}mm ${pageHeightMm}mm;
      margin: 0;
    }
    @media print {
      @page {
        size: ${rowWidthMm}mm ${pageHeightMm}mm;
        margin: 0;
      }
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${rowWidthMm}mm;
      min-height: ${pageHeightMm}mm;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .labels-container {
      margin: 0;
      padding: 0;
      display: block;
      width: ${rowWidthMm}mm;
      direction: ltr;
    }
    .print-page {
      width: ${rowWidthMm}mm;
      height: ${pageHeightMm}mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    ${dumbbell ? `
    .print-page .label-row {
      flex: 0 0 ${labelHeightMm}mm;
    }` : ''}
    .print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    ${buildLabelRowPrintCss(dimensions, rowWidthMm)}
    .tt-label--spacer {
      border: none;
      background: transparent;
    }
    ${buildLabelPrintCss(dimensions, true)}
  `;
}
