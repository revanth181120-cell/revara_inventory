import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product, getSalePrice, productUnitProfit } from '../types/Product';
import { useHardwareScanner, normalizeScannedCode } from '../hooks/useHardwareScanner';
import { X, ShoppingCart, Camera, CheckCircle, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onClose: () => void;
  onScanSell: (code: string, quantity?: number) => { success: boolean; error?: string; product?: Product; previousQty?: number };
  getProductByCode: (code: string) => Product | undefined;
  autoSell?: boolean;
}

type ScanState = 'scanning' | 'found' | 'not_found' | 'sold';

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onClose, onScanSell, getProductByCode, autoSell = true,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const getProductRef = useRef(getProductByCode);
  getProductRef.current = getProductByCode;

  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scannedCode, setScannedCode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState('');
  const pausedRef = useRef(false);
  const [manualInput, setManualInput] = useState('');
  const [sellQty, setSellQty] = useState(1);
  const [stockUpdate, setStockUpdate] = useState<{ from: number; to: number } | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) await scannerRef.current.stop();
      } catch (_) { /* scanner may already be stopped */ }
    }
  };

  const completeSale = useCallback(async (code: string, found: Product, quantity: number = 1) => {
    await stopScanner();
    const result = onScanSell(code, quantity);
    if (result.success && result.product) {
      setScanState('sold');
      if (autoSell && result.previousQty != null) {
        setStockUpdate({
          from: result.previousQty,
          to: result.product.quantity,
        });
        setMessage(`Sold ${quantity}× "${result.product.name}" — stock ${result.previousQty} → ${result.product.quantity}`);
      } else {
        setMessage(`Added ${quantity}× "${result.product.name}" to cart`);
      }
    } else {
      setMessage(result.error || 'Sale failed.');
      setScanState('not_found');
    }
  }, [onScanSell]);

  const lookupCode = useCallback((code: string, options?: { autoSellNow?: boolean }) => {
    const normalized = normalizeScannedCode(code);
    setScannedCode(normalized);
    const found = getProductRef.current(normalized);
    if (found) {
      setProduct(found);
      setSellQty(1);
      if (options?.autoSellNow ?? autoSell) {
        void completeSale(normalized, found, 1);
        return;
      }
      setScanState('found');
    } else {
      setProduct(null);
      setScanState('not_found');
      setMessage(`No product found for code: ${normalized}`);
    }
  }, [autoSell, completeSale]);

  useHardwareScanner({
    enabled: scanState === 'scanning',
    onScan: (code) => {
      if (pausedRef.current) return;
      pausedRef.current = true;
      lookupCode(code, { autoSellNow: autoSell });
    },
  });

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 120 } },
      (decodedText) => {
        if (pausedRef.current) return;
        pausedRef.current = true;
        lookupCode(decodedText);
      },
      () => {}
    ).catch((err) => {
      setMessage(`Camera error: ${err}`);
    });

    return () => { stopScanner(); };
  }, [lookupCode]);

  const handleSell = async (quantity: number = 1) => {
    if (!scannedCode || !product) return;
    await completeSale(scannedCode, product, quantity);
  };

  const handleRescan = async () => {
    setScannedCode('');
    setProduct(null);
    setScanState('scanning');
    setMessage('');
    pausedRef.current = false;
    setManualInput('');
    setSellQty(1);
    setStockUpdate(null);

    if (scannerRef.current) {
      try {
        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 120 } },
          (decodedText) => {
            if (pausedRef.current) return;
            pausedRef.current = true;
            lookupCode(decodedText);
          },
          () => {}
        );
      } catch (_) { /* ignore restart errors */ }
    }

    manualInputRef.current?.focus();
  };

  useEffect(() => {
    if (scanState !== 'sold' || !autoSell) return;
    const timer = setTimeout(() => { void handleRescan(); }, 1500);
    return () => clearTimeout(timer);
  }, [scanState, autoSell]);

  const handleManualInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && manualInput.trim()) {
      pausedRef.current = true;
      lookupCode(manualInput.trim(), { autoSellNow: autoSell });
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal modal--scanner" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title-row">
            <Camera size={18} />
            <h2 className="modal__title">Scan Barcode</h2>
          </div>
          <button className="btn-icon" onClick={handleClose}><X size={18} /></button>
        </div>

        <div className="scanner-body">
          <div id="qr-reader" className={`scanner-viewport ${scanState !== 'scanning' ? 'scanner-viewport--hidden' : ''}`} />

          {scanState === 'scanning' && (
            <>
              <p className="scanner-hint">
                {autoSell
                  ? 'Scan with USB scanner or camera — each scan sells 1 unit automatically'
                  : 'Point your camera at a product barcode'}
              </p>
              <div className="scanner-manual">
                <p>USB scanner ready — or type code and press Enter:</p>
                <input
                  ref={manualInputRef}
                  type="text"
                  placeholder="Scan or type barcode..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={handleManualInput}
                  autoFocus
                />
              </div>
            </>
          )}

          {scanState === 'found' && product && (
            <div className="scan-result scan-result--found">
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} className="scan-result__image" />
              )}
              <CheckCircle size={32} className="scan-result__icon" />
              <h3 className="scan-result__name">{product.name}</h3>
              <p className="scan-result__code">{product.code}</p>
              <div className="scan-result__grid">
                <div><span>Category</span><strong>{product.category}</strong></div>
                <div><span>Stock</span><strong>{product.quantity} units</strong></div>
                <div><span>MRP</span><strong>₹{product.sellingPrice.toLocaleString('en-IN')}</strong></div>
                {product.offerPrice > 0 && (
                  <div><span>Offer</span><strong className="scan-offer">₹{product.offerPrice.toLocaleString('en-IN')}</strong></div>
                )}
                <div><span>Sell at</span><strong>₹{getSalePrice(product).toLocaleString('en-IN')}</strong></div>
                <div><span>Profit</span><strong className="text-profit">₹{productUnitProfit(product).toLocaleString('en-IN')}</strong></div>
              </div>
              <div className="scan-result__actions">
                <button className="btn btn--ghost" onClick={handleRescan}>Scan Again</button>
                <button
                  className="btn btn--primary"
                  onClick={() => handleSell(1)}
                  disabled={product.quantity === 0}
                >
                  <ShoppingCart size={15} /> {autoSell ? 'Sell 1' : 'Add to Cart'}
                </button>
                <button
                  className="btn btn--outline-dark"
                  onClick={() => handleSell(sellQty)}
                  disabled={product.quantity === 0 || sellQty > product.quantity}
                >
                  {autoSell ? `Sell ${sellQty}` : `Add ${sellQty}`}
                </button>
              </div>
              {product.quantity > 1 && (
                <div className="sell-qty-control">
                  <label>Sell quantity:</label>
                  <input
                    type="number"
                    min={1}
                    max={product.quantity}
                    value={sellQty}
                    onChange={(e) => setSellQty(Math.max(1, Math.min(product.quantity, parseInt(e.target.value) || 1)))}
                  />
                </div>
              )}
            </div>
          )}

          {(scanState === 'not_found' || scanState === 'sold') && (
            <div className={`scan-result scan-result--${scanState === 'sold' ? 'sold' : 'error'}`}>
              {scanState === 'sold'
                ? <CheckCircle size={32} className="scan-result__icon" />
                : <AlertCircle size={32} className="scan-result__icon" />}
              <p className="scan-result__message">{message}</p>
              {stockUpdate && (
                <div className="stock-update">
                  <span>Stock Updated</span>
                  <strong>{stockUpdate.from} → {stockUpdate.to}</strong>
                </div>
              )}
              <div className="scan-result__actions">
                <button className="btn btn--ghost" onClick={handleRescan}>Scan Again</button>
                <button className="btn btn--primary" onClick={handleClose}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
