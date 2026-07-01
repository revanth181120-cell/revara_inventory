import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { parseSupplierFromCode, getSalePrice } from '../types/Product';
import type { Product, SaleRecord, ProductFormData } from '../types/Product';
import { checkApiHealth, fetchProducts, fetchSales, syncProducts, syncSales } from '../api/inventoryApi';

const PRODUCTS_KEY = 'revara_products';
const SALES_KEY = 'revara_sales';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type StorageLoad<T> = {
  value: T;
  canPersistInitialValue: boolean;
};

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

function normalizeStoredSales(stored: unknown[]): SaleRecord[] {
  return stored.map((item) => {
    const sale = item as SaleRecord;
    return { ...sale, costPrice: sale.costPrice ?? 0 };
  });
}

function readStoredArray<T>(key: string, normalize: (stored: unknown[]) => T[]): StorageLoad<T[]> {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return { value: [], canPersistInitialValue: true };
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      throw new Error(`${key} must contain an array`);
    }

    return { value: normalize(parsed), canPersistInitialValue: true };
  } catch (error) {
    console.error(`Unable to load ${key} from localStorage; preserving the saved value.`, error);
    return { value: [], canPersistInitialValue: false };
  }
}

function writeStoredArray<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to save ${key} to localStorage.`, error);
  }
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

export function useInventory() {
  const [apiConnected, setApiConnected] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyForSync = useRef(false);
  const productsStorageLoad = useRef<StorageLoad<Product[]> | null>(null);
  const salesStorageLoad = useRef<StorageLoad<SaleRecord[]> | null>(null);

  if (productsStorageLoad.current === null) {
    productsStorageLoad.current = readStoredArray(PRODUCTS_KEY, migrateStoredProducts);
  }
  if (salesStorageLoad.current === null) {
    salesStorageLoad.current = readStoredArray(SALES_KEY, normalizeStoredSales);
  }

  const loadedProducts = productsStorageLoad.current;
  const loadedSales = salesStorageLoad.current;
  const initialProductsRef = useRef(loadedProducts.value);
  const initialSalesRef = useRef(loadedSales.value);
  const skipInitialProductsPersist = useRef(!loadedProducts.canPersistInitialValue);
  const skipInitialSalesPersist = useRef(!loadedSales.canPersistInitialValue);

  const [products, setProducts] = useState<Product[]>(loadedProducts.value);

  const [sales, setSales] = useState<SaleRecord[]>(loadedSales.value);

  useEffect(() => {
    if (skipInitialProductsPersist.current && products === initialProductsRef.current) {
      return;
    }
    skipInitialProductsPersist.current = false;
    writeStoredArray(PRODUCTS_KEY, products);
  }, [products]);

  useEffect(() => {
    if (skipInitialSalesPersist.current && sales === initialSalesRef.current) {
      return;
    }
    skipInitialSalesPersist.current = false;
    writeStoredArray(SALES_KEY, sales);
  }, [sales]);

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
          setSales(apiSales as SaleRecord[]);
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
            const normalized = parsed.map((s) => ({ ...s, costPrice: s.costPrice ?? 0 }));
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

  const addProductsBatch = useCallback((items: ProductFormData[]): { successCount: number; errorCount: number } => {
    let successCount = 0;
    let errorCount = 0;

    setProducts((prev) => {
      const next = [...prev];
      const codes = new Set(next.map((p) => p.code.toLowerCase()));

      for (const data of items) {
        if (!data.code?.trim()) {
          errorCount++;
          continue;
        }
        const key = data.code.toLowerCase();
        if (codes.has(key)) {
          errorCount++;
          continue;
        }
        const now = new Date().toISOString();
        next.push({
          ...data,
          supplier: data.supplier || parseSupplierFromCode(data.code) || 'Unknown',
          id: generateId(),
          labelPrinted: false,
          createdAt: now,
          updatedAt: now,
        });
        codes.add(key);
        successCount++;
      }
      return next;
    });

    return { successCount, errorCount };
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

  const recordSale = useCallback((product: Product, quantity: number) => {
    const salePrice = getSalePrice(product);
    const saleRecord: SaleRecord = {
      id: generateId(),
      productCode: product.code,
      productName: product.name,
      quantitySold: quantity,
      salePrice,
      costPrice: product.costPrice,
      saleDateTime: new Date().toISOString(),
    };
    setSales((prev) => [saleRecord, ...prev]);
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
    const data = { products, sales, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [products, sales]);

  const exportSalesToExcel = useCallback(() => {
    const rows = sales.map((s) => ({
      'Product Code': s.productCode,
      'Product Name': s.productName,
      'Qty Sold': s.quantitySold,
      'Sale Price': s.salePrice,
      'Cost Price': s.costPrice,
      Revenue: s.salePrice * s.quantitySold,
      Profit: (s.salePrice - s.costPrice) * s.quantitySold,
      'Date & Time': new Date(s.saleDateTime).toLocaleString('en-IN'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, `sales_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [sales]);

  const now = new Date();
  const todaySales = sales.filter((s) => isSameDay(s.saleDateTime, now));
  const monthSales = sales.filter((s) => isSameMonth(s.saleDateTime, now));

  const supplierCounts = products.reduce<Record<string, number>>((acc, p) => {
    const key = p.supplier || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const stats = {
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + p.quantity, 0),
    lowStockCount: products.filter((p) => p.quantity > 0 && p.quantity <= 2).length,
    outOfStockCount: products.filter((p) => p.quantity === 0).length,
    // Inventory Cost  = Σ (costPrice × quantity)
    totalCostValue: products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0),
    // Inventory Value = Σ (sellingPrice × quantity)
    totalSellingValue: products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0),
    // Expected Profit = Σ ((sellingPrice - costPrice) × quantity)
    // Always equals totalSellingValue - totalCostValue
    expectedProfit: products.reduce(
      (sum, p) => sum + (p.sellingPrice - p.costPrice) * p.quantity,
      0
    ),
    profitMarginPercent: 0,
    profitEarned: sales.reduce(
      (sum, s) => sum + (s.salePrice - s.costPrice) * s.quantitySold,
      0
    ),
    todaysSales: todaySales.reduce((sum, s) => sum + s.salePrice * s.quantitySold, 0),
    monthlyRevenue: monthSales.reduce((sum, s) => sum + s.salePrice * s.quantitySold, 0),
    totalSalesRevenue: sales.reduce((sum, s) => sum + s.salePrice * s.quantitySold, 0),
    supplierCounts,
    lowStockProducts: products.filter((p) => p.quantity > 0 && p.quantity <= 2),
    outOfStockProducts: products.filter((p) => p.quantity === 0),
    missingLabelCount: products.filter((p) => !p.labelPrinted).length,
  };

  stats.profitMarginPercent = stats.totalSellingValue > 0
    ? Math.round((stats.expectedProfit / stats.totalSellingValue) * 1000) / 10
    : 0;

  return {
    products,
    sales,
    stats,
    apiConnected,
    addProduct,
    addProductsBatch,
    editProduct,
    deleteProduct,
    restockProduct,
    sellProduct,
    sellProductByCode,
    getProductByCode,
    markLabelsPrinted,
    exportToExcel,
    exportToJson,
    exportSalesToExcel,
  };
}
