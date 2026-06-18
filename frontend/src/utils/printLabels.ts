import { LabelDimensions, getLabelRowWidthMm, getLabelRowPitchMm } from '../types/Product';
import { buildLabelPrintCss } from './labelSizing';

const PRINT_STYLE_ID = 'revara-label-print-styles';
const PRINT_HOST_ID = 'revara-print-host';

/** One page per label row — matches TTprinter Revara 101×25mm stock per page. */
export function buildLabelPrintStyles(dimensions: LabelDimensions): string {
  const { labelWidthMm, labelHeightMm, columnsPerRow, gapMm, leadingMarginMm = 0 } = dimensions;
  const rowWidthMm = getLabelRowWidthMm(dimensions);

  return `
    @page {
      margin: 0;
      size: ${rowWidthMm}mm ${labelHeightMm}mm;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${rowWidthMm}mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body > *:not(#${PRINT_HOST_ID}) {
        display: none !important;
      }
      #${PRINT_HOST_ID} {
        display: block !important;
        margin: 0;
        padding: 0;
        width: ${rowWidthMm}mm;
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
        height: ${labelHeightMm}mm;
        margin: 0;
        padding: 0;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .print-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .label-row {
        display: grid !important;
        grid-template-columns: repeat(${columnsPerRow}, ${labelWidthMm}mm) !important;
        grid-auto-flow: column;
        align-items: start;
        align-content: start;
        direction: ltr;
        gap: ${gapMm}mm;
        padding: 0 !important;
        padding-left: ${leadingMarginMm}mm !important;
        width: ${rowWidthMm}mm !important;
        height: ${labelHeightMm}mm !important;
        max-height: ${labelHeightMm}mm !important;
        margin: 0 !important;
        overflow: hidden;
      }
      .tt-label {
        height: ${labelHeightMm}mm !important;
        max-height: ${labelHeightMm}mm !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .tt-label--spacer {
        border: none !important;
        background: transparent !important;
      }
      ${buildLabelPrintCss(dimensions, true)}
    }
  `;
}

export function injectLabelPrintStyles(dimensions: LabelDimensions): void {
  removeLabelPrintStyles();
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = buildLabelPrintStyles(dimensions);
  document.head.appendChild(style);
}

export function removeLabelPrintStyles(): void {
  document.getElementById(PRINT_STYLE_ID)?.remove();
}

function removePrintHost(): void {
  document.getElementById(PRINT_HOST_ID)?.remove();
}

/** Print one label row per page (2 labels/page for 2-up format). */
export function printLabelSheet(dimensions: LabelDimensions, onAfterPrint?: () => void): boolean {
  const source = document.querySelector('.tt-label-sheet-wrap--print .labels-container');
  if (!source) return false;

  removePrintHost();

  const host = document.createElement('div');
  host.id = PRINT_HOST_ID;
  host.appendChild(source.cloneNode(true));
  document.body.appendChild(host);

  injectLabelPrintStyles(dimensions);

  let timeoutId: number | undefined;
  let handledAfterPrint = false;

  function cleanup() {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    window.removeEventListener('afterprint', handleAfterPrint);
    removePrintHost();
    removeLabelPrintStyles();
  }

  function handleAfterPrint() {
    if (handledAfterPrint) return;
    handledAfterPrint = true;
    cleanup();
    onAfterPrint?.();
  }

  window.addEventListener('afterprint', handleAfterPrint, { once: true });
  timeoutId = window.setTimeout(cleanup, 60_000);

  try {
    window.print();
  } catch {
    cleanup();
    return false;
  }
  return true;
}

export { getLabelRowPitchMm };
