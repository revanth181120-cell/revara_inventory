import React, { useMemo, useState } from 'react';
import { SaleRecord, saleLineProfit, saleLineTotal } from '../types/Product';
import { TrendingUp, X, Undo2 } from 'lucide-react';

interface SalesHistoryProps {
  sales: SaleRecord[];
  stats: {
    todaysSales: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    profitEarned: number;
    topSellingCategories: Record<string, number>;
  };
  onRevertSale: (saleId: string) => { success: boolean; error?: string; revertedCount?: number };
  onRevertTransaction: (transactionId: string) => { success: boolean; error?: string; revertedCount?: number };
  onClose: () => void;
}

type RevertTarget =
  | { type: 'line'; sale: SaleRecord }
  | { type: 'bill'; transactionId: string; sales: SaleRecord[] };

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  sales, stats, onRevertSale, onRevertTransaction, onClose,
}) => {
  const [filter, setFilter] = useState('');
  const [revertTarget, setRevertTarget] = useState<RevertTarget | null>(null);

  const filtered = sales.filter((s) =>
    !filter ||
    s.productCode.toLowerCase().includes(filter.toLowerCase()) ||
    s.productName.toLowerCase().includes(filter.toLowerCase()) ||
    s.category?.toLowerCase().includes(filter.toLowerCase())
  );

  const billFirstRowIds = useMemo(() => {
    const seen = new Set<string>();
    const firstIds = new Set<string>();
    for (const sale of filtered) {
      if (!sale.transactionId) continue;
      if (!seen.has(sale.transactionId)) {
        seen.add(sale.transactionId);
        firstIds.add(sale.id);
      }
    }
    return firstIds;
  }, [filtered]);

  const totalRevenue = filtered.reduce((sum, s) => sum + saleLineTotal(s), 0);
  const filteredProfit = filtered.reduce((sum, s) => sum + saleLineProfit(s), 0);

  const topCategories = Object.entries(stats.topSellingCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const confirmRevert = () => {
    if (!revertTarget) return;
    const result =
      revertTarget.type === 'line'
        ? onRevertSale(revertTarget.sale.id)
        : onRevertTransaction(revertTarget.transactionId);
    setRevertTarget(null);
    if (!result.success) {
      alert(result.error || 'Could not revert sale.');
    }
  };

  const billItemCount = (transactionId: string) =>
    sales.filter((s) => s.transactionId === transactionId).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title-row">
            <TrendingUp size={18} />
            <h2 className="modal__title">Sales Dashboard</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="sales-summary sales-summary--grid">
          <div className="sales-stat">
            <span>Today's Sales</span>
            <strong>₹{stats.todaysSales.toLocaleString('en-IN')}</strong>
          </div>
          <div className="sales-stat">
            <span>This Week</span>
            <strong>₹{stats.weeklyRevenue.toLocaleString('en-IN')}</strong>
          </div>
          <div className="sales-stat">
            <span>This Month</span>
            <strong>₹{stats.monthlyRevenue.toLocaleString('en-IN')}</strong>
          </div>
          <div className="sales-stat sales-stat--profit">
            <span>Profit Earned</span>
            <strong>₹{stats.profitEarned.toLocaleString('en-IN')}</strong>
          </div>
          <div className="sales-stat">
            <span>Total Sales</span>
            <strong>{filtered.length}</strong>
          </div>
          <div className="sales-stat">
            <span>Revenue (filtered)</span>
            <strong>₹{totalRevenue.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        {topCategories.length > 0 && (
          <div className="sales-top-categories">
            <span className="sales-top-categories__label">Top categories:</span>
            {topCategories.map(([name, count]) => (
              <span key={name} className="sales-top-categories__chip">{name} {count}</span>
            ))}
          </div>
        )}

        <div className="sales-search">
          <input
            type="text"
            placeholder="Filter by product code, name, or category…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <p className="sales-revert-hint">
          Wrong sale? Use <strong>Revert</strong> to remove it and put stock back.
        </p>

        {filtered.length === 0 ? (
          <div className="empty-state">
            {sales.length === 0 ? 'No sales recorded yet.' : 'No results match your filter.'}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th className="th-num">Qty</th>
                  <th className="th-num">MRP</th>
                  <th className="th-num">Offer</th>
                  <th className="th-num">Discount</th>
                  <th className="th-num">Final</th>
                  <th className="th-num">Profit</th>
                  <th>Date & Time</th>
                  <th className="th-actions">Revert</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="product-code">{s.productCode}</span>
                      {s.transactionId && (
                        <span className="sale-bill-tag">Bill</span>
                      )}
                    </td>
                    <td>{s.productName}</td>
                    <td className="td-num">{s.quantitySold}</td>
                    <td className="td-num">₹{s.mrp.toLocaleString('en-IN')}</td>
                    <td className="td-num">{s.offerPrice > 0 ? `₹${s.offerPrice.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="td-num">{s.lineDiscount > 0 ? `₹${s.lineDiscount.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="td-num">₹{saleLineTotal(s).toLocaleString('en-IN')}</td>
                    <td className="td-num text-profit">
                      ₹{saleLineProfit(s).toLocaleString('en-IN')}
                    </td>
                    <td className="sale-date">{formatDate(s.saleDateTime)}</td>
                    <td className="td-actions">
                      <div className="sale-revert-actions">
                        <button
                          type="button"
                          className="btn-action btn-action--revert"
                          title="Revert this line — stock restored"
                          onClick={() => setRevertTarget({ type: 'line', sale: s })}
                        >
                          <Undo2 size={14} />
                        </button>
                        {s.transactionId && billFirstRowIds.has(s.id) && billItemCount(s.transactionId) > 1 && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm sale-revert-bill"
                            onClick={() => setRevertTarget({
                              type: 'bill',
                              transactionId: s.transactionId!,
                              sales: sales.filter((x) => x.transactionId === s.transactionId),
                            })}
                          >
                            Revert bill ({billItemCount(s.transactionId)})
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {revertTarget && (
          <div className="modal-overlay" onClick={() => setRevertTarget(null)}>
            <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal__title">Revert Sale?</h3>
              {revertTarget.type === 'line' ? (
                <p className="confirm-text">
                  Remove sale of <strong>{revertTarget.sale.productName}</strong> ({revertTarget.sale.productCode})
                  — {revertTarget.sale.quantitySold} unit(s), ₹{saleLineTotal(revertTarget.sale).toLocaleString('en-IN')}.
                  Stock will be restored.
                </p>
              ) : (
                <p className="confirm-text">
                  Revert entire bill with <strong>{revertTarget.sales.length} items</strong>
                  {' '}(₹{revertTarget.sales.reduce((sum, s) => sum + saleLineTotal(s), 0).toLocaleString('en-IN')} total).
                  All lines will be removed and stock restored.
                </p>
              )}
              <div className="form-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setRevertTarget(null)}>Cancel</button>
                <button type="button" className="btn btn--danger" onClick={confirmRevert}>Revert Sale</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
