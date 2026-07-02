import {
  CompletedTransaction,
  SaleRecord,
  catalogLineTotal,
  invoiceLineLabel,
  itemHasStoreOffer,
} from '../types/Product';
import { recordWhatsappInvoice } from '../api/inventoryApi';

const WHATSAPP_PHONE_KEY = 'revara_whatsapp_phone';
const LOCAL_SENT_INVOICES_KEY = 'revara_sent_whatsapp_invoices';

export interface SentWhatsappInvoice {
  id: string;
  transactionId: string;
  customerPhone: string;
  billTotal: number;
  messageText: string;
  sentAt: string;
}

export function getSavedWhatsAppPhone(): string {
  try {
    return localStorage.getItem(WHATSAPP_PHONE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveWhatsAppPhone(phone: string): void {
  try {
    localStorage.setItem(WHATSAPP_PHONE_KEY, phone);
  } catch {
    // ignore
  }
}

function getLocalSentInvoices(): SentWhatsappInvoice[] {
  try {
    const raw = localStorage.getItem(LOCAL_SENT_INVOICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSentInvoice(record: SentWhatsappInvoice): void {
  try {
    const list = getLocalSentInvoices();
    localStorage.setItem(LOCAL_SENT_INVOICES_KEY, JSON.stringify([record, ...list].slice(0, 200)));
  } catch {
    // ignore
  }
}

/** Strip to digits; default India (+91) for 10-digit numbers */
export function normalizeWhatsAppPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

function padRight(text: string, width: number): string {
  const s = text.length > width ? `${text.slice(0, width - 1)}…` : text;
  return s.padEnd(width, ' ');
}

function padLeft(text: string, width: number): string {
  return text.padStart(width, ' ');
}

function formatItemPriceLine(item: SaleRecord): string {
  if (item.isCustom) return '';
  const mrp = `MRP ${formatRupee(item.mrp)}`;
  if (itemHasStoreOffer(item)) {
    return `  ${mrp}  Offer ${formatRupee(item.offerPrice)}`;
  }
  return `  ${mrp}`;
}

function formatRupee(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Tabular WhatsApp bill (monospace block for aligned columns) */
export function formatInvoiceForWhatsApp(transaction: CompletedTransaction): string {
  const dateStr = new Date(transaction.saleDateTime).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemCol = 18;
  const qtyCol = 4;
  const amtCol = 9;

  const tableLines: string[] = [
    padRight('Item', itemCol) + padLeft('Qty', qtyCol) + padLeft('Amount', amtCol),
    '─'.repeat(itemCol + qtyCol + amtCol),
  ];

  for (const item of transaction.items) {
    const label = invoiceLineLabel(item);
    const qty = String(item.quantitySold);
    const amount = formatRupee(catalogLineTotal(item));
    tableLines.push(
      padRight(label, itemCol) + padLeft(qty, qtyCol) + padLeft(amount, amtCol),
    );
    const priceLine = formatItemPriceLine(item);
    if (priceLine) tableLines.push(priceLine);
  }

  tableLines.push('─'.repeat(itemCol + qtyCol + amtCol));
  tableLines.push(
    padRight('Cart Total', itemCol + qtyCol) + padLeft(formatRupee(transaction.subtotal), amtCol),
  );
  if (transaction.discount > 0) {
    tableLines.push(
      padRight('Overall Discount', itemCol + qtyCol) + padLeft(`−${formatRupee(transaction.discount)}`, amtCol),
    );
  }
  tableLines.push(
    padRight('BILL TOTAL', itemCol + qtyCol) + padLeft(formatRupee(transaction.total), amtCol),
  );

  return [
    '*REVARA FASHIONS*',
    'Fashion Jewellery',
    dateStr,
    '',
    '```',
    ...tableLines,
    '```',
    '',
    'Thank you for shopping with us!',
  ].join('\n');
}

async function persistSentInvoice(
  phone: string,
  transaction: CompletedTransaction,
  messageText: string,
): Promise<void> {
  const record: SentWhatsappInvoice = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    transactionId: transaction.transactionId,
    customerPhone: phone,
    billTotal: transaction.total,
    messageText,
    sentAt: new Date().toISOString(),
  };

  const savedToDb = await recordWhatsappInvoice(record);
  if (!savedToDb) {
    saveLocalSentInvoice(record);
  }
}

export function openInvoiceOnWhatsApp(
  phone: string,
  transaction: CompletedTransaction,
): { success: boolean; error?: string } {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) {
    return { success: false, error: 'Enter a valid 10-digit mobile number (or include country code).' };
  }

  const text = formatInvoiceForWhatsApp(transaction);
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  saveWhatsAppPhone(phone.trim());

  void persistSentInvoice(normalized, transaction, text);

  return { success: true };
}
