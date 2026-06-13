import React, { useState, useMemo } from 'react';
import { Product, LABEL_FORMAT_PRESETS, LabelFormatId, LabelDimensions } from '../types/Product';
import { LabelSheet } from '../components/LabelPrint';
import { printLabelSheet } from '../utils/printLabels';
import { X, Printer, Check, Tag } from 'lucide-react';

type PrintMode = 'all' | 'selected' | 'missing';

interface BarcodePrintPageProps {
  products: Product[];
  onClose?: () => void;
  onMarkPrinted?: (ids: string[]) => void;
}

export const BarcodePrintPage: React.FC<BarcodePrintPageProps> = ({ products, onClose, onMarkPrinted }) => {
  const [mode, setMode] = useState<PrintMode>('selected');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formatId, setFormatId] = useState<LabelFormatId>('50x25-2up');
  const [customDims, setCustomDims] = useState<LabelDimensions>({
    labelWidthMm: 50,
    labelHeightMm: 25,
    columnsPerRow: 2,
    gapMm: 2,
  });

  const missingProducts = useMemo(() => products.filter((p) => !p.labelPrinted), [products]);

  const dimensions: LabelDimensions = formatId === 'custom'
    ? customDims
    : {
        labelWidthMm: LABEL_FORMAT_PRESETS[formatId].labelWidthMm,
        labelHeightMm: LABEL_FORMAT_PRESETS[formatId].labelHeightMm,
        columnsPerRow: LABEL_FORMAT_PRESETS[formatId].columnsPerRow,
        gapMm: LABEL_FORMAT_PRESETS[formatId].gapMm,
      };

  const selectedProducts = useMemo(() => {
    if (mode === 'all') return products;
    if (mode === 'missing') return missingProducts;
    return products.filter((p) => selectedIds.has(p.id));
  }, [mode, products, missingProducts, selectedIds]);

  const labelsPerRow = dimensions.columnsPerRow;
  const rowWidthMm = dimensions.labelWidthMm * dimensions.columnsPerRow + dimensions.gapMm * (dimensions.columnsPerRow - 1);
  const labelRows = Math.ceil(selectedProducts.length / labelsPerRow);

  const handleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const handleSelectProduct = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handlePrint = () => {
    const printed = printLabelSheet(dimensions);
    if (!printed) window.print();
    if (onMarkPrinted && selectedProducts.length > 0) {
      onMarkPrinted(selectedProducts.map((p) => p.id));
    }
  };

  return (
    <div className="print-container">
      <div className="print-toolbar">
        <div className="print-toolbar__content">
          <h2 className="print-toolbar__title">Print Labels</h2>
          <p className="print-toolbar__info">
            {selectedProducts.length} labels • {dimensions.labelWidthMm}×{dimensions.labelHeightMm}mm •{' '}
            {labelsPerRow} per row • {labelRows} strip{labelRows !== 1 ? 's' : ''} ({rowWidthMm}×{dimensions.labelHeightMm}mm each)
          </p>
          <p className="print-toolbar__hint">
            Driver media: {rowWidthMm}×{dimensions.labelHeightMm}mm strip ({dimensions.labelWidthMm}×{dimensions.labelHeightMm}mm × {labelsPerRow} labels) •
            Print dialog: TTprinter • Scale 100% • Margins None • Background graphics On
          </p>
        </div>
        <div className="print-toolbar__actions">
          <button className="btn btn--primary" onClick={handlePrint} disabled={selectedProducts.length === 0}>
            <Printer size={15} /> Print {selectedProducts.length} Labels
          </button>
          {onClose && (
            <button className="btn btn--ghost" onClick={onClose}>
              <X size={15} /> Close
            </button>
          )}
        </div>
      </div>

      <div className="label-size-picker">
        <span className="label-size-picker__label">Format:</span>
        {(Object.keys(LABEL_FORMAT_PRESETS) as LabelFormatId[]).map((key) => (
          <button
            key={key}
            className={`category-chip ${formatId === key ? 'category-chip--active' : ''}`}
            onClick={() => setFormatId(key)}
          >
            {LABEL_FORMAT_PRESETS[key].label}
          </button>
        ))}
      </div>

      {formatId === 'custom' && (
        <div className="label-config">
          <div className="label-config__custom">
            <label>Width (mm) <input type="number" min={20} max={120} value={customDims.labelWidthMm} onChange={(e) => setCustomDims((d) => ({ ...d, labelWidthMm: +e.target.value }))} /></label>
            <label>Height (mm) <input type="number" min={10} max={50} value={customDims.labelHeightMm} onChange={(e) => setCustomDims((d) => ({ ...d, labelHeightMm: +e.target.value }))} /></label>
            <label>Per row <input type="number" min={1} max={4} value={customDims.columnsPerRow} onChange={(e) => setCustomDims((d) => ({ ...d, columnsPerRow: +e.target.value }))} /></label>
            <label>Gap (mm) <input type="number" min={0} max={10} value={customDims.gapMm} onChange={(e) => setCustomDims((d) => ({ ...d, gapMm: +e.target.value }))} /></label>
          </div>
        </div>
      )}

      <div className="print-mode-tabs">
        <button className={`print-mode-tab ${mode === 'all' ? 'print-mode-tab--active' : ''}`} onClick={() => setMode('all')}>
          <Tag size={14} /> Print All ({products.length})
        </button>
        <button className={`print-mode-tab ${mode === 'selected' ? 'print-mode-tab--active' : ''}`} onClick={() => setMode('selected')}>
          <Check size={14} /> Print Selected ({selectedIds.size})
        </button>
        <button className={`print-mode-tab ${mode === 'missing' ? 'print-mode-tab--active' : ''}`} onClick={() => setMode('missing')}>
          <Printer size={14} /> Print Missing ({missingProducts.length})
        </button>
      </div>

      {mode === 'selected' && (
        <div className="selection-panel">
          <button className={`select-all-btn ${selectedIds.size === products.length ? 'select-all-btn--active' : ''}`} onClick={handleSelectAll}>
            <Check size={16} />
            {selectedIds.size === products.length ? 'Deselect All' : 'Select All'}
          </button>
          <div className="selection-list">
            {products.map((product) => (
              <label key={product.id} className="selection-item">
                <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => handleSelectProduct(product.id)} />
                <span className="selection-item__code">{product.code}</span>
                <span className="selection-item__name">{product.name}</span>
                {product.labelPrinted && <span className="selection-item__tag">Printed</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {mode === 'missing' && missingProducts.length === 0 && (
        <div className="empty-state" style={{ padding: '24px' }}>All products have labels printed.</div>
      )}

      {selectedProducts.length > 0 && (
        <>
          <p className="tt-preview-title">
            Preview — {labelsPerRow} labels per row ({dimensions.labelWidthMm}×{dimensions.labelHeightMm}mm each)
          </p>
          <div className="tt-label-sheet-wrap tt-label-sheet-wrap--preview">
            <LabelSheet
              products={selectedProducts.slice(0, 8)}
              dimensions={dimensions}
              className="labels-container--preview"
            />
            {selectedProducts.length > 8 && (
              <p className="tt-preview-more">+ {selectedProducts.length - 8} more labels (included when printing)</p>
            )}
          </div>

          <div className="tt-label-sheet-wrap tt-label-sheet-wrap--print">
            <LabelSheet
              products={selectedProducts}
              dimensions={dimensions}
              className="labels-container--print"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default BarcodePrintPage;
