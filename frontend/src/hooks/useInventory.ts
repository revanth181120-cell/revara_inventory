import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product, SaleRecord, ProductFormData, CartItem, CompletedTransaction, PendingStockItem, parseSupplierFromCode, getSalePrice, normalizeSaleRecord, saleLineProfit, productUnitProfit } from '../types/Product';
import { checkApiHealth, fetchProducts, fetchSales, syncProducts, syncSales } from '../api/inventoryApi';
import { isOutOfStock, isLowStock, isMediumStock, isHealthyStock } from '../utils/stockTiers';

const PRODUCTS_KEY = 'revara_products';
const SALES_KEY = 'revara_sales';
const PENDING_STOCK_KEY = 'revara_pending_stock';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function normalizeProduct(raw: Partial<Product> & { code: string; name: string }): Product {
  const now = new Date().toISOString();
  return {
    id: raw.id || generateId(),
    code: raw.code,
    name: raw.name,
    category: raw.category || '',
    supplier: raw.supplier || parseSupplierFromCode(raw.code) || 'Unknown',
    quantity: raw.quantity ?? 0,
    sellingPrice: raw.sellingPrice ?? 0,
    offerPrice: raw.offerPrice ?? 0,
    costPrice: raw.costPrice ?? 0,
    imageUrl: raw.imageUrl,
    labelPrinted: raw.labelPrinted ?? false,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };
}

function migrateStoredProducts(stored: unknown[]): Product[] {
  return stored.map((item) => normalizeProduct(item as Partial<Product> & { code: string; name: string }));
}

