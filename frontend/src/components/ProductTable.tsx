import React, { useState, useMemo } from 'react';
import Barcode from 'react-barcode';
import { Product, CATEGORY_OPTIONS, getSalePrice, productUnitProfit } from '../types/Product';
import { getStockLevel } from '../utils/stockTiers';
import { Edit2, Trash2, ShoppingCart, Printer, Search, ChevronUp, ChevronDown, Plus, ImageIcon } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddToCart: (id: string) => void;
  onViewDetails: (product: Product) => void;
  onPrint: (product: Product) => void;
  onRestock?: (id: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
  activeFilter?: 'all' | 'low' | 'medium' | 'out' | 'healthy' | null;
  onClearFilter?: () => void;
}

type SortKey = keyof Pick<Product, 'code' | 'name' | 'quantity' | 'sellingPrice'>;

export const ProductTable: React.FC<ProductTableProps> = ({
  products, onEdit, onDelete, onAddToCart, onViewDetails, onPrint, onRestock,
  categoryFilter = 'All', onCategoryFilterChange,
  activeFilter, onClearFilter,
}) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products
      .filter((p) => {
        if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
        return !q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.supplier?.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [products, search, sortKey, sortDir, categoryFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="sort-icon">
      {sortKey === col
        ? sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
        : <ChevronUp size={13} style={{ opacity: 0.3 }} />}
    </span>
  );

  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="table-section">
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by code, name, or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>×</button>
          )}
        </div>
        <span className="table-count">
          {filtered.length} of {products.length} products
        </span>
        {activeFilter && activeFilter !== 'all' && (
          <button className="filter-clear-btn" onClick={onClearFilter}>
            Clear filter: {{
              low: 'Low Stock',
              medium: 'Medium Stock',
              out: 'Out of Stock',
              healthy: 'Healthy Stock',
            }[activeFilter]} ×
          </button>
        )}
      </div>

      <div className="category-filters">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat}
            className={`category-chip ${categoryFilter === cat ? 'category-chip--active' : ''}`}
            onClick={() => onCategoryFilterChange?.(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {products.length === 0
            ? <>No products yet. Add your first product to get started.</>
            : <>No products match your filters.</>}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Image</th>
                <th className="sortable" onClick={() => toggleSort('code')}>
                  Product Code <SortIcon col="code" />
                </th>
                <th className="sortable" onClick={() => toggleSort('name')}>
                  Product Name <SortIcon col="name" />
                </th>
                <th className="sortable th-num" onClick={() => toggleSort('quantity')}>
                  Qty <SortIcon col="quantity" />
                </th>
                <th className="sortable th-num" onClick={() => toggleSort('sellingPrice')}>
                  MRP <SortIcon col="sellingPrice" />
                </th>
                <th className="th-num">Offer</th>
                <th className="th-num">Cost</th>
                <th className="th-num">Profit</th>
                <th>Barcode</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const stockLevel = getStockLevel(product.quantity);
                const rowClass =
                  stockLevel === 'out' ? 'row--oos'
                  : stockLevel === 'low' ? 'row--low'
                  : stockLevel === 'medium' ? 'row--medium'
                  : '';
                const qtyClass =
                  stockLevel === 'out' ? 'qty-badge--oos'
                  : stockLevel === 'low' ? 'qty-badge--low'
                  : stockLevel === 'medium' ? 'qty-badge--medium'
                  : 'qty-badge--ok';

                return (
                <tr
                  key={product.id}
                  className={rowClass}
                >
                  <td className="td-image">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="product-thumb" />
                    ) : (
                      <div className="product-thumb product-thumb--empty">
                        <ImageIcon size={16} />
                      </div>
                    )}
                  </td>
                  <td>
                    <button type="button" className="product-code product-code--link" onClick={() => onViewDetails(product)}>
                      {product.code}
                    </button>
                  </td>
                  <td>
                    <div className="product-name">{product.name}</div>
                    <div className="product-category">{product.category}</div>
                    {product.supplier && (
                      <div className="product-supplier">{product.supplier}</div>
                    )}
                  </td>
                  <td className="td-num">
                    <span className={`qty-badge ${qtyClass}`}>
                      {product.quantity}
                    </span>
                  </td>
                  <td className="td-num">
                    <span className="price">₹{product.sellingPrice.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="td-num">
                    {product.offerPrice > 0 ? (
                      <span className="offer-price">₹{product.offerPrice.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="td-num">
                    <span className="cost">₹{product.costPrice.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="td-num">
                    <span className="profit" style={{
                      color: product.sellingPrice > product.costPrice ? '#2eb8a0' : '#e05a5a',
                      fontWeight: '600',
                    }}>
                      ₹{(productUnitProfit(product) * product.quantity).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="td-barcode">
                    <div className="barcode-cell">
                      <Barcode
                        value={product.code}
                        width={1}
                        height={32}
                        fontSize={9}
                        margin={0}
                        displayValue={false}
                      />
                    </div>
                  </td>
                  <td className="td-actions">
                    <div className="action-group">
                      <button
                        className="btn-action btn-action--sell"
                        onClick={() => onAddToCart(product.id)}
                        disabled={product.quantity === 0}
                        title="Add to cart"
                      >
                        <ShoppingCart size={14} />
                        <span>Cart</span>
                      </button>
                      {product.quantity === 0 && onRestock && (
                        <button
                          className="btn-action btn-action--restock"
                          onClick={() => onRestock(product.id)}
                          title="Restock +1"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                      <button
                        className="btn-action btn-action--print"
                        onClick={() => onPrint(product)}
                        title="Print barcode"
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        className="btn-action btn-action--edit"
                        onClick={() => onEdit(product)}
                        title="Edit product"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-action btn-action--delete"
                        onClick={() => setDeleteTarget(product)}
                        title="Delete product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Delete Product?</h3>
            <p className="confirm-text">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.code})?
              This cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn btn--ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn--danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
