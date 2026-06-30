import React, { useState, useCallback } from 'react';
import { useInventory } from './hooks/useInventory';
import { useHardwareScanner, normalizeScannedCode } from './hooks/useHardwareScanner';
import { Dashboard } from './components/Dashboard';
import { ProductForm } from './components/ProductForm';
import { ProductTable } from './components/ProductTable';
import { BarcodeScanner } from './components/BarcodeScanner';
import { QuickSellPanel, LastScanResult } from './components/QuickSellPanel';
import { SalesHistory } from './components/SalesHistory';
import { BarcodePrint } from './pages/BarcodePrint';
import BarcodePrintPage from './pages/BarcodePrintPage';
import { Product, ProductFormData } from './types/Product';
import ImportExcel from './components/ImportExcel';
import { ExportInventory } from './components/ExportInventory';
import { Plus, ScanLine, TrendingUp, Gem, Tag } from 'lucide-react';
import './App.css';

type Modal = 'add' | 'edit' | 'scanner' | 'sales' | 'print' | 'print-all' | null;
type Filter = 'all' | 'low' | 'out' | null;

function App() {
  const {
    products, sales, stats, apiConnected,
    addProduct, addProductsBatch, editProduct, deleteProduct,
    restockProduct, sellProduct, sellProductByCode, getProductByCode,
    markLabelsPrinted, exportToExcel, exportToJson, exportSalesToExcel,
  } = useInventory();

  const [modal, setModal] = useState<Modal>(null);
  const [filter, setFilter] = useState<Filter>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [printTarget, setPrintTarget] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [quickSellActive, setQuickSellActive] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<LastScanResult | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const processBarcodeScan = useCallback((rawCode: string) => {
    const code = normalizeScannedCode(rawCode);
    if (!code) return;

    const now = Date.now();

    const result = sellProductByCode(code, 1);
    if (result.success && result.product) {
      const msg = `Sold: ${result.product.name} (${code}) — stock ${result.previousQty} → ${result.product.quantity}`;
      setLastScanResult({
        code,
        success: true,
        message: msg,
        product: result.product,
        previousQty: result.previousQty,
        at: now,
      });
      showToast(msg);
    } else {
      const msg = result.error || `No product found for "${code}"`;
      setLastScanResult({ code, success: false, message: msg, at: now });
      showToast(msg, 'error');
    }
  }, [sellProductByCode]);

  const hardwareScannerEnabled =
    quickSellActive && modal !== 'add' && modal !== 'edit' && modal !== 'scanner';

  useHardwareScanner({
    enabled: hardwareScannerEnabled,
    onScan: processBarcodeScan,
  });

  const openEdit = (product: Product) => {
    setEditTarget(product);
    setModal('edit');
  };

  const openPrint = (product: Product) => {
    setPrintTarget(product);
    setModal('print');
  };

  const handleSell = (id: string) => {
    const result = sellProduct(id);
    if (result.success) showToast('Sold 1 unit successfully.');
    else showToast(result.error || 'Sale failed.', 'error');
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    showToast('Product deleted.');
  };

  const handleRestock = (id: string) => {
    restockProduct(id, 1);
    showToast('Restocked +1 unit.');
  };

  const handleAddSubmit = (data: ProductFormData) => {
    const result = addProduct(data);
    if (result.success) showToast('Product added successfully.');
    return result;
  };

  const handleImportProducts = (importedProducts: ProductFormData[]) => {
    const { successCount, errorCount } = addProductsBatch(importedProducts);
    if (successCount > 0) showToast(`Imported ${successCount} products successfully.`);
    if (errorCount > 0) showToast(`Skipped ${errorCount} duplicate or invalid rows.`, 'error');
  };

  const handleEditSubmit = (data: ProductFormData) => {
    if (!editTarget) return { success: false, error: 'No product selected.' };
    const result = editProduct(editTarget.id, data);
    if (result.success) showToast('Product updated.');
    return result;
  };

  const closeModal = () => {
    setModal(null);
    setEditTarget(null);
    setPrintTarget(null);
  };

  const handleFilterChange = (newFilter: Filter) => {
    setFilter((prev) => (prev === newFilter ? null : newFilter));
  };

  const filteredProducts =
    filter === 'low'
      ? products.filter((p) => p.quantity > 0 && p.quantity <= 2)
      : filter === 'out'
      ? products.filter((p) => p.quantity === 0)
      : products;

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <Gem size={22} className="header__gem" />
          <div>
            <h1 className="header__title">Revara Inventory</h1>
            <p className="header__sub">Fashion Jewellery Management</p>
          </div>
        </div>
        <div className="header__actions">
          <span className={`storage-badge ${apiConnected ? 'storage-badge--db' : 'storage-badge--local'}`}>
            {apiConnected ? 'SQLite' : 'Local'}
          </span>
          <ExportInventory onExportExcel={exportToExcel} onExportJson={exportToJson} onExportSales={exportSalesToExcel} />
          <ImportExcel onImport={handleImportProducts} />
          <button className="btn btn--outline" onClick={() => setModal('print-all')}>
            <Tag size={15} /> Print Labels
          </button>
          <button className="btn btn--outline" onClick={() => setModal('sales')}>
            <TrendingUp size={15} /> Sales
          </button>
          <button
            className={`btn btn--outline ${quickSellActive ? 'btn--active' : ''}`}
            onClick={() => setQuickSellActive((v) => !v)}
          >
            <ScanLine size={15} /> {quickSellActive ? 'Quick Sell ON' : 'Quick Sell'}
          </button>
          <button className="btn btn--primary" onClick={() => setModal('add')}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </header>

      <main className="main">
        <Dashboard
          stats={stats}
          onFilterChange={handleFilterChange}
          activeFilter={filter}
          onRestock={handleRestock}
        />
        <ProductTable
          products={filteredProducts}
          activeFilter={filter}
          onClearFilter={() => setFilter(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onSell={handleSell}
          onPrint={openPrint}
          onRestock={handleRestock}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
        />
      </main>

      {quickSellActive && (
        <QuickSellPanel
          lastResult={lastScanResult}
          onOpenCamera={() => setModal('scanner')}
          onClose={() => setQuickSellActive(false)}
        />
      )}

      {modal === 'add' && (
        <ProductForm onSubmit={handleAddSubmit} onClose={closeModal} />
      )}
      {modal === 'edit' && editTarget && (
        <ProductForm onSubmit={handleEditSubmit} onClose={closeModal} editProduct={editTarget} />
      )}
      {modal === 'scanner' && (
        <BarcodeScanner
          onClose={closeModal}
          onScanSell={sellProductByCode}
          getProductByCode={getProductByCode}
          autoSell
        />
      )}
      {modal === 'sales' && (
        <SalesHistory sales={sales} stats={stats} onClose={closeModal} />
      )}
      {modal === 'print' && printTarget && (
        <BarcodePrint product={printTarget} onClose={closeModal} />
      )}
      {modal === 'print-all' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--full modal--print-labels" onClick={(e) => e.stopPropagation()}>
            <BarcodePrintPage
              products={products}
              onClose={closeModal}
              onMarkPrinted={markLabelsPrinted}
            />
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default App;
