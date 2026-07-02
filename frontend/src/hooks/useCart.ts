import { useState, useCallback, useMemo } from 'react';
import { Product, CartItem, productToCartItem, createCustomCartItem, cartLineProfit } from '../types/Product';

export function useCart(getProductById: (id: string) => Product | undefined) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);

  const addProduct = useCallback((product: Product, quantity = 1): { success: boolean; error?: string } => {
    if (product.quantity <= 0) {
      return { success: false, error: `${product.code} is out of stock.` };
    }

    let error = '';
    setItems((prev) => {
      const existing = prev.find((i) => !i.isCustom && i.productId === product.id);
      const currentQty = existing?.quantity ?? 0;
      if (currentQty + quantity > product.quantity) {
        error = `Only ${product.quantity} of ${product.code} available.`;
        return prev;
      }

      if (existing) {
        return prev.map((i) =>
          i.cartLineId === existing.cartLineId
            ? productToCartItem(product, i.quantity + quantity)
            : i
        );
      }

      return [...prev, productToCartItem(product, quantity)];
    });

    return error ? { success: false, error } : { success: true };
  }, []);

  const addCustomItem = useCallback((input: {
    name: string;
    unitPrice: number;
    costPrice?: number;
    quantity?: number;
    category?: string;
  }): { success: boolean; error?: string } => {
    if (!input.name.trim()) {
      return { success: false, error: 'Enter a name for the item.' };
    }
    if (input.unitPrice <= 0) {
      return { success: false, error: 'Enter a selling price greater than 0.' };
    }
    setItems((prev) => [...prev, createCustomCartItem(input)]);
    return { success: true };
  }, []);

  const addByCode = useCallback((product: Product | undefined, quantity = 1) => {
    if (!product) return { success: false, error: 'Product not found.' };
    return addProduct(product, quantity);
  }, [addProduct]);

  const updateQuantity = useCallback((cartLineId: string, quantity: number) => {
    setItems((prev) => {
      const item = prev.find((i) => i.cartLineId === cartLineId);
      if (!item) return prev;
      if (quantity <= 0) return prev.filter((i) => i.cartLineId !== cartLineId);

      if (item.isCustom) {
        return prev.map((i) =>
          i.cartLineId === cartLineId ? { ...i, quantity } : i
        );
      }

      const product = item.productId ? getProductById(item.productId) : undefined;
      if (!product) return prev.filter((i) => i.cartLineId !== cartLineId);
      const capped = Math.min(quantity, product.quantity);
      return prev.map((i) =>
        i.cartLineId === cartLineId ? productToCartItem(product, capped) : i
      );
    });
  }, [getProductById]);

  const removeItem = useCallback((cartLineId: string) => {
    setItems((prev) => prev.filter((i) => i.cartLineId !== cartLineId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setBillDiscount(0);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [items]
  );

  const discount = useMemo(
    () => Math.max(0, Math.min(billDiscount, subtotal)),
    [billDiscount, subtotal]
  );

  const total = subtotal - discount;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const estimatedProfit = items.reduce((sum, i) => sum + cartLineProfit(i), 0) - discount;

  return {
    items,
    billDiscount,
    setBillDiscount,
    addProduct,
    addCustomItem,
    addByCode,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    discount,
    total,
    itemCount,
    estimatedProfit,
  };
}
