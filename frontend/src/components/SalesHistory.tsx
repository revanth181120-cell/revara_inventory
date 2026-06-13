import React, { useState } from 'react';
import { SaleRecord } from '../types/Product';
import { TrendingUp, X } from 'lucide-react';

interface SalesHistoryProps {
  sales: SaleRecord[];
  stats: {
    todaysSales: number;
    monthlyRevenue: number;
    profitEarned: number;
  };
  onClose: () => void;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, stats, onClose }) => {
  const [filter, setFilter] = useState('');

  const filtered = sales.filter((s) =>
    !filter ||
    s.productCode.toLowerCase().includes(filter.toLowerCase()) ||
    s.productName.toLowerCase().includes(filter.toLowerCase())
  );

  const totalRevenue = filtered.reduce((sum, s) => sum + s.salePrice * s.quantitySold, 0);
  const filteredProfit = filtered.reduce(
    (sum, s) => sum + (s.salePrice - s.costPrice) * s.quantitySold,
    0
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

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
          <div className="sales-stat">
            <span>Profit (filtered)</span>
            <strong>₹{filteredProfit.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div className="sales-search">
          <input
            type="text"
            placeholder="Filter by product code or name…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

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
                  <th className="th-num">Sale Price</th>
                  <th className="th-num">Profit</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td><span className="product-code">{s.productCode}</span></td>
                    <td>{s.productName}</td>
                    <td className="td-num">{s.quantitySold}</td>
                    <td className="td-num">₹{(s.salePrice * s.quantitySold).toLocaleString('en-IN')}</td>
                    <td className="td-num" style={{ color: '#2eb8a0', fontWeight: 600 }}>
                      ₹{((s.salePrice - s.costPrice) * s.quantitySold).toLocaleString('en-IN')}
                    </td>
                    <td className="sale-date">{formatDate(s.saleDateTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