function isSameDay(iso: string, date: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

function isSameMonth(iso: string, date: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
}

function isSameWeek(iso: string, date: Date): boolean {
  const d = new Date(iso);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

export function useInventory() {
  const [apiConnected, setApiConnected] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyForSync = useRef(false);

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      return stored ? migrateStoredProducts(JSON.parse(stored)) : [];
    } catch {
      return [];
    }
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    try {
      const stored = localStorage.getItem(SALES_KEY);
      const parsed: SaleRecord[] = stored ? JSON.parse(stored) : [];
      return parsed.map((s) => normalizeSaleRecord(s));
    } catch {
      return [];
    }
  });

  const [pendingStock, setPendingStock] = useState<PendingStockItem[]>(() => {
    try {
      const stored = localStorage.getItem(PENDING_STOCK_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(PENDING_STOCK_KEY, JSON.stringify(pendingStock));
  }, [pendingStock]);

  // Load from SQLite API on startup, fallback to localStorage
  useEffect(() => {
    (async () => {
      const healthy = await checkApiHealth();
      setApiConnected(healthy);
      if (!healthy) {
        readyForSync.current = true;
        return;
      }

      try {
        const [apiProducts, apiSales] = await Promise.all([fetchProducts(), fetchSales()]);
        if (apiProducts.length > 0 || apiSales.length > 0) {
          setProducts(apiProducts as Product[]);
          setSales((apiSales as SaleRecord[]).map((s) => normalizeSaleRecord(s)));
        } else {
          const localProducts = localStorage.getItem(PRODUCTS_KEY);
          const localSales = localStorage.getItem(SALES_KEY);
          if (localProducts) {
            const parsed = migrateStoredProducts(JSON.parse(localProducts));
            setProducts(parsed);
            await syncProducts(parsed);
          }
          if (localSales) {
            const parsed: SaleRecord[] = JSON.parse(localSales);
            const normalized = parsed.map((s) => normalizeSaleRecord(s));
            setSales(normalized);
            await syncSales(normalized);
          }
        }
      } catch {
        setApiConnected(false);
      } finally {
        readyForSync.current = true;
      }
    })();
  }, []);

  // Debounced sync to SQLite when data changes
  useEffect(() => {
    if (!apiConnected || !readyForSync.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncProducts(products).catch(() => setApiConnected(false));
      syncSales(sales).catch(() => setApiConnected(false));
    }, 800);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [products, sales, apiConnected]);

  const addProduct = useCallback((data: ProductFormData): { success: boolean; error?: string } => {
    let added = false;
    let error = '';

    setProducts((prev) => {
      const duplicate = prev.find((p) => p.code.toLowerCase() === data.code.toLowerCase());
      if (duplicate) {
        error = `Product code "${data.code}" already exists.`;
        return prev;
      }
      const now = new Date().toISOString();
      const newProduct: Product = {
        ...data,
        supplier: data.supplier || parseSupplierFromCode(data.code) || 'Unknown',
        id: generateId(),
        labelPrinted: false,
        createdAt: now,
        updatedAt: now,
      };
      added = true;
      return [...prev, newProduct];
    });

    return added ? { success: true } : { success: false, error };
  }, []);

  const addProductsBatch = useCallback((items: ProductFormData[]): { successCount: number; errorCount: number; updatedCount: number } => {
    let successCount = 0;
    let errorCount = 0;
    let updatedCount = 0;

    setProducts((prev) => {
      const next = [...prev];
      const indexByCode = new Map(next.map((p, i) => [p.code.toLowerCase(), i]));

      for (const data of items) {
        if (!data.code?.trim()) {
          errorCount++;
          continue;
        }
        const key = data.code.toLowerCase();
        const now = new Date().toISOString();
        const existingIdx = indexByCode.get(key);

        if (existingIdx !== undefined) {
          const existing = next[existingIdx];
          next[existingIdx] = {
            ...existing,
            ...data,
            code: data.code.trim(),
            supplier: data.supplier || parseSupplierFromCode(data.code) || existing.supplier,
            updatedAt: now,
          };
          updatedCount++;
        } else {
          next.push({
            ...data,
            code: data.code.trim(),
            supplier: data.supplier || parseSupplierFromCode(data.code) || 'Unknown',
            id: generateId(),
            labelPrinted: false,
            createdAt: now,
            updatedAt: now,
          });
          indexByCode.set(key, next.length - 1);
        }
        successCount++;
      }
      return next;
    });

    return { successCount, errorCount, updatedCount };
  }, []);

  const editProduct = useCallback((id: string, data: ProductFormData): { success: boolean; error?: string } => {
    let updated = false;
    let error = '';

    setProducts((prev) => {
      const duplicate = prev.find(
        (p) => p.code.toLowerCase() === data.code.toLowerCase() && p.id !== id
      );
      if (duplicate) {
        error = `Product code "${data.code}" already exists.`;
        return prev;
      }
      updated = true;
      return prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...data,
              supplier: data.supplier || parseSupplierFromCode(data.code) || p.supplier,
              updatedAt: new Date().toISOString(),
            }
          : p
      );
    });

    return updated ? { success: true } : { success: false, error };
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const restockProduct = useCallback((id: string, amount: number = 1) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, quantity: p.quantity + amount, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const recordSale = useCallback((product: Product, quantity: number, transactionId?: string) => {
    const unitPrice = getSalePrice(product);
    const saleRecord = normalizeSaleRecord({
      id: generateId(),
      transactionId,
      productCode: product.code,
      productName: product.name,
      category: product.category || 'Uncategorized',
      quantitySold: quantity,
      mrp: product.sellingPrice,
      offerPrice: product.offerPrice,
      lineDiscount: 0,
      salePrice: unitPrice,
      costPrice: product.costPrice,
      saleDateTime: new Date().toISOString(),
    });
    setSales((prev) => [saleRecord, ...prev]);
  }, []);

  const completeCartSale = useCallback((items: CartItem[], billDiscount: number): { success: boolean; error?: string; transaction?: CompletedTransaction } => {
    if (items.length === 0) {
      return { success: false, error: 'Cart is empty.' };
    }

    for (const item of items) {
      if (item.isCustom) continue;
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return { success: false, error: `Product ${item.productCode} not found.` };
      }
      if (product.quantity < item.quantity) {
        return { success: false, error: `Only ${product.quantity} of ${item.productCode} in stock.` };
      }
    }

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const discount = Math.max(0, Math.min(billDiscount, subtotal));
    const total = subtotal - discount;
    const transactionId = generateId();
    const saleDateTime = new Date().toISOString();
    const newPending: PendingStockItem[] = [];

    const saleRecords: SaleRecord[] = items.map((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      const billShare = subtotal > 0 ? (lineSubtotal / subtotal) * discount : 0;
      const lineTotal = lineSubtotal - billShare;
      const finalUnitPrice = Math.round((lineTotal / item.quantity) * 100) / 100;
      const saleId = generateId();
      let pendingStockId: string | undefined;

      if (item.isCustom) {
        pendingStockId = generateId();
        newPending.push({
          id: pendingStockId,
          saleId,
          name: item.productName,
          category: item.category,
          quantitySold: item.quantity,
          sellingPrice: finalUnitPrice,
          costPrice: item.costPrice,
          saleDateTime,
          resolved: false,
        });
      }

      return normalizeSaleRecord({
        id: saleId,
        transactionId,
        productCode: item.isCustom ? `MISC-${saleId.slice(-6)}` : item.productCode,
        productName: item.productName,
        category: item.category,
        quantitySold: item.quantity,
        mrp: item.mrp,
        offerPrice: item.offerPrice,
        lineDiscount: Math.round(billShare * 100) / 100,
        salePrice: finalUnitPrice,
        costPrice: item.costPrice,
        saleDateTime,
        isCustom: item.isCustom,
        pendingStockId,
      });
    });

    setProducts((prev) => {
      const next = prev.map((p) => ({ ...p }));
      for (const item of items) {
        if (item.isCustom || !item.productId) continue;
        const idx = next.findIndex((p) => p.id === item.productId);
        if (idx !== -1) {
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity - item.quantity,
            updatedAt: saleDateTime,
          };
        }
      }
      return next;
    });

    setSales((prev) => [...saleRecords, ...prev]);
    if (newPending.length > 0) {
      setPendingStock((prev) => [...newPending, ...prev]);
    }

    const profit = saleRecords.reduce((sum, s) => sum + saleLineProfit(s), 0);

    return {
      success: true,
      transaction: {
        transactionId,
        items: saleRecords,
        subtotal,
        discount,
        total,
        profit,
        saleDateTime,
      },
    };
  }, [products]);

  const revertSales = useCallback((saleIds: string[]): { success: boolean; error?: string; revertedCount?: number } => {
    const idSet = new Set(saleIds);
    const toRevert = sales.filter((s) => idSet.has(s.id));
    if (toRevert.length === 0) {
      return { success: false, error: 'Sale not found.' };
    }

    const now = new Date().toISOString();
    const revertedIds = new Set(toRevert.map((s) => s.id));
    const revertedPendingIds = new Set(
      toRevert.filter((s) => s.pendingStockId).map((s) => s.pendingStockId as string)
    );

    setSales((prev) => prev.filter((s) => !idSet.has(s.id)));
    setPendingStock((prev) =>
      prev.filter((p) => !revertedPendingIds.has(p.id) && !revertedIds.has(p.saleId))
    );
    setProducts((prev) => {
      const next = prev.map((p) => ({ ...p }));
      for (const sale of toRevert) {
        if (sale.isCustom) continue;
        const idx = next.findIndex((p) => p.code.toLowerCase() === sale.productCode.toLowerCase());
        if (idx !== -1) {
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + sale.quantitySold,
            updatedAt: now,
          };
        }
      }
      return next;
    });

    return { success: true, revertedCount: toRevert.length };
  }, [sales]);

  const revertSale = useCallback(
    (saleId: string) => revertSales([saleId]),
    [revertSales]
  );

  const revertTransaction = useCallback(
    (transactionId: string) => {
      const ids = sales.filter((s) => s.transactionId === transactionId).map((s) => s.id);
      if (ids.length === 0) {
        return { success: false, error: 'Bill not found.' };
      }
      return revertSales(ids);
    },
    [sales, revertSales]
  );

  const resolvePendingStock = useCallback((pendingId: string) => {
    setPendingStock((prev) =>
      prev.map((p) => (p.id === pendingId ? { ...p, resolved: true } : p))
    );
  }, []);

  const dismissPendingStock = useCallback((pendingId: string) => {
    setPendingStock((prev) => prev.filter((p) => p.id !== pendingId));
  }, []);

  const sellProduct = useCallback((id: string, quantity: number = 1): { success: boolean; error?: string; product?: Product } => {
    let result: { success: boolean; error?: string; product?: Product } = { success: false, error: 'Product not found.' };
    let saleToRecord: { product: Product; quantity: number } | null = null;

    setProducts((prev) => {
      const product = prev.find((p) => p.id === id);
      if (!product) return prev;
      if (product.quantity <= 0) {
        result = { success: false, error: 'Out of stock.' };
        return prev;
      }
      if (product.quantity < quantity) {
        result = { success: false, error: `Only ${product.quantity} in stock.` };
        return prev;
      }

      const updated = {
        ...product,
        quantity: product.quantity - quantity,
        updatedAt: new Date().toISOString(),
      };
      saleToRecord = { product, quantity };
      result = { success: true, product: updated };
      return prev.map((p) => (p.id === id ? updated : p));
    });

    if (saleToRecord) {
      recordSale(saleToRecord.product, saleToRecord.quantity);
    }
    return result;
  }, [recordSale]);

  const sellProductByCode = useCallback((code: string, quantity: number = 1): { success: boolean; error?: string; product?: Product; previousQty?: number } => {
    const product = products.find((p) => p.code.toLowerCase() === code.toLowerCase());
    if (!product) return { success: false, error: `No product found with code "${code}".` };
    const previousQty = product.quantity;
    const result = sellProduct(product.id, quantity);
    return { ...result, previousQty };
  }, [products, sellProduct]);

  const getProductByCode = useCallback((code: string): Product | undefined => {
    return products.find((p) => p.code.toLowerCase() === code.toLowerCase());
  }, [products]);

  const getProductById = useCallback((id: string): Product | undefined => {
    return products.find((p) => p.id === id);
  }, [products]);

  const markLabelsPrinted = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setProducts((prev) =>
      prev.map((p) =>
        idSet.has(p.id) ? { ...p, labelPrinted: true, updatedAt: new Date().toISOString() } : p
      )
    );
  }, []);

  const exportToExcel = useCallback(() => {
    const rows = products.map((p) => ({
      'Product Code': p.code,
      'Product Name': p.name,
      Category: p.category,
      Supplier: p.supplier,
      Qty: p.quantity,
      'Selling Price': p.sellingPrice,
      'Offer Price': p.offerPrice,
      'Cost Price': p.costPrice,
      'Label Printed': p.labelPrinted ? 'Yes' : 'No',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `inventory_backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [products]);

  const exportToJson = useCallback(() => {
    const data = { products, sales, pendingStock, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [products, sales, pendingStock]);

  const exportSalesToExcel = useCallback(() => {
    const rows = sales.map((s) => ({
      'Transaction ID': s.transactionId || '',
      'Product Code': s.productCode,
      'Product Name': s.productName,
      Category: s.category,
      'Qty Sold': s.quantitySold,
      MRP: s.mrp,
      'Offer Price': s.offerPrice,
      Discount: s.lineDiscount,
      'Final Price': s.salePrice,
      'Cost Price': s.costPrice,
      Revenue: s.salePrice * s.quantitySold,
      Profit: saleLineProfit(s),
      'Date & Time': new Date(s.saleDateTime).toLocaleString('en-IN'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, `sales_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [sales]);

  const now = new Date();
  const todaySales = sales.filter((s) => isSameDay(s.saleDateTime, now));
  const weekSales = sales.filter((s) => isSameWeek(s.saleDateTime, now));
  const monthSales = sales.filter((s) => isSameMonth(s.saleDateTime, now));

  const supplierCounts = products.reduce<Record<string, number>>((acc, p) => {
    const key = p.supplier || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const supplierValues = products.reduce<Record<string, number>>((acc, p) => {
    const key = p.supplier || 'Unknown';
    acc[key] = (acc[key] || 0) + p.sellingPrice * p.quantity;
    return acc;
  }, {});

  const categoryCounts = products.reduce<Record<string, number>>((acc, p) => {
    const key = p.category || 'Uncategorized';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topSellingCategories = sales.reduce<Record<string, number>>((acc, s) => {
    const key = s.category || products.find((p) => p.code === s.productCode)?.category || 'Uncategorized';
    acc[key] = (acc[key] || 0) + s.quantitySold;
    return acc;
  }, {});

  const stats = {
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + p.quantity, 0),
    outOfStockCount: products.filter((p) => isOutOfStock(p.quantity)).length,
    lowStockCount: products.filter((p) => isLowStock(p.quantity)).length,
    mediumStockCount: products.filter((p) => isMediumStock(p.quantity)).length,
    healthyStockCount: products.filter((p) => isHealthyStock(p.quantity)).length,
    // Inventory Cost  = Σ (costPrice × quantity)
    totalCostValue: products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0),
    // Inventory Value = Σ (sellingPrice × quantity)
    totalSellingValue: products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0),
    // Potential Profit = Σ (offer or MRP − cost) × quantity
    expectedProfit: products.reduce(
      (sum, p) => sum + productUnitProfit(p) * p.quantity,
      0
    ),
    profitMarginPercent: 0,
    profitEarned: sales.reduce((sum, s) => sum + saleLineProfit(s), 0),
    todaysSales: todaySales.reduce((sum, s) => sum + s.salePrice * s.quantitySold, 0),
    weeklyRevenue: weekSales.reduce((sum, s) => sum + s.salePrice * s.quantitySold, 0),
    monthlyRevenue: monthSales.reduce((sum, s) => sum + s.salePrice * s.quantitySold, 0),
    totalSalesRevenue: sales.reduce((sum, s) => sum + s.salePrice * s.quantitySold, 0),
    supplierCounts,
    supplierValues,
    categoryCounts,
    topSellingCategories,
    lowStockProducts: products.filter((p) => isLowStock(p.quantity)),
    mediumStockProducts: products.filter((p) => isMediumStock(p.quantity)),
    outOfStockProducts: products.filter((p) => isOutOfStock(p.quantity)),
    missingLabelCount: products.filter((p) => !p.labelPrinted).length,
  };

  stats.profitMarginPercent = stats.totalSellingValue > 0
    ? Math.round((stats.expectedProfit / stats.totalSellingValue) * 1000) / 10
    : 0;

  return {
    products,
    sales,
    pendingStock,
    stats,
    apiConnected,
    addProduct,
    addProductsBatch,
    editProduct,
    deleteProduct,
    restockProduct,
    sellProduct,
    sellProductByCode,
    completeCartSale,
    revertSale,
    revertTransaction,
    resolvePendingStock,
    dismissPendingStock,
    getProductByCode,
    getProductById,
    markLabelsPrinted,
    exportToExcel,
    exportToJson,
    exportSalesToExcel,
  };
}
