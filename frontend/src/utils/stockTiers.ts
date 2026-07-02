/** Stock tiers: out = 0, low = 1, medium = 2–5, healthy = 6+ */
export type StockLevel = 'out' | 'low' | 'medium' | 'healthy';

export function getStockLevel(quantity: number): StockLevel {
  if (quantity === 0) return 'out';
  if (quantity === 1) return 'low';
  if (quantity <= 5) return 'medium';
  return 'healthy';
}

export function isOutOfStock(quantity: number): boolean {
  return quantity === 0;
}

export function isLowStock(quantity: number): boolean {
  return quantity === 1;
}

export function isMediumStock(quantity: number): boolean {
  return quantity >= 2 && quantity <= 5;
}

export function isHealthyStock(quantity: number): boolean {
  return quantity > 5;
}
