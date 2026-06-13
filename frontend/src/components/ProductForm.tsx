import React, { useState, useEffect } from 'react';
import { Product, ProductFormData, CATEGORY_MAP, MATERIAL_MAP, SUPPLIER_MAP, parseSupplierFromCode } from '../types/Product';
import { X, Upload, ImageIcon } from 'lucide-react';

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => { success: boolean; error?: string };
  onClose: () => void;
  editProduct?: Product | null;
}

const CATEGORIES = Object.entries(CATEGORY_MAP);
const MATERIALS = Object.entries(MATERIAL_MAP);
const SUPPLIERS = Object.entries(SUPPLIER_MAP);

const buildCode = (material: string, category: string, seq: string): string => {
  const seqNum = seq.replace(/\D/g, '').padStart(4, '0') || '0001';
  return `RV-${material}-${category}-${seqNum}`;
};

export const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, onClose, editProduct }) => {
  const [material, setMaterial] = useState('GP');
  const [category, setCategory] = useState('ER');
  const [seqNum, setSeqNum] = useState('0001');
  const [manualCode, setManualCode] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    code: buildCode('GP', 'ER', '0001'),
    name: '',
    category: 'Ear Set',
    supplier: 'Gold Prince',
    quantity: 1,
    sellingPrice: 0,
    offerPrice: 0,
    costPrice: 0,
    imageUrl: undefined,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (editProduct) {
      setForm({
        code: editProduct.code,
        name: editProduct.name,
        category: editProduct.category,
        supplier: editProduct.supplier || parseSupplierFromCode(editProduct.code),
        quantity: editProduct.quantity,
        sellingPrice: editProduct.sellingPrice,
        offerPrice: editProduct.offerPrice ?? 0,
        costPrice: editProduct.costPrice,
        imageUrl: editProduct.imageUrl,
      });
      setManualCode(true);
    }
  }, [editProduct]);

  useEffect(() => {
    if (!manualCode) {
      const code = buildCode(material, category, seqNum);
      const catLabel = CATEGORY_MAP[category] || category;
      const supplier = SUPPLIER_MAP[material] || parseSupplierFromCode(code);
      setForm((f) => ({ ...f, code, category: catLabel, supplier }));
    }
  }, [material, category, seqNum, manualCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === 'quantity' || name === 'sellingPrice' || name === 'offerPrice' || name === 'costPrice'
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, imageUrl: reader.result as string }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || !form.name.trim()) {
      setError('Product code and name are required.');
      return;
    }
    const result = onSubmit({
      ...form,
      supplier: form.supplier || parseSupplierFromCode(form.code) || 'Unknown',
    });
    if (!result.success) {
      setError(result.error || 'Failed to save product.');
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          {!editProduct && (
            <div className="form-section">
              <p className="form-section__label">Code Builder</p>
              <div className="form-row form-row--3">
                <div className="form-group">
                  <label>Material / Supplier</label>
                  <select value={material} onChange={(e) => { setMaterial(e.target.value); setManualCode(false); }}>
                    {MATERIALS.map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={category} onChange={(e) => { setCategory(e.target.value); setManualCode(false); }}>
                    {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Sequence #</label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={seqNum}
                    onChange={(e) => { setSeqNum(e.target.value); setManualCode(false); }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-row form-row--2">
            <div className="form-group">
              <label>Product Code *</label>
              <input
                name="code"
                value={form.code}
                onChange={(e) => {
                  setManualCode(true);
                  const code = e.target.value;
                  setForm((f) => ({
                    ...f,
                    code,
                    supplier: parseSupplierFromCode(code) || f.supplier,
                  }));
                }}
                placeholder="RV-GP-ER-0001"
                className="code-input"
                readOnly={!!editProduct}
              />
            </div>
            <div className="form-group">
              <label>Product Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Kundan Jhumka Earrings"
              />
            </div>
          </div>

          <div className="form-row form-row--2">
            <div className="form-group">
              <label>Supplier</label>
              <select name="supplier" value={form.supplier} onChange={handleChange}>
                {SUPPLIERS.map(([k, v]) => <option key={k} value={v}>{v}</option>)}
                {!SUPPLIERS.some(([, v]) => v === form.supplier) && form.supplier && (
                  <option value={form.supplier}>{form.supplier}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select name="category" value={form.category} onChange={handleChange}>
                {Object.values(CATEGORY_MAP).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row form-row--3">
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} min="0" />
            </div>
            <div className="form-group">
              <label>MRP / Selling Price (₹)</label>
              <input type="number" name="sellingPrice" value={form.sellingPrice} onChange={handleChange} min="0" step="0.01" />
            </div>
            <div className="form-group">
              <label>Offer Price (₹)</label>
              <input type="number" name="offerPrice" value={form.offerPrice} onChange={handleChange} min="0" step="0.01" placeholder="Shop selling price" />
            </div>
          </div>

          <div className="form-row form-row--2">
            <div className="form-group">
              <label>Cost Price (₹)</label>
              <input type="number" name="costPrice" value={form.costPrice} onChange={handleChange} min="0" step="0.01" />
            </div>
            {form.offerPrice > 0 && form.sellingPrice > 0 && (
              <div className="form-group">
                <label>Label Preview</label>
                <p className="form-hint">
                  Label: MRP ₹{form.sellingPrice} / Offer ₹{form.offerPrice}
                </p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Product Image</label>
            <div className="image-upload">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Preview" className="image-upload__preview" />
              ) : (
                <div className="image-upload__placeholder">
                  <ImageIcon size={24} />
                  <span>No image</span>
                </div>
              )}
              <label className="btn btn--ghost image-upload__btn">
                <Upload size={14} /> Upload Image
                <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
              </label>
              {form.imageUrl && (
                <button type="button" className="btn btn--ghost" onClick={() => setForm((f) => ({ ...f, imageUrl: undefined }))}>
                  Remove
                </button>
              )}
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary">
              {editProduct ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
