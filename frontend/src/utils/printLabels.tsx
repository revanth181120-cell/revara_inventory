import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Product, LabelDimensions, getLabelRowWidthMm } from '../types/Product';
import { LabelSheet } from '../components/LabelPrint';
import { buildLabelPrintStyles } from './labelPrintStyles';

const MAX_RENDER_WAIT_MS = 8000;

function mountPrintIframe(dimensions: LabelDimensions): {
  iframe: HTMLIFrameElement;
  doc: Document;
  win: Window;
  mount: HTMLElement;
} | null {
  const rowWidthMm = getLabelRowWidthMm(dimensions);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.title = 'Label print';
  // Must have non-zero size — 0×0 iframes produce "0 sheets" in Edge/Chrome print preview.
  iframe.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${Math.max(rowWidthMm, 80)}mm`,
    'height:100vh',
    'border:0',
    'opacity:0',
    'pointer-events:none',
  ].join(';');

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return null;
  }

  doc.open();
  doc.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print Labels</title>' +
    `<style>${buildLabelPrintStyles(dimensions)}</style></head>` +
    '<body><div id="print-root"></div></body></html>',
  );
  doc.close();

  const mount = doc.getElementById('print-root');
  if (!mount) {
    iframe.remove();
    return null;
  }

  return { iframe, doc, win, mount };
}

function waitForPrintPages(doc: Document, expectedMin: number): Promise<number> {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const count = doc.querySelectorAll('.print-page').length;
      if (count >= expectedMin || Date.now() - started >= MAX_RENDER_WAIT_MS) {
        resolve(count);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Print labels in an isolated iframe — avoids blank pages and driver conflicts. */
export function printLabelSheet(
  dimensions: LabelDimensions,
  products: Product[],
  onAfterPrint?: () => void,
): boolean {
  if (products.length === 0) return false;

  const expectedPages = Math.ceil(products.length / Math.max(1, dimensions.columnsPerRow));
  const frame = mountPrintIframe(dimensions);
  if (!frame) return false;

  const { iframe, doc, win, mount } = frame;
  let root: Root | null = createRoot(mount);

  flushSync(() => {
    root!.render(
      <LabelSheet products={products} dimensions={dimensions} className="labels-container--print" />,
    );
  });

  const cleanup = () => {
    root?.unmount();
    root = null;
    iframe.remove();
    onAfterPrint?.();
  };

  win.addEventListener('afterprint', cleanup, { once: true });
  const cleanupTimer = window.setTimeout(cleanup, 120_000);

  void waitForPrintPages(doc, 1).then((pageCount) => {
    if (pageCount === 0) {
      window.clearTimeout(cleanupTimer);
      cleanup();
      window.alert('Labels did not render for print. Refresh the page and try again.');
      return;
    }

    try {
      win.focus();
      win.print();
    } catch {
      window.clearTimeout(cleanupTimer);
      cleanup();
      window.alert('Print could not start. Check that your label printer is connected.');
    }
  });

  return true;
}
