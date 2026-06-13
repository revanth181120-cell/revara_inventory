import React, { useState } from 'react';
import {
  Package, Layers, AlertTriangle, TrendingDown, TrendingUp,
  DollarSign, Wallet, BarChart3, ChevronDown, ChevronUp, Plus,
} from 'lucide-react';
import { Product } from '../types/Product';

interface DashboardProps {
  stats: {
    totalProducts: number;
    totalStock: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalCostValue: number;
    totalSellingValue: number;
    expectedProfit: number;
    profitMarginPercent: number;
    profitEarned: number;
    todaysSales: number;
    monthlyRevenue: number;
    supplierCounts: Record<string, number>;
    lowStockProducts: Product[];
    outOfStockProducts: Product[];
  };
  onFilterChange?: (filter: 'all' | 'low' | 'out' | null) => void;
  activeFilter?: 'all' | 'low' | 'out' | null;
  onRestock?: (id: string) => void;
}

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
  onClick?: () => void;
  isActive?: boolean;
  isCurrency?: boolean;
}> = ({ label, value, icon, accent, sub, onClick, isActive, isCurrency }) => (
  <div
    className={`stat-card stat-card--${accent} ${isActive ? 'stat-card--active' : ''}`}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    <div className="stat-card__icon">{icon}</div>
    <div className="stat-card__body">
      <span className="stat-card__value">
        {isCurrency ? `₹${value.toLocaleString('en-IN')}` : value.toLocaleString()}
      </span>
      <span className="stat-card__label">{label}</span>
      {sub && <span className="stat-card__sub">{sub}</span>}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({
  stats, onFilterChange, activeFilter, onRestock,
}) => {
  const [showLowStock, setShowLowStock] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [showValueBreakdown, setShowValueBreakdown] = useState(false);

  const supplierEntries = Object.entries(stats.supplierCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="dashboard-section">
      <div className="dashboard">
        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          icon={<Package size={22} />}
          accent="gold"
          onClick={() => onFilterChange?.(activeFilter === 'all' ? null : 'all')}
          isActive={activeFilter === 'all'}
        />
        <StatCard
          label="Total Stock"
          value={stats.totalStock}
          icon={<Layers size={22} />}
          accent="teal"
          sub="units across all items"
        />
        <StatCard
          label="Inventory Cost"
          value={stats.totalCostValue}
          icon={<Wallet size={22} />}
          accent="amber"
          sub="cost price of all stock"
          isCurrency
          onClick={() => setShowValueBreakdown((v) => !v)}
        />
        <StatCard
          label="Inventory Value"
          value={stats.totalSellingValue}
          icon={<DollarSign size={22} />}
          accent="gold"
          sub="selling price of all stock"
          isCurrency
          onClick={() => setShowValueBreakdown((v) => !v)}
        />
        <StatCard
          label="Profit Earned"
          value={stats.profitEarned}
          icon={<TrendingUp size={22} />}
          accent="teal"
          sub="actual profit from sales"
          isCurrency
        />
        <StatCard
          label={`Low Stock (${stats.lowStockCount})`}
          value={stats.lowStockCount}
          icon={<AlertTriangle size={22} />}
          accent="amber"
          sub="items with ≤ 2 units"
          onClick={() => {
            const next = activeFilter === 'low' ? null : 'low';
            setShowLowStock(next === 'low');
            onFilterChange?.(next);
          }}
          isActive={activeFilter === 'low'}
        />
        <StatCard
          label={`Out of Stock (${stats.outOfStockCount})`}
          value={stats.outOfStockCount}
          icon={<TrendingDown size={22} />}
          accent="red"
          sub="items need restocking"
          onClick={() => {
            const next = activeFilter === 'out' ? null : 'out';
            setShowOutOfStock(next === 'out');
            onFilterChange?.(next);
          }}
          isActive={activeFilter === 'out'}
        />
        <StatCard
          label="Today's Sales"
          value={stats.todaysSales}
          icon={<BarChart3 size={22} />}
          accent="gold"
          sub={`this month: ₹${stats.monthlyRevenue.toLocaleString('en-IN')}`}
          isCurrency
        />
      </div>

      {showValueBreakdown && (
        <div className="dashboard-panel">
          <h3 className="dashboard-panel__title">Stock Value Breakdown</h3>
          <div className="value-breakdown">
            <div className="value-breakdown__item">
              <span>Cost Value</span>
              <strong>₹{stats.totalCostValue.toLocaleString('en-IN')}</strong>
            </div>
            <div className="value-breakdown__item">
              <span>Selling Value</span>
              <strong>₹{stats.totalSellingValue.toLocaleString('en-IN')}</strong>
            </div>
            <div className="value-breakdown__item value-breakdown__item--profit">
              <span>Expected Profit</span>
              <strong>₹{stats.expectedProfit.toLocaleString('en-IN')}</strong>
              <span className="value-breakdown__margin">
                {stats.profitMarginPercent}% margin on selling value
              </span>
            </div>
          </div>
          <p className="value-breakdown__note">
            Formula: (Selling Price − Cost) × Qty per product. Total profit = Inventory Value − Inventory Cost.
          </p>
        </div>
      )}

      {showLowStock && stats.lowStockProducts.length > 0 && (
        <div className="dashboard-panel">
          <h3 className="dashboard-panel__title">Low Stock Items</h3>
          <ul className="alert-list">
            {stats.lowStockProducts.map((p) => (
              <li key={p.id} className="alert-list__item">
                <span className="alert-list__code">{p.code}</span>
                <span className="alert-list__name">{p.name}</span>
                <span className="alert-list__qty">Qty {p.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showOutOfStock && stats.outOfStockProducts.length > 0 && (
        <div className="dashboard-panel">
          <h3 className="dashboard-panel__title">Out of Stock Items</h3>
          <ul className="alert-list">
            {stats.outOfStockProducts.map((p) => (
              <li key={p.id} className="alert-list__item">
                <span className="alert-list__code">{p.code}</span>
                <span className="alert-list__name">{p.name}</span>
                <button className="btn-restock" onClick={() => onRestock?.(p.id)}>
                  <Plus size={12} /> Restock
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {supplierEntries.length > 0 && (
        <div className="dashboard-panel dashboard-panel--collapsible">
          <button className="dashboard-panel__toggle" onClick={() => setShowSuppliers((v) => !v)}>
            <h3 className="dashboard-panel__title">Products by Supplier</h3>
            {showSuppliers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showSuppliers && (
            <div className="supplier-grid">
              {supplierEntries.map(([name, count]) => (
                <div key={name} className="supplier-item">
                  <span className="supplier-item__name">{name}</span>
                  <span className="supplier-item__count">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
