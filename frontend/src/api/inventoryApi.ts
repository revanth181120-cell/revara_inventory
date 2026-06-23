const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  supplier: string;
  quantity: number;
  sellingPrice: number;
  offerPrice: number;
  costPrice: number;
  imageUrl?: string;
  labelPrinted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSale {
  id: string;
  productCode: string;
  productName: string;
  quantitySold: number;
  salePrice: number;
  costPrice: number;
  saleDateTime: string;
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchProducts(): Promise<ApiProduct[]> {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function fetchSales(): Promise<ApiSale[]> {
  const res = await fetch(`${API_BASE}/sales`);
  if (!res.ok) throw new Error('Failed to fetch sales');
  return res.json();
}

async function assertSyncSucceeded(res: Response, label: string): Promise<void> {
  if (res.ok) return;
  let message = `${label} sync failed`;
  try {
    const body = await res.json();
    if (body?.error) message = `${message}: ${body.error}`;
  } catch {
    // Keep the generic message when the API does not return JSON.
  }
  throw new Error(message);
}

export async function syncProducts(products: ApiProduct[]): Promise<void> {
  const res = await fetch(`${API_BASE}/products/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(products),
  });
  await assertSyncSucceeded(res, 'Products');
}

export async function syncSales(sales: ApiSale[]): Promise<void> {
  const res = await fetch(`${API_BASE}/sales/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sales),
  });
  await assertSyncSucceeded(res, 'Sales');
}
