import React, { useEffect, useState } from 'react';
import { Product } from '../types/Product';
import { LabelPrint } from '../components/LabelPrint';
import { LABEL_FORMAT_PRESETS } from '../types/Product';

interface BarcodePrintProps {
  product: Product;
  onClose: () => void;
}

export const BarcodePrint: React.FC<BarcodePrintProps> = ({ product, onClose }) => {
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => window.print();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--print-preview" onClick={(e) => e.stopPropagation()}>
        {/* Screen-only controls */}
        <div className="print-controls no-print">
          <h3>Print Barcode Label</h3>
          <div className="print-controls__row">
            <label>Copies:</label>
            <input
              type="number"
              min={1}
              max={50}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="print-controls__actions">
            <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn--primary" onClick={handlePrint}>🖨 Print</button>
          </div>
        </div>

        {/* Printable area */}
        <div className="print-area">
          {Array.from({ length: copies }).map((_, i) => (
            <LabelPrint
              key={i}
              product={product}
              dimensions={{
                labelWidthMm: LABEL_FORMAT_PRESETS['50x25-2up'].labelWidthMm,
                labelHeightMm: LABEL_FORMAT_PRESETS['50x25-2up'].labelHeightMm,
                columnsPerRow: 1,
                gapMm: 2,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: fixed;
            top: 0; left: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 12px;
          }
          .no-print { display: none !important; }
          .modal-overlay { background: white; }
        }
      `}</style>
    </div>
  );
};
