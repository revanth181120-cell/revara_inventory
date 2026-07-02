import React from 'react';
import { Product, getSalePrice } from '../types/Product';
import { ScanLine, Camera, X, CheckCircle, AlertCircle } from 'lucide-react';

export interface LastScanResult {
  code: string;
  success: boolean;
  message: string;
  product?: Product;
  previousQty?: number;
  at: number;
}

interface QuickSellPanelProps {
  lastResult: LastScanResult | null;
  onOpenCamera: () => void;
  onClose: () => void;
  stallMode?: boolean;
}

export const QuickSellPanel: React.FC<QuickSellPanelProps> = ({
  lastResult,
  onOpenCamera,
  onClose,
  stallMode,
}) => {
  return (
    <div className="quick-sell-bar">
      <div className="quick-sell-bar__main">
        <ScanLine size={18} className="quick-sell-bar__icon" />
        <div className="quick-sell-bar__text">
          <strong>{stallMode ? 'Stall Mode active' : 'Quick Sell active'}</strong>
          <span>
            {stallMode
              ? 'Scan or search products — they add to cart. Apply discount and complete sale when done.'
              : 'Scan a barcode with your scanner — sale completes automatically'}
          </span>
        </div>
      </div>

      {lastResult && (
        <div className={`quick-sell-bar__result quick-sell-bar__result--${lastResult.success ? 'ok' : 'err'}`}>
          {lastResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{lastResult.message}</span>
          {lastResult.success && lastResult.product && lastResult.previousQty != null && (
            <span className="quick-sell-bar__stock">
              Stock: {lastResult.previousQty} → {lastResult.product.quantity}
              {' · '}₹{getSalePrice(lastResult.product).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      )}

      <div className="quick-sell-bar__actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={onOpenCamera}>
          <Camera size={14} /> Camera
        </button>
        <button type="button" className="btn-icon" onClick={onClose} title="Stop Quick Sell">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
