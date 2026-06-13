import React from 'react';
import Barcode from 'react-barcode';
import { Product, LabelDimensions } from '../types/Product';
import { getLabelSizing } from '../utils/labelSizing';

interface LabelPrintProps {
  product: Product;
  dimensions: LabelDimensions;
}

export const LabelPrint: React.FC<LabelPrintProps> = ({ product, dimensions }) => {
  const { labelWidthMm, labelHeightMm } = dimensions;
  const sizing = getLabelSizing(dimensions);

  return (
    <div
      className="tt-label"
      style={{ width: `${labelWidthMm}mm`, height: `${labelHeightMm}mm`, padding: `${sizing.paddingMm}mm` }}
    >
      <div className="tt-label__header">
        <strong className="tt-label__brand" style={{ fontSize: sizing.brandPx }}>REVARA</strong>
        <span className="tt-label__code" style={{ fontSize: sizing.codePx }}>{product.code}</span>
      </div>

      <div className="tt-label__barcode">
        <Barcode
          value={product.code}
          format="CODE128"
          width={sizing.barcodeWidth}
          height={sizing.barcodeHeight}
          margin={0}
          displayValue={false}
        />
      </div>

      <div className="tt-label__prices">
        <div className="tt-label__mrp" style={{ fontSize: sizing.mrpPx }}>
          MRP: ₹{product.sellingPrice.toLocaleString('en-IN')}
        </div>
        <div className="tt-label__offer" style={{ fontSize: sizing.offerPx }}>
          Offer: {product.offerPrice > 0 ? `₹${product.offerPrice.toLocaleString('en-IN')}` : '—'}
        </div>
      </div>
    </div>
  );
};

interface LabelSheetProps {
  products: Product[];
  dimensions: LabelDimensions;
  className?: string;
}

export const LabelSheet: React.FC<LabelSheetProps> = ({ products, dimensions, className = '' }) => {
  const { columnsPerRow, labelWidthMm, gapMm } = dimensions;
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += columnsPerRow) {
    rows.push(products.slice(i, i + columnsPerRow));
  }

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columnsPerRow}, ${labelWidthMm}mm)`,
    gap: `${gapMm}mm`,
  };

  return (
    <div className={`labels-container ${className}`}>
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className="label-row"
          style={{
            ...rowStyle,
            pageBreakAfter: rowIdx < rows.length - 1 ? 'always' : 'auto',
            breakAfter: rowIdx < rows.length - 1 ? 'page' : 'auto',
          }}
        >
          {row.map((product) => (
            <LabelPrint key={product.id} product={product} dimensions={dimensions} />
          ))}
        </div>
      ))}
    </div>
  );
};
