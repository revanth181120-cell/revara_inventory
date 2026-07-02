import React, { useState } from 'react';
import { CartItem, CATEGORY_OPTIONS, itemHasStoreOffer, cartLineProfit } from '../types/Product';
import { ShoppingCart, X, Minus, Plus, Trash2, Search, PackagePlus, ChevronDown, ChevronUp } from 'lucide-react';

interface SalesCartProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  estimatedProfit: number;
  billDiscount: number;
  itemCount: number;
  stallMode?: boolean;
  fullscreen?: boolean;
  onClose: () => void;
  onSetBillDiscount: (value: number) => void;
  onUpdateQuantity: (cartLineId: string, quantity: number) => void;
  onRemoveItem: (cartLineId: string) => void;
  onCompleteSale: () => void;
  onSearchAdd?: (code: string) => void;
  onAddCustomItem: (input: {
    name: string;
    unitPrice: number;
    costPrice?: number;
    quantity?: number;
    category?: string;
  }) => { success: boolean; error?: string };
}

const MISC_CATEGORIES = CATEGORY_OPTIONS.filter((c) => c !== 'All');

export const SalesCart: React.FC<SalesCartProps> = ({
  items,
  subtotal,
  discount,
  total,
  estimatedProfit,
  billDiscount,
  itemCount,
  stallMode,
  fullscreen,
  onClose,
  onSetBillDiscount,
  onUpdateQuantity,
  onRemoveItem,
  onCompleteSale,
  onSearchAdd,
  onAddCustomItem,
}) => {
  const [searchCode, setSearchCode] = useState('');
  const [showMiscForm, setShowMiscForm] = useState(false);
  const [miscName, setMiscName] = useState('');
  const [miscPrice, setMiscPrice] = useState('');
  const [miscCost, setMiscCost] = useState('');
  const [miscQty, setMiscQty] = useState('1');
  const [miscCategory, setMiscCategory] = useState('Misc');
  const [miscError, setMiscError] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = searchCode.trim();
    if (!code || !onSearchAdd) return;
    onSearchAdd(code);
    setSearchCode('');
  };

  const handleAddMisc = (e: React.FormEvent) => {
    e.preventDefault();
    setMiscError('');
    const result = onAddCustomItem({
      name: miscName,
      unitPrice: parseFloat(miscPrice) || 0,
      costPrice: parseFloat(miscCost) || 0,
      quantity: parseInt(miscQty, 10) || 1,
      category: miscCategory,
    });
    if (result.success) {
      setMiscName('');
      setMiscPrice('');
      setMiscCost('');
      setMiscQty('1');
      setShowMiscForm(false);
    } else {
      setMiscError(result.error || 'Could not add item.');
    }
  };

  return (
    <div className={`sales-cart ${stallMode ? 'sales-cart--stall' : ''} ${fullscreen ? 'sales-cart--fullscreen' : ''}`}>
      <div className="sales-cart__header">
        <div className="sales-cart__title-row">
          <ShoppingCart size={18} />
          <h2>{stallMode ? 'Stall Mode' : 'Sales Cart'}</h2>
          {itemCount > 0 && <span className="sales-cart__badge">{itemCount}</span>}
        </div>
        <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="sales-cart__scroll">
        {onSearchAdd && (
          <form className="sales-cart__search" onSubmit={handleSearchSubmit}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search product code to add…"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              autoFocus={stallMode}
            />
            <button type="submit" className="btn btn--outline-dark btn--sm">Add</button>
          </form>
        )}

        <div className="sales-cart__misc">
          <button
            type="button"
            className="sales-cart__misc-toggle"
            onClick={() => setShowMiscForm((v) => !v)}
          >
            <PackagePlus size={16} />
            <span>Add misc item (not in inventory)</span>
            {showMiscForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showMiscForm && (
            <form className="sales-cart__misc-form" onSubmit={handleAddMisc}>
              <label className="sales-cart__misc-label" htmlFor="misc-name">Item name</label>
              <input
                id="misc-name"
                type="text"
                placeholder="e.g. Gift wrap, bag, service fee"
                value={miscName}
                onChange={(e) => setMiscName(e.target.value)}
                required
              />
              <div className="sales-cart__misc-row">
                <div className="sales-cart__misc-field">
                  <label className="sales-cart__misc-label" htmlFor="misc-price">Sell price (₹)</label>
                  <input
                    id="misc-price"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="1"
                    value={miscPrice}
                    onChange={(e) => setMiscPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="sales-cart__misc-field">
                  <label className="sales-cart__misc-label" htmlFor="misc-cost">Cost (₹)</label>
                  <input
                    id="misc-cost"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="1"
                    value={miscCost}
                    onChange={(e) => setMiscCost(e.target.value)}
                  />
                </div>
                <div className="sales-cart__misc-field">
                  <label className="sales-cart__misc-label" htmlFor="misc-qty">Qty</label>
                  <input
                    id="misc-qty"
                    type="number"
                    placeholder="1"
                    min="1"
                    value={miscQty}
                    onChange={(e) => setMiscQty(e.target.value)}
                  />
                </div>
              </div>
              <label className="sales-cart__misc-label" htmlFor="misc-category">Category</label>
              <select id="misc-category" value={miscCategory} onChange={(e) => setMiscCategory(e.target.value)}>
                {MISC_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {miscError && <p className="form-error">{miscError}</p>}
              <button type="submit" className="btn btn--primary btn--sm btn--block">
                Add to cart
              </button>
            </form>
          )}
        </div>

        {items.length === 0 ? (
          <div className="sales-cart__empty">
            <ShoppingCart size={32} strokeWidth={1.2} />
            <p>Cart is empty</p>
            <span>Add from inventory or use misc item for small extras</span>
          </div>
        ) : (
          <>
            <div className="sales-cart__items-head">
              <h3>Cart items</h3>
              <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
            </div>

            <ul className="sales-cart__items">
              {items.map((item) => (
                <li key={item.cartLineId} className={`sales-cart__item ${item.isCustom ? 'sales-cart__item--custom' : ''}`}>
                  <div className="sales-cart__item-main">
                    <div className="sales-cart__item-info">
                      <span className="sales-cart__item-code">
                        {item.isCustom ? 'MISC' : item.productCode}
                        {item.isCustom && <span className="sale-bill-tag">Not in stock</span>}
                      </span>
                      <span className="sales-cart__item-name">{item.productName}</span>
                      <span className="sales-cart__item-price">
                        {!item.isCustom ? (
                          <>
                            MRP ₹{item.mrp.toLocaleString('en-IN')}
                            {itemHasStoreOffer(item) && (
                              <span className="sales-cart__item-offer">
                                {' · '}Offer ₹{item.offerPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </>
                        ) : (
                          <>₹{item.unitPrice.toLocaleString('en-IN')} each</>
                        )}
                      </span>
                      <span className="sales-cart__item-profit">
                        Profit ₹{cartLineProfit(item).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="sales-cart__item-controls">
                      <div className="qty-stepper">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartLineId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartLineId, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <strong className="sales-cart__line-total">
                        ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="sales-cart__remove"
                    onClick={() => onRemoveItem(item.cartLineId)}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="sales-cart__summary bill-breakdown">
              <h3 className="bill-breakdown__title">Bill Breakdown</h3>

              <div className="bill-breakdown__row">
                <span>Cart Total</span>
                <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
              </div>

              <div className="bill-breakdown__discount">
                <label htmlFor="bill-discount">Overall discount (₹)</label>
                <div className="bill-breakdown__discount-inputs">
                  <input
                    id="bill-discount"
                    type="number"
                    min="0"
                    max={subtotal}
                    step="1"
                    value={billDiscount || ''}
                    onChange={(e) => onSetBillDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <div className="bill-breakdown__quick">
                    {[5, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => onSetBillDiscount(Math.round(subtotal * pct / 100))}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bill-breakdown__row bill-breakdown__row--minus">
                <span>− Overall Discount</span>
                <span>₹{discount.toLocaleString('en-IN')}</span>
              </div>

              <div className="bill-breakdown__formula">
                Cart Total − Overall Discount = Bill Total
              </div>

              <div className="bill-breakdown__row bill-breakdown__row--bill-total">
                <span>Bill Total</span>
                <strong>₹{total.toLocaleString('en-IN')}</strong>
              </div>

              <div className="bill-breakdown__row bill-breakdown__row--profit">
                <span>Estimated Profit</span>
                <strong>₹{Math.round(estimatedProfit).toLocaleString('en-IN')}</strong>
              </div>
              <p className="bill-breakdown__profit-hint">
                Offer/sell price − cost per item; overall discount applied at bill total
              </p>
            </div>
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="sales-cart__footer">
          <button type="button" className="btn btn--primary btn--block" onClick={onCompleteSale}>
            Complete Sale — ₹{total.toLocaleString('en-IN')}
          </button>
        </div>
      )}
    </div>
  );
};
