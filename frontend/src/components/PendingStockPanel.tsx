import React from 'react';
import { PendingStockItem, ProductFormData } from '../types/Product';
import { PackagePlus, X, Plus, Trash2 } from 'lucide-react';

interface PendingStockPanelProps {
  items: PendingStockItem[];
  onAddToInventory: (item: PendingStockItem) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

export const PendingStockPanel: React.FC<PendingStockPanelProps> = ({
  items, onAddToInventory, onDismiss, onClose,
}) => {
  const pending = items.filter((p) => !p.resolved);
  const resolved = items.filter((p) => p.resolved);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title-row">
            <PackagePlus size={18} />
            <h2 className="modal__title">Pending Stock — End of Day</h2>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <p className="pending-stock-intro">
          Misc items sold from cart that are not in inventory yet. Add them to your product list
          so stock is tracked from tomorrow.
        </p>

        {pending.length === 0 ? (
          <div className="empty-state">
            {items.length === 0
              ? 'No pending items — all sales are from inventory.'
              : 'All misc items have been added to inventory.'}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th className="th-num">Sold</th>
                  <th className="th-num">Price</th>
                  <th className="th-num">Cost</th>
                  <th>Sold at</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.category}</td>
                    <td className="td-num">{item.quantitySold}</td>
                    <td className="td-num">₹{item.sellingPrice.toLocaleString('en-IN')}</td>
                    <td className="td-num">₹{item.costPrice.toLocaleString('en-IN')}</td>
                    <td>{formatDate(item.saleDateTime)}</td>
                    <td className="td-actions">
                      <div className="sale-revert-actions">
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => onAddToInventory(item)}
                        >
                          <Plus size={13} /> Add to inventory
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon--danger"
                          title="Dismiss — won't track in inventory"
                          onClick={() => onDismiss(item.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resolved.length > 0 && (
          <div className="pending-stock-resolved">
            <h4>Added to inventory ({resolved.length})</h4>
            <ul>
              {resolved.slice(0, 10).map((item) => (
                <li key={item.id}>{item.name} — {item.quantitySold} sold</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export function pendingToProductForm(item: PendingStockItem): ProductFormData {
  return {
    code: '',
    name: item.name,
    category: item.category,
    supplier: 'Unknown',
    quantity: 0,
    sellingPrice: item.sellingPrice,
    offerPrice: 0,
    costPrice: item.costPrice,
  };
}
