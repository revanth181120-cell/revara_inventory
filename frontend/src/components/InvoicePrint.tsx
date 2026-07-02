import React, { useRef, useState } from 'react';
import { CompletedTransaction, catalogLineTotal, invoiceLineLabel } from '../types/Product';
import { getSavedWhatsAppPhone, openInvoiceOnWhatsApp } from '../utils/invoiceWhatsApp';
import { Printer, X, MessageCircle } from 'lucide-react';

interface InvoicePrintProps {
  transaction: CompletedTransaction;
  onClose: () => void;
}

export const InvoicePrint: React.FC<InvoicePrintProps> = ({ transaction, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(getSavedWhatsAppPhone);
  const [whatsappError, setWhatsappError] = useState('');

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Revara Invoice</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; max-width: 320px; margin: 0 auto; color: #1a1a2e; }
            h1 { font-size: 18px; text-align: center; margin: 0 0 4px; letter-spacing: 1px; }
            .sub { text-align: center; font-size: 11px; color: #666; margin-bottom: 16px; }
            .meta { font-size: 11px; color: #666; margin-bottom: 16px; text-align: center; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }
            td { padding: 6px 0; border-bottom: 1px dashed #ddd; vertical-align: top; }
            td:last-child { text-align: right; font-weight: 600; white-space: nowrap; }
            .totals { border-top: 2px solid #1a1a2e; padding-top: 8px; }
            .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
            .thanks { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const handleWhatsApp = () => {
    setWhatsappError('');
    const result = openInvoiceOnWhatsApp(phone, transaction);
    if (!result.success) {
      setWhatsappError(result.error || 'Could not open WhatsApp.');
    }
  };

  const dateStr = new Date(transaction.saleDateTime).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--invoice" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Invoice</h2>
          <div className="modal__header-actions">
            <button type="button" className="btn btn--outline btn--sm" onClick={handlePrint}>
              <Printer size={14} /> Print
            </button>
            <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="invoice-preview" ref={printRef}>
          <h1 className="invoice-preview__brand">REVARA FASHIONS</h1>
          <p className="invoice-preview__sub">Fashion Jewellery</p>
          <p className="invoice-preview__meta">{dateStr}</p>

          <table className="invoice-preview__table">
            <tbody>
              {transaction.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="invoice-preview__line-name">{invoiceLineLabel(item)}</span>
                    {!item.isCustom && item.productName && (
                      <span className="invoice-preview__line-sub">{item.productName}</span>
                    )}
                    {item.isCustom ? (
                      <span className="invoice-preview__line-sub">Misc item</span>
                    ) : (
                      <span className="invoice-preview__line-pricing">
                        MRP ₹{item.mrp.toLocaleString('en-IN')}
                        {item.offerPrice > 0 && item.offerPrice < item.mrp && (
                          <>
                            {' · '}
                            <span className="invoice-preview__offer">Offer ₹{item.offerPrice.toLocaleString('en-IN')}</span>
                          </>
                        )}
                      </span>
                    )}
                  </td>
                  <td>₹{catalogLineTotal(item).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-preview__totals">
            <div><span>Cart Total</span><span>₹{transaction.subtotal.toLocaleString('en-IN')}</span></div>
            <div className="invoice-preview__discount">
              <span>− Overall Discount</span><span>₹{transaction.discount.toLocaleString('en-IN')}</span>
            </div>
            <div className="invoice-preview__final">
              <span>Bill Total</span>
              <span>₹{transaction.total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <p className="invoice-preview__thanks">Thank you for shopping with us!</p>
        </div>

        <div className="invoice-whatsapp">
          <label htmlFor="invoice-whatsapp-phone">Send bill on WhatsApp</label>
          <div className="invoice-whatsapp__row">
            <span className="invoice-whatsapp__prefix">+91</span>
            <input
              id="invoice-whatsapp-phone"
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setWhatsappError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleWhatsApp()}
            />
            <button type="button" className="btn btn--whatsapp" onClick={handleWhatsApp}>
              <MessageCircle size={16} /> Send
            </button>
          </div>
          {whatsappError && <p className="form-error">{whatsappError}</p>}
          <p className="form-hint form-hint--inline">
            Opens WhatsApp with a tabular bill — tap Send in WhatsApp. Bill and mobile number are saved to the database when SQLite is connected.
          </p>
        </div>
      </div>
    </div>
  );
};
