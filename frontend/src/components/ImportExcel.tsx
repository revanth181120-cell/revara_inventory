import { useState } from 'react';
import * as XLSX from 'xlsx';
import { ProductFormData } from '../types/Product';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { parseExcelRows, ImportSummary } from '../utils/importExcel';

type Props = {
  onImport: (products: ProductFormData[]) => void;
  onPreviewChange?: (open: boolean) => void;
};

function ImportExcel({ onImport, onPreviewChange }: Props) {
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const closePreview = () => {
    setSummary(null);
    onPreviewChange?.(false);
  };

  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);
        const result = parseExcelRows(rows);
        setSummary(result);
        onPreviewChange?.(true);
      } catch {
        setSummary({ valid: [], errors: [{ row: 0, error: 'Failed to read Excel file. Check the format.' }], warnings: [], skipped: 0, detectedColumns: [] });
        onPreviewChange?.(true);
      }
      setLoading(false);
      event.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = () => {
    if (summary && summary.valid.length > 0) {
      onImport(summary.valid);
    }
    closePreview();
  };

  return (
    <>
      <button
        className="btn btn--outline"
        onClick={() => document.getElementById('excelFile')?.click()}
        disabled={loading}
      >
        <Upload size={15} /> {loading ? 'Reading…' : 'Import Excel'}
      </button>

      <input
        id="excelFile"
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleExcelImport}
      />

      {summary && (
        <div className="modal-overlay" onClick={closePreview}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Import Preview</h2>
              <button className="btn-icon" onClick={closePreview}><X size={18} /></button>
            </div>

            <div className="import-summary">
              <div className="import-summary__stat import-summary__stat--ok">
                <CheckCircle size={18} />
                <span><strong>{summary.valid.length}</strong> valid products</span>
              </div>
              {summary.errors.length > 0 && (
                <div className="import-summary__stat import-summary__stat--err">
                  <AlertCircle size={18} />
                  <span><strong>{summary.errors.length}</strong> errors</span>
                </div>
              )}
              {summary.skipped > 0 && (
                <div className="import-summary__stat">
                  <span><strong>{summary.skipped}</strong> empty rows skipped</span>
                </div>
              )}
            </div>

            {summary.warnings.length > 0 && (
              <div className="import-errors import-errors--warn">
                <p className="import-errors__title">Import Warnings</p>
                <ul>
                  {summary.warnings.slice(0, 8).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {summary.warnings.length > 8 && (
                    <li>…and {summary.warnings.length - 8} more</li>
                  )}
                </ul>
              </div>
            )}

            {summary.detectedColumns.length > 0 && (
              <p className="import-columns">
                Detected columns: {summary.detectedColumns.join(', ')}
              </p>
            )}

            {summary.errors.length > 0 && (
              <div className="import-errors">
                <p className="import-errors__title">Validation Errors</p>
                <ul>
                  {summary.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.error}</li>
                  ))}
                  {summary.errors.length > 10 && (
                    <li>…and {summary.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            {summary.valid.length > 0 && (
              <div className="table-wrapper" style={{ maxHeight: 240, overflow: 'auto', margin: '0 24px' }}>
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th className="th-num">Qty</th>
                      <th className="th-num">MRP</th>
                      <th className="th-num">Offer</th>
                      <th className="th-num">Cost</th>
                      <th className="th-num">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.valid.slice(0, 8).map((p) => (
                      <tr key={p.code}>
                        <td><span className="product-code">{p.code}</span></td>
                        <td>{p.name}</td>
                        <td>{p.category}</td>
                        <td className="td-num">{p.quantity}</td>
                        <td className="td-num">₹{p.sellingPrice}</td>
                        <td className="td-num">{p.offerPrice > 0 ? `₹${p.offerPrice}` : '—'}</td>
                        <td className="td-num">₹{p.costPrice}</td>
                        <td className="td-num" style={{ color: '#2eb8a0' }}>
                          ₹{((p.offerPrice > 0 ? p.offerPrice : p.sellingPrice) - p.costPrice) * p.quantity}
                        </td>
                      </tr>
                    ))}
                    {summary.valid.length > 8 && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)' }}>…and {summary.valid.length - 8} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="form-actions" style={{ padding: '16px 24px 24px' }}>
              <button className="btn btn--ghost" onClick={closePreview}>Cancel</button>
              <button
                className="btn btn--primary"
                onClick={confirmImport}
                disabled={summary.valid.length === 0}
              >
                Import {summary.valid.length} Products
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ImportExcel;
