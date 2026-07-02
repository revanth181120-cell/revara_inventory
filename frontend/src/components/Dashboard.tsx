import React, { useState } from 'react';
import {
  Package, Layers, AlertTriangle, TrendingDown, TrendingUp,
  DollarSign, Wallet, BarChart3, ChevronDown, ChevronUp, Plus, CheckCircle2, MinusCircle,
} from 'lucide-react';
import { Product } from '../types/Product';

interface DashboardProps {
  stats: {
    totalProducts: number;
    totalStock: number;
    lowStockCount: number;
    mediumStockCount: number;
    healthyStockCount: number;
    outOfStockCount: number;
    totalCostValue: number;
    totalSellingValue: number;
    expectedProfit: number;
    profitMarginPercent: number;
    profitEarned: number;
    todaysSales: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    supplierCounts: Record<string, number>;
    supplierValues: Record<string, number>;
    categoryCounts: Record<string, number>;
    topSellingCategories: Record<string, number>;
    lowStockProducts: Product[];
    mediumStockProducts: Product[];
    outOfStockProducts: Product[];
  };
  onFilterChange?: (filter: 'all' | 'low' | 'medium' | 'out' | 'healthy' | null) => void;
  activeFilter?: 'all' | 'low' | 'medium' | 'out' | 'healthy' | null;
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
  const [showCategories, setShowCategories] = useState(false);
  const [showTopSelling, setShowTopSelling] = useState(false);
  const [showValueBreakdown, setShowValueBreakdown] = useState(false);

  const supplierEntries = Object.entries(stats.supplierCounts)
    .map(([name, count]) => ({
      name,
      count,
      value: stats.supplierValues[name] ?? 0,
    }))
    .sort((a, b) => b.value - a.value);

  const categoryEntries = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]);
  const topSellingEntries = Object.entries(stats.topSellingCategories).sort((a, b) => b[1] - a[1]);

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
          label="Potential Profit"
          value={stats.expectedProfit}
          icon={<TrendingUp size={22} />}
          accent="teal"
          sub="inventory value − inventory cost"
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
          label="Out of Stock"
          value={stats.outOfStockCount}
          icon={<TrendingDown size={22} />}
          accent="red"
          sub="qty = 0"
          onClick={() => {
            const next = activeFilter === 'out' ? null : 'out';
            setShowOutOfStock(next === 'out');
            onFilterChange?.(next);
          }}
          isActive={activeFilter === 'out'}
        />
        <StatCard
          label="Low Stock"
          value={stats.lowStockCount}
          icon={<AlertTriangle size={22} />}
          accent="amber"
          sub="qty = 1"
          onClick={() => {
            const next = activeFilter === 'low' ? null : 'low';
            setShowLowStock(next === 'low');
            onFilterChange?.(next);
          }}
          isActive={activeFilter === 'low'}
        />
        <StatCard
          label="Medium Stock"
          value={stats.mediumStockCount}
          icon={<MinusCircle size={22} />}
          accent="amber"
          sub="qty 2–5"
          onClick={() => onFilterChange?.(activeFilter === 'medium' ? null : 'medium')}
          isActive={activeFilter === 'medium'}
        />
        <StatCard
          label="Healthy Stock"
          value={stats.healthyStockCount}
          icon={<CheckCircle2 size={22} />}
          accent="teal"
          sub="qty 6+"
          onClick={() => onFilterChange?.(activeFilter === 'healthy' ? null : 'healthy')}
          isActive={activeFilter === 'healthy'}
        />
        <StatCard
          label="Today's Sales"
          value={stats.todaysSales}
          icon={<BarChart3 size={22} />}
          accent="gold"
          sub={`week: ₹${stats.weeklyRevenue.toLocaleString('en-IN')} · month: ₹${stats.monthlyRevenue.toLocaleString('en-IN')}`}
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
              <span>Potential Profit</span>
              <strong>₹{stats.expectedProfit.toLocaleString('en-IN')}</strong>
              <span className="value-breakdown__margin">
                {stats.profitMarginPercent}% margin on selling value
              </span>
            </div>
          </div>
          <p className="value-breakdown__note">
            Potential Profit = Inventory Value − Inventory Cost = (Selling Price − Cost) × Qty per product.
          </p>
        </div>
      )}

      {showLowStock && stats.lowStockProducts.length > 0 && (
        <div className="dashboard-panel">
          <h3 className="dashboard-panel__title">Low Stock Items (qty = 1)</h3>
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

      {topSellingEntries.length > 0 && (
        <div className="dashboard-panel dashboard-panel--collapsible">
          <button className="dashboard-panel__toggle" onClick={() => setShowTopSelling((v) => !v)}>
            <h3 className="dashboard-panel__title">Top Selling Categories</h3>
            {showTopSelling ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showTopSelling && (
            <div className="category-grid">
              {topSellingEntries.map(([name, count]) => (
                <div key={name} className="category-item">
                  <span className="category-item__name">{name}</span>
                  <span className="category-item__count">{count} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {categoryEntries.length > 0 && (
        <div className="dashboard-panel dashboard-panel--collapsible">
          <button className="dashboard-panel__toggle" onClick={() => setShowCategories((v) => !v)}>
            <h3 className="dashboard-panel__title">Products by Category</h3>
            {showCategories ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showCategories && (
            <div className="category-grid">
              {categoryEntries.map(([name, count]) => (
                <div key={name} className="category-item">
                  <span className="category-item__name">{name}</span>
                  <span className="category-item__count">{count}</span>
                </div>
              ))}
            </div>
          )}
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
              {supplierEntries.map(({ name, count, value }) => (
                <div key={name} className="supplier-item">
                  <div className="supplier-item__info">
                    <span className="supplier-item__name">{name}</span>
                    <span className="supplier-item__value">₹{value.toLocaleString('en-IN')}</span>
                  </div>
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
