import React, { useState, useCallback, useRef } from 'react';
import { useInventory } from './hooks/useInventory';
import { useCart } from './hooks/useCart';
import { useHardwareScanner, normalizeScannedCode } from './hooks/useHardwareScanner';
import { Dashboard } from './components/Dashboard';
import { ProductForm } from './components/ProductForm';
import { ProductTable } from './components/ProductTable';
import { BarcodeScanner } from './components/BarcodeScanner';
import { QuickSellPanel, LastScanResult } from './components/QuickSellPanel';
import { SalesHistory } from './components/SalesHistory';
import { SalesCart } from './components/SalesCart';
import { InvoicePrint } from './components/InvoicePrint';
import { ProductDetails } from './components/ProductDetails';
import { BarcodePrint } from './pages/BarcodePrint';
import BarcodePrintPage from './pages/BarcodePrintPage';
import { PendingStockPanel, pendingToProductForm } from './components/PendingStockPanel';
import { Product, ProductFormData, CompletedTransaction, PendingStockItem } from './types/Product';
import ImportExcel from './components/ImportExcel';
import { ExportInventory } from './components/ExportInventory';
import { Plus, ScanLine, TrendingUp, Gem, Tag, ShoppingCart, PackagePlus } from 'lucide-react';
import { isLowStock, isOutOfStock, isHealthyStock, isMediumStock } from './utils/stockTiers';
import './App.css';

type Modal = 'add' | 'edit' | 'scanner' | 'sales' | 'print' | 'print-all' | 'pending-stock' | null;
type Filter = 'all' | 'low' | 'medium' | 'out' | 'healthy' | null;

