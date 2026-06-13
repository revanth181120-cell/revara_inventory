import { LabelDimensions } from '../types/Product';
import { buildLabelPrintCss } from './labelSizing';

function buildPrintStyles(dimensions: LabelDimensions): string {
  const { labelWidthMm, labelHeightMm, columnsPerRow, gapMm } = dimensions;
  const rowWidthMm = labelWidthMm * columnsPerRow + gapMm * (columnsPerRow - 1);

  return `
    @page { size: ${rowWidthMm}mm ${labelHeightMm}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    .labels-container { margin: 0; padding: 0; }
    .label-row {
      display: grid;
      grid-template-columns: repeat(${columnsPerRow}, ${labelWidthMm}mm);
      gap: ${gapMm}mm;
      width: ${rowWidthMm}mm;
      height: ${labelHeightMm}mm;
      page-break-after: always;
      break-after: page;
      break-inside: avoid;
      overflow: hidden;
    }
    .label-row:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    ${buildLabelPrintCss(dimensions)}
  `;
}

/** Print only the label sheet in an isolated iframe — avoids paginating the whole app. */
export function printLabelSheet(dimensions: LabelDimensions): boolean {
  const source = document.querySelector('.tt-label-sheet-wrap--print .labels-container');
  if (!source) return false;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return false;
  }

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>Print Labels</title><style>${buildPrintStyles(dimensions)}</style></head><body></body></html>`);
  doc.close();
  doc.body.appendChild(source.cloneNode(true));

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  win.onafterprint = cleanup;
  setTimeout(cleanup, 30_000);

  win.focus();
  win.print();
  return true;
}
