import React from 'react';
import { Product, SaleRecord, getSalePrice, saleLineProfit, saleLineTotal, productUnitProfit } from '../types/Product';
import { X, Edit2, ImageIcon } from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
  sales: SaleRecord[];
  onClose: () => void;
  onEdit: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  sales,
  onClose,
  onEdit,
  onAddToCart,
}) => {
  const productSales = sales
    .filter((s) => s.productCode.toLowerCase() === product.code.toLowerCase())
    .slice(0, 20);

  const totalSold = productSales.reduce((sum, s) => sum + s.quantitySold, 0);
  const totalRevenue = productSales.reduce((sum, s) => sum + saleLineTotal(s), 0);
  const totalProfit = productSales.reduce((sum, s) => sum + saleLineProfit(s), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Product Details</h2>
          <div className="modal__header-actions">
            <button type="button" className="btn btn--outline btn--sm" onClick={() => onEdit(product)}>
              <Edit2 size={14} /> Edit
            </button>
            <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="product-details">
          <div className="product-details__hero">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="product-details__image" />
            ) : (
              <div className="product-details__image product-details__image--empty">
                <ImageIcon size={48} />
                <span>No image — upload via Edit</span>
              </div>
            )}
            <div className="product-details__main">
              <span className="product-code product-code--lg">{product.code}</span>
              <h3 className="product-details__name">{product.name}</h3>
              <div className="product-details__tags">
                {product.category && <span className="tag">{product.category}</span>}
                {product.supplier && <span className="tag tag--gold">{product.supplier}</span>}
              </div>
              <div className="product-details__prices">
                <div><span>MRP</span><strong>₹{product.sellingPrice.toLocaleString('en-IN')}</strong></div>
                <div><span>Offer</span><strong>{product.offerPrice > 0 ? `₹${product.offerPrice.toLocaleString('en-IN')}` : '—'}</strong></div>
                <div><span>Cost</span><strong>₹{product.costPrice.toLocaleString('en-IN')}</strong></div>
                <div><span>Unit Profit</span><strong className="text-profit">₹{productUnitProfit(product).toLocaleString('en-IN')}</strong></div>
              </div>
              <div className="product-details__stock">
                <span className={`qty-badge ${product.quantity === 0 ? 'qty-badge--oos' : product.quantity <= 1 ? 'qty-badge--low' : 'qty-badge--ok'}`}>
                  Stock: {product.quantity}
                </span>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={product.quantity === 0}
                  onClick={() => onAddToCart(product)}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>

          <div className="product-details__sales">
            <h4>Sales History</h4>
            {productSales.length === 0 ? (
              <p className="text-muted">No sales recorded for this product yet.</p>
            ) : (
              <>
                <div className="product-details__sales-summary">
                  <span>{totalSold} units sold</span>
                  <span>₹{totalRevenue.toLocaleString('en-IN')} revenue</span>
                  <span className="text-profit">₹{totalProfit.toLocaleString('en-IN')} profit</span>
                </div>
                <div className="table-wrapper">
                  <table className="inventory-table inventory-table--compact">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="th-num">Qty</th>
                        <th className="th-num">MRP</th>
                        <th className="th-num">Final</th>
                        <th className="th-num">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSales.map((s) => (
                        <tr key={s.id}>
                          <td>{new Date(s.saleDateTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="td-num">{s.quantitySold}</td>
                          <td className="td-num">₹{s.mrp.toLocaleString('en-IN')}</td>
                          <td className="td-num">₹{saleLineTotal(s).toLocaleString('en-IN')}</td>
                          <td className="td-num text-profit">₹{saleLineProfit(s).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