function App() {
  const {
    products, sales, pendingStock, stats, apiConnected,
    addProduct, addProductsBatch, editProduct, deleteProduct,
    restockProduct, completeCartSale, revertSale, revertTransaction,
    resolvePendingStock, dismissPendingStock,
    getProductByCode, getProductById,
    markLabelsPrinted, exportToExcel, exportToJson, exportSalesToExcel,
  } = useInventory();

  const cart = useCart(getProductById);

  const [modal, setModal] = useState<Modal>(null);
  const [filter, setFilter] = useState<Filter>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [printTarget, setPrintTarget] = useState<Product | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [lastTransaction, setLastTransaction] = useState<CompletedTransaction | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [stallMode, setStallMode] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [pendingTarget, setPendingTarget] = useState<PendingStockItem | null>(null);
  const [productPrefill, setProductPrefill] = useState<ProductFormData | null>(null);
  const [lastScanResult, setLastScanResult] = useState<LastScanResult | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addToCart = useCallback((product: Product, quantity = 1) => {
    const result = cart.addProduct(product, quantity);
    if (result.success) {
      setCartOpen(true);
      showToast(`Added ${product.code} to cart.`);
    } else {
      showToast(result.error || 'Could not add to cart.', 'error');
    }
    return result;
  }, [cart]);

  const addToCartByCode = useCallback((code: string) => {
    const product = getProductByCode(code);
    if (!product) {
      showToast(`No product found for "${code}"`, 'error');
      return { success: false, error: 'Not found' };
    }
    const result = addToCart(product, 1);
    return result;
  }, [getProductByCode, addToCart]);

  const processBarcodeScan = useCallback((rawCode: string) => {
    const code = normalizeScannedCode(rawCode);
    if (!code) return;

    const now = Date.now();
    if (lastScanRef.current?.code === code && now - lastScanRef.current.at < 1500) return;
    lastScanRef.current = { code, at: now };

    const product = getProductByCode(code);
    if (!product) {
      const msg = `No product found for "${code}"`;
      setLastScanResult({ code, success: false, message: msg, at: now });
      showToast(msg, 'error');
      return;
    }

    if (stallMode) {
      const result = cart.addProduct(product, 1);
      if (result.success) {
        setCartOpen(true);
        const msg = `Added to cart: ${product.name} (${code})`;
        setLastScanResult({ code, success: true, message: msg, product, at: now });
        showToast(msg);
      } else {
        setLastScanResult({ code, success: false, message: result.error || 'Failed', at: now });
        showToast(result.error || 'Failed', 'error');
      }
      return;
    }

    addToCart(product, 1);
    setLastScanResult({
      code,
      success: true,
      message: `Added to cart: ${product.name} (${code})`,
      product,
      at: now,
    });
  }, [getProductByCode, stallMode, cart, addToCart]);

  const hardwareScannerEnabled =
    stallMode && modal !== 'add' && modal !== 'edit' && modal !== 'scanner';

  useHardwareScanner({
    enabled: hardwareScannerEnabled,
    onScan: processBarcodeScan,
  });

  const openEdit = (product: Product) => {
    setDetailsProduct(null);
    setEditTarget(product);
    setModal('edit');
  };

  const openPrint = (product: Product) => {
    setPrintTarget(product);
    setModal('print');
  };

  const openDetails = (product: Product) => {
    setDetailsProduct(product);
  };

  const handleAddToCart = (id: string) => {
    const product = getProductById(id);
    if (product) addToCart(product, 1);
  };

  const handleCompleteSale = () => {
    const cartItems = [...cart.items];
    const discount = cart.billDiscount;
    const result = completeCartSale(cartItems, discount);
    if (!result.success || !result.transaction) {
      showToast(result.error || 'Sale failed.', 'error');
      return;
    }
    cart.clearCart();
    setLastTransaction(result.transaction);
    setCartOpen(false);
    const miscCount = result.transaction.items.filter((i) => i.isCustom).length;
    let msg = `Sale complete — ₹${result.transaction.total.toLocaleString('en-IN')} (${result.transaction.items.length} items)`;
    if (miscCount > 0) {
      msg += `. ${miscCount} misc — add to inventory via Pending.`;
    }
    showToast(msg);
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
    const { successCount, errorCount, updatedCount } = addProductsBatch(importedProducts);
    if (successCount > 0) {
      const newCount = successCount - updatedCount;
      const parts: string[] = [];
      if (newCount > 0) parts.push(`${newCount} added`);
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);
      showToast(`Import complete: ${parts.join(', ')}.`);
    }
    if (errorCount > 0) showToast(`Skipped ${errorCount} invalid rows (missing code).`, 'error');
  };

  const handleEditSubmit = (data: ProductFormData) => {
    if (!editTarget) return { success: false, error: 'No product selected.' };
    const result = editProduct(editTarget.id, data);
    if (result.success) showToast('Product updated.');
    return result;
  };

  const pendingCount = pendingStock.filter((p) => !p.resolved).length;

  const closeModal = () => {
    setModal(null);
    setEditTarget(null);
    setPrintTarget(null);
    setPendingTarget(null);
    setProductPrefill(null);
  };

  const openPendingStockAdd = (item: PendingStockItem) => {
    setPendingTarget(item);
    setProductPrefill(pendingToProductForm(item));
    setModal('add');
  };

  const handlePendingAddSubmit = (data: ProductFormData) => {
    const result = addProduct(data);
    if (result.success && pendingTarget) {
      resolvePendingStock(pendingTarget.id);
      showToast(`"${data.name}" added to inventory.`);
      setPendingTarget(null);
      setProductPrefill(null);
    }
    return result;
  };

  const handleFilterChange = (newFilter: Filter) => {
    setFilter((prev) => (prev === newFilter ? null : newFilter));
  };

  const filteredProducts =
    filter === 'low'
      ? products.filter((p) => isLowStock(p.quantity))
      : filter === 'medium'
      ? products.filter((p) => isMediumStock(p.quantity))
      : filter === 'out'
      ? products.filter((p) => isOutOfStock(p.quantity))
      : filter === 'healthy'
      ? products.filter((p) => isHealthyStock(p.quantity))
      : products;

  const toggleStallMode = () => {
    setStallMode((v) => {
      const next = !v;
      if (next) setCartOpen(true);
      return next;
    });
  };

  return (
    <div className={`app ${stallMode ? 'app--stall' : ''}`}>
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
          {pendingCount > 0 && (
            <button className="btn btn--outline btn--pending" onClick={() => setModal('pending-stock')}>
              <PackagePlus size={15} /> Pending ({pendingCount})
            </button>
          )}
          <button
            className={`btn btn--outline ${cartOpen ? 'btn--active' : ''}`}
            onClick={() => setCartOpen((v) => !v)}
          >
            <ShoppingCart size={15} />
            Cart{cart.itemCount > 0 && <span className="header-cart-badge">{cart.itemCount}</span>}
          </button>
          <button
            className={`btn btn--outline ${stallMode ? 'btn--active' : ''}`}
            onClick={toggleStallMode}
          >
            <ScanLine size={15} /> {stallMode ? 'Stall ON' : 'Stall Mode'}
          </button>
          <button className="btn btn--primary" onClick={() => setModal('add')}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </header>

      <div className="app-body">
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
            onAddToCart={handleAddToCart}
            onViewDetails={openDetails}
            onPrint={openPrint}
            onRestock={handleRestock}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
          />
        </main>
      </div>

      {cartOpen && (
        <div className="cart-fullscreen">
          <SalesCart
            items={cart.items}
            subtotal={cart.subtotal}
            discount={cart.discount}
            total={cart.total}
            estimatedProfit={cart.estimatedProfit}
            billDiscount={cart.billDiscount}
            itemCount={cart.itemCount}
            stallMode={stallMode}
            fullscreen
            onClose={() => setCartOpen(false)}
            onSetBillDiscount={cart.setBillDiscount}
            onUpdateQuantity={cart.updateQuantity}
            onRemoveItem={cart.removeItem}
            onCompleteSale={handleCompleteSale}
            onSearchAdd={addToCartByCode}
            onAddCustomItem={cart.addCustomItem}
          />
        </div>
      )}

      {stallMode && (
        <QuickSellPanel
          stallMode
          lastResult={lastScanResult}
          onOpenCamera={() => setModal('scanner')}
          onClose={() => { setStallMode(false); }}
        />
      )}

      {modal === 'add' && (
        <ProductForm
          onSubmit={pendingTarget ? handlePendingAddSubmit : handleAddSubmit}
          onClose={closeModal}
          prefill={productPrefill}
        />
      )}
      {modal === 'edit' && editTarget && (
        <ProductForm onSubmit={handleEditSubmit} onClose={closeModal} editProduct={editTarget} />
      )}
      {modal === 'scanner' && (
        <BarcodeScanner
          onClose={closeModal}
          onScanSell={(code, qty = 1) => {
            const product = getProductByCode(code);
            if (!product) return { success: false, error: `No product found for "${code}".` };
            const result = cart.addProduct(product, qty);
            if (result.success) {
              setCartOpen(true);
              return { success: true, product, previousQty: product.quantity };
            }
            return { success: false, error: result.error };
          }}
          getProductByCode={getProductByCode}
          autoSell={false}
        />
      )}
      {modal === 'sales' && (
        <SalesHistory
          sales={sales}
          stats={stats}
          onRevertSale={(id) => {
            const result = revertSale(id);
            if (result.success) {
              const wasCustom = sales.find((s) => s.id === id)?.isCustom;
              showToast(wasCustom ? 'Misc sale reverted.' : 'Sale reverted — stock restored.');
            }
            return result;
          }}
          onRevertTransaction={(txId) => {
            const result = revertTransaction(txId);
            if (result.success) {
              showToast(`Bill reverted (${result.revertedCount} items) — stock restored.`);
            }
            return result;
          }}
          onClose={closeModal}
        />
      )}
      {modal === 'pending-stock' && (
        <PendingStockPanel
          items={pendingStock}
          onAddToInventory={openPendingStockAdd}
          onDismiss={(id) => {
            dismissPendingStock(id);
            showToast('Removed from pending list.');
          }}
          onClose={closeModal}
        />
      )}
      {detailsProduct && (
        <ProductDetails
          product={detailsProduct}
          sales={sales}
          onClose={() => setDetailsProduct(null)}
          onEdit={openEdit}
          onAddToCart={(p) => addToCart(p, 1)}
        />
      )}
      {lastTransaction && (
        <InvoicePrint
          transaction={lastTransaction}
          onClose={() => setLastTransaction(null)}
        />
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
