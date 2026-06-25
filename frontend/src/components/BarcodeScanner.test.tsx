import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarcodeScanner } from './BarcodeScanner';
import { Product } from '../types/Product';

const html5QrCodeMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  getState: vi.fn(),
  onSuccess: undefined as ((decodedText: string) => void) | undefined,
}));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    start = html5QrCodeMock.start;
    stop = html5QrCodeMock.stop;
    getState = html5QrCodeMock.getState;
  },
}));

const product: Product = {
  id: 'product-1',
  code: 'ABC123',
  name: 'Gold Earrings',
  category: 'Earrings',
  supplier: 'Supplier',
  quantity: 5,
  sellingPrice: 1000,
  offerPrice: 0,
  costPrice: 400,
  labelPrinted: false,
  createdAt: '2026-06-25T00:00:00.000Z',
  updatedAt: '2026-06-25T00:00:00.000Z',
};

describe('BarcodeScanner', () => {
  beforeEach(() => {
    html5QrCodeMock.onSuccess = undefined;
    html5QrCodeMock.start.mockImplementation((_cameraConfig, _scannerConfig, onSuccess) => {
      html5QrCodeMock.onSuccess = onSuccess;
      return Promise.resolve();
    });
    html5QrCodeMock.stop.mockResolvedValue(undefined);
    html5QrCodeMock.getState.mockReturnValue(2);
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not automatically rescan after an auto-sold camera scan', async () => {
    const soldProduct = { ...product, quantity: 4 };
    const onScanSell = vi.fn(() => ({
      success: true,
      product: soldProduct,
      previousQty: product.quantity,
    }));

    render(
      <BarcodeScanner
        onClose={vi.fn()}
        onScanSell={onScanSell}
        getProductByCode={() => product}
        autoSell
      />
    );

    expect(html5QrCodeMock.start).toHaveBeenCalledTimes(1);

    await act(async () => {
      html5QrCodeMock.onSuccess?.(product.code);
      await Promise.resolve();
    });

    expect(onScanSell).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Sold 1.*Gold Earrings/)).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(html5QrCodeMock.start).toHaveBeenCalledTimes(1);
    expect(onScanSell).toHaveBeenCalledTimes(1);
  });
});
