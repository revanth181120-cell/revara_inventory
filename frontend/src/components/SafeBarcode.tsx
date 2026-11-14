import React from 'react';
import Barcode from 'react-barcode';
import { canRenderCode128 } from '../utils/barcode';

interface SafeBarcodeProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  margin?: number;
  displayValue?: boolean;
}

interface BarcodeErrorBoundaryProps {
  value: string;
  fallback: React.ReactNode;
  children: React.ReactNode;
}

class BarcodeErrorBoundary extends React.Component<BarcodeErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: BarcodeErrorBoundaryProps) {
    if (this.state.hasError && prevProps.value !== this.props.value) {
      this.setState({ hasError: false });
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export const SafeBarcode: React.FC<SafeBarcodeProps> = ({ value, ...barcodeProps }) => {
  const fallback = (
    <span className="barcode-fallback" title="This product code cannot be rendered as a CODE128 barcode.">
      Barcode unavailable
    </span>
  );

  if (!canRenderCode128(value)) {
    return fallback;
  }

  return (
    <BarcodeErrorBoundary value={value} fallback={fallback}>
      <Barcode value={value} {...barcodeProps} />
    </BarcodeErrorBoundary>
  );
};
