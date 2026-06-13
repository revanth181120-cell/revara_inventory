import { useEffect, useRef } from 'react';

export interface HardwareScannerOptions {
  enabled: boolean;
  onScan: (code: string) => void;
  /** Minimum characters to treat as a barcode (default 3). */
  minLength?: number;
  /** Max ms between keystrokes before buffer resets (default 80). */
  maxInterKeyMs?: number;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/** Normalize USB scanner output (CODE128 product codes). */
export function normalizeScannedCode(raw: string): string {
  return raw.replace(/[\r\n\t]/g, '').trim().replace(/[.;,\s]+$/g, '');
}

/**
 * Listen for USB/HID barcode scanners (keyboard wedge).
 * Scanners type very fast and end with Enter — unlike human typing.
 */
export function useHardwareScanner({
  enabled,
  onScan,
  minLength = 3,
  maxInterKeyMs = 80,
}: HardwareScannerOptions): void {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = '';
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;

      if (e.key === 'Enter') {
        const code = normalizeScannedCode(bufferRef.current);
        bufferRef.current = '';
        lastKeyTimeRef.current = 0;

        if (code.length >= minLength && gap <= maxInterKeyMs * 3) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(code);
        }
        return;
      }

      if (e.key.length !== 1) return;

      if (gap > maxInterKeyMs) {
        bufferRef.current = e.key;
      } else {
        bufferRef.current += e.key;
      }
      lastKeyTimeRef.current = now;

      // Fast keystrokes from a scanner should not land in chat boxes or search fields.
      if (gap <= maxInterKeyMs && isEditableTarget(e.target)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, minLength, maxInterKeyMs]);
}
