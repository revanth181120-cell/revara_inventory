import React, { useState, useMemo } from 'react';
import {
  Product,
  LABEL_FORMAT_PRESETS,
  LabelFormatId,
  LabelDimensions,
  MAX_LABELS_PER_PRINT_JOB,
  getLabelRowWidthMm,
  getLabelPageHeightMm,
  dimensionsFromPreset,
  isDumbbellLayout,
  expandProductsByQuantity,
  countPrintLabels,
} from '../types/Product';
import { LabelSheet } from '../components/LabelPrint';
import { printLabelSheet } from '../utils/printLabels';
import { X, Printer, Check, Tag } from 'lucide-react';

type PrintMode = 'all' | 'selected' | 'missing';

interface BarcodePrintPageProps {
  products: Product[];
  onClose?: () => void;
  onMarkPrinted?: (ids: string[]) => void;
}

const formatLabelCount = (count: number) =>
  Number.isFinite(count) ? count.toLocaleString('en-IN') : `over ${MAX_LABELS_PER_PRINT_JOB.toLocaleString('en-IN')}`;

export const BarcodePrintPage: React.FC<BarcodePrintPageProps> = ({ products, onClose, onMarkPrinted }) => {
  const [mode, setMode] = useState<PrintMode>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [formatId, setFormatId] = useState<LabelFormatId>('50x25-2up');
  const [printByStockQty, setPrintByStockQty] = useState(true);
  const [customDims, setCustomDims] = useState<LabelDimensions>({
    labelWidthMm: 50,
    labelHeightMm: 25,
    columnsPerRow: 2,
    gapMm: 2,
  });

  const supplierOptions = useMemo(() => {
    const names = new Set<string>();
    for (const p of products) {
      names.add(p.supplier?.trim() || 'Unknown');
    }
    return ['All', ...Array.from(names).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (supplierFilter === 'All') return products;
    return products.filter((p) => (p.supplier?.trim() || 'Unknown') === supplierFilter);
  }, [products, supplierFilter]);

  const missingProducts = useMemo(
    () => filteredProducts.filter((p) => !p.labelPrinted),
    [filteredProducts],
  );

  const selectedInFilterCount = useMemo(
    () => filteredProducts.filter((p) => selectedIds.has(p.id)).length,
    [filteredProducts, selectedIds],
  );

  const dimensions: LabelDimensions = formatId === 'custom'
    ? customDims
    : dimensionsFromPreset(formatId);

  const selectedProducts = useMemo(() => {
    if (mode === 'all') return filteredProducts;
    if (mode === 'missing') return missingProducts;
    return filteredProducts.filter((p) => selectedIds.has(p.id));
  }, [mode, filteredProducts, missingProducts, selectedIds]);

  const requestedLabelCount = useMemo(
    () => countPrintLabels(selectedProducts, printByStockQty),
    [selectedProducts, printByStockQty],
  );
  const labelLimitExceeded = requestedLabelCount > MAX_LABELS_PER_PRINT_JOB;
  const labelsToPrint = useMemo(
    () => {
      if (labelLimitExceeded) return [];
      return printByStockQty
        ? expandProductsByQuantity(selectedProducts, MAX_LABELS_PER_PRINT_JOB)
        : selectedProducts;
    },
    [selectedProducts, printByStockQty, labelLimitExceeded],
  );

  const labelCount = labelLimitExceeded ? requestedLabelCount : labelsToPrint.length;
  const labelCountText = formatLabelCount(labelCount);
  const maxLabelCountText = MAX_LABELS_PER_PRINT_JOB.toLocaleString('en-IN');
  const productCount = selectedProducts.length;
  const labelsPerRow = dimensions.columnsPerRow;
  const labelRows = labelLimitExceeded ? 0 : Math.ceil(labelCount / labelsPerRow);
  const rowWidthMm = getLabelRowWidthMm(dimensions);
  const dumbbell = isDumbbellLayout(dimensions);

  const pitchMm = dimensions.rowPitchGapMm ?? 3;
  const pageHeightMm = getLabelPageHeightMm(dimensions);

  const printHint = labelLimitExceeded
    ? `Select fewer products or turn off "One label per unit in stock" to stay under ${maxLabelCountText} labels.`
    : dumbbell
    ? `Dumbbell 80×12mm • set printer paper to 80×${pageHeightMm}mm (${dimensions.labelHeightMm}+${pitchMm} pitch) • 1st pad REVARA+code • 2nd pad MRP • Scale 100% • Margins None`
    : formatId === '50x25-2up'
    ? `TTprinter: Revara 101×25mm • ${labelRows} page${labelRows !== 1 ? 's' : ''} (1 row / 2 labels per page) • Scale 100% • Margins None • Portrait`
    : `Stock ${rowWidthMm}×${dimensions.labelHeightMm}mm • Scale 100% • Margins None`;

  const handleSelectAll = () => {
    const filteredIds = filteredProducts.map((p) => p.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allFilteredSelected) filteredIds.forEach((id) => next.delete(id));
    else filteredIds.forEach((id) => next.add(id));
    setSelectedIds(next);
  };

  const handleSelectProduct = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handlePrint = () => {
    if (labelCount === 0 || labelLimitExceeded) return;
    const ok = printLabelSheet(dimensions, labelsToPrint, () => {
      if (onMarkPrinted) {
        onMarkPrinted(selectedProducts.map((p) => p.id));
      }
    });
    if (!ok) {
      window.alert('Could not start print. Refresh the page and try again.');
    }
  };

  return (
    <div className="print-container">
      <div className="print-toolbar">
        <div className="print-toolbar__content">
          <h2 className="print-toolbar__title">Print Labels</h2>
          <p className="print-toolbar__info">
            {printByStockQty && productCount > 0
              ? `${productCount} product${productCount !== 1 ? 's' : ''} → ${labelCountText} label${labelCount !== 1 ? 's' : ''} (by stock qty)`
              : `${labelCountText} label${dumbbell ? ' strip' : ''}${labelCount !== 1 ? 's' : ''}`}
            {supplierFilter !== 'All' ? ` • ${supplierFilter}` : ''}
            {' • '}
            {dumbbell
              ? `80×12mm dumbbell (${dimensions.dumbbellLeftMm}+${dimensions.dumbbellBridgeMm}+${dimensions.dumbbellRightMm}mm)`
              : `${dimensions.labelWidthMm}×${dimensions.labelHeightMm}mm • ${labelsPerRow} per row`}{' '}
            • {labelRows} strip{labelRows !== 1 ? 's' : ''} ({rowWidthMm}×{dimensions.labelHeightMm}mm each)
          </p>
          <p className="print-toolbar__hint">{printHint}</p>
        </div>
        <div className="print-toolbar__actions">
          <button className="btn btn--primary" onClick={handlePrint} disabled={labelCount === 0 || labelLimitExceeded}>
            <Printer size={15} /> Print {labelCountText} Labels
          </button>
          {onClose && (
            <button className="btn btn--ghost" onClick={onClose}>
              <X size={15} /> Close
            </button>
          )}
        </div>
      </div>

      {supplierOptions.length > 2 && (
        <div className="label-size-picker label-size-picker--wrap">
          <span className="label-size-picker__label">Supplier:</span>
          {supplierOptions.map((supplier) => (
            <button
              key={supplier}
              type="button"
              className={`category-chip ${supplierFilter === supplier ? 'category-chip--active' : ''}`}
              onClick={() => setSupplierFilter(supplier)}
            >
              {supplier === 'All' ? 'All suppliers' : supplier}
            </button>
          ))}
        </div>
      )}

      <div className="label-size-picker">
        <label className="label-size-picker__toggle">
          <input
            type="checkbox"
            checked={printByStockQty}
            onChange={(e) => setPrintByStockQty(e.target.checked)}
          />
          One label per unit in stock
        </label>
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
          <Tag size={14} /> Print All ({filteredProducts.length})
        </button>
        <button className={`print-mode-tab ${mode === 'selected' ? 'print-mode-tab--active' : ''}`} onClick={() => setMode('selected')}>
          <Check size={14} /> Print Selected ({selectedInFilterCount})
        </button>
        <button className={`print-mode-tab ${mode === 'missing' ? 'print-mode-tab--active' : ''}`} onClick={() => setMode('missing')}>
          <Printer size={14} /> Print Missing ({missingProducts.length})
        </button>
      </div>

      {mode === 'selected' && (
        <div className="selection-panel">
          <button
            className={`select-all-btn ${
              filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id))
                ? 'select-all-btn--active'
                : ''
            }`}
            onClick={handleSelectAll}
          >
            <Check size={16} />
            {filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id))
              ? 'Deselect All'
              : 'Select All'}
          </button>
          <div className="selection-list">
            {filteredProducts.map((product) => (
              <label key={product.id} className="selection-item">
                <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => handleSelectProduct(product.id)} />
                <span className="selection-item__code">{product.code}</span>
                <span className="selection-item__name">{product.name}</span>
                <span className="selection-item__supplier">{product.supplier}</span>
                <span className="selection-item__qty">Qty {product.quantity}</span>
                {product.labelPrinted && <span className="selection-item__tag">Printed</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {mode === 'missing' && missingProducts.length === 0 && (
        <div className="empty-state" style={{ padding: '24px' }}>All products have labels printed.</div>
      )}

      {labelLimitExceeded && (
        <div className="empty-state print-empty-state">
          This selection would create {labelCountText} labels. The print preview is limited to {maxLabelCountText} labels to keep the app responsive.
          Narrow the supplier/selection, lower the stock quantity, or turn off &quot;One label per unit in stock&quot;.
        </div>
      )}

      {!labelLimitExceeded && labelCount === 0 && selectedProducts.length > 0 && printByStockQty && (
        <div className="empty-state print-empty-state">
          Selected products have zero stock — nothing to print. Uncheck &quot;One label per unit in stock&quot; for one label each, or restock first.
        </div>
      )}

      {selectedProducts.length === 0 && (
        <div className="empty-state print-empty-state">
          {products.length === 0
            ? 'No products in inventory. Import Excel or add products first.'
            : filteredProducts.length === 0
            ? `No products for supplier "${supplierFilter}". Choose another supplier or All suppliers.`
            : mode === 'selected'
            ? 'No products selected. Check items below or switch to Print All.'
            : mode === 'missing'
            ? supplierFilter === 'All'
              ? 'All products already have printed labels.'
              : `All ${supplierFilter} products already have printed labels.`
            : 'Nothing to print.'}
        </div>
      )}

      {!labelLimitExceeded && labelCount > 0 && (
        <>
          <p className="tt-preview-title">
            Preview — {dumbbell
              ? `80×12mm dumbbell strip (30mm REVARA+code | 20mm gap | 30mm MRP)`
              : `${labelsPerRow} labels per row (${dimensions.labelWidthMm}×${dimensions.labelHeightMm}mm each)`}
            {printByStockQty ? ' • expanded by stock qty' : ''}
          </p>
          <div className="tt-label-sheet-wrap tt-label-sheet-wrap--preview">
            <LabelSheet
              products={labelsToPrint.slice(0, 8)}
              dimensions={dimensions}
              className="labels-container--preview"
            />
            {labelCount > 8 && (
              <p className="tt-preview-more">+ {formatLabelCount(labelCount - 8)} more labels (included when printing)</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BarcodePrintPage;
