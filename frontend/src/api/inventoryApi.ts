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

export async function syncProducts(products: ApiProduct[]): Promise<void> {
  await fetch(`${API_BASE}/products/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(products),
  });
}

export async function syncSales(sales: ApiSale[]): Promise<void> {
  await fetch(`${API_BASE}/sales/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sales),
  });
}

export interface WhatsappInvoiceRecord {
  id: string;
  transactionId: string;
  customerPhone: string;
  billTotal: number;
  messageText: string;
  sentAt: string;
}

export async function recordWhatsappInvoice(record: WhatsappInvoiceRecord): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/whatsapp-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchWhatsappInvoices(): Promise<WhatsappInvoiceRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/whatsapp-invoices`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
