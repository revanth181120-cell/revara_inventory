import React from 'react';
import Barcode from 'react-barcode';
import { Product, LabelDimensions, getLabelRowWidthMm } from '../types/Product';
import { getLabelSizing } from '../utils/labelSizing';

interface LabelPrintProps {
  product: Product;
  dimensions: LabelDimensions;
  forPrint?: boolean;
}

export const LabelPrint: React.FC<LabelPrintProps> = ({ product, dimensions, forPrint = false }) => {
  const { labelWidthMm, labelHeightMm, printOffsetXMm = 0, printOffsetYMm = 0 } = dimensions;
  const sizing = getLabelSizing(dimensions, forPrint);
  const padTop = forPrint ? sizing.paddingTopMm : sizing.paddingMm;
  const padBottom = forPrint ? sizing.paddingBottomMm : sizing.paddingMm;
  const padX = sizing.paddingMm;
  const nudge = forPrint && (printOffsetXMm || printOffsetYMm)
    ? { transform: `translate(${printOffsetXMm}mm, ${printOffsetYMm}mm)` }
    : {};

  return (
    <div
      className="tt-label"
      style={{
        width: `${labelWidthMm}mm`,
        height: `${labelHeightMm}mm`,
        padding: `${padTop}mm ${padX}mm ${padBottom}mm ${padX}mm`,
        boxSizing: 'border-box',
        ...nudge,
      }}
    >
      <div className="tt-label__header">
        <strong className="tt-label__brand" style={{ fontSize: sizing.brandPx, marginLeft: `${sizing.textInsetMm}mm` }}>REVARA</strong>
        <span className="tt-label__code" style={{ fontSize: sizing.codePx, marginRight: `${sizing.textInsetMm}mm` }}>{product.code}</span>
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
        <div className="tt-label__mrp" style={{ fontSize: sizing.mrpPx, marginLeft: `${sizing.textInsetMm}mm` }}>
          MRP: ₹{product.sellingPrice.toLocaleString('en-IN')}
        </div>
        <div className="tt-label__offer" style={{ fontSize: sizing.offerPx, marginRight: `${sizing.textInsetMm}mm` }}>
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

function LabelRow({
  row,
  dimensions,
  rowWidthMm,
  labelHeightMm,
  columnsPerRow,
  gapMm,
  leadingMarginMm,
  forPrint,
}: {
  row: Product[];
  dimensions: LabelDimensions;
  rowWidthMm: number;
  labelHeightMm: number;
  columnsPerRow: number;
  gapMm: number;
  leadingMarginMm: number;
  forPrint: boolean;
}) {
  const labelWidthMm = dimensions.labelWidthMm;
  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columnsPerRow}, ${labelWidthMm}mm)`,
    gap: `${gapMm}mm`,
    paddingLeft: `${leadingMarginMm}mm`,
    width: `${rowWidthMm}mm`,
    height: `${labelHeightMm}mm`,
    alignItems: 'start',
    alignContent: 'start',
  };

  const spacerStyle: React.CSSProperties = {
    width: `${labelWidthMm}mm`,
    height: `${labelHeightMm}mm`,
    visibility: 'hidden',
    pointerEvents: 'none',
  };

  return (
    <div className="label-row" style={rowStyle}>
      {row.map((product) => (
        <LabelPrint key={product.id} product={product} dimensions={dimensions} forPrint={forPrint} />
      ))}
      {row.length < columnsPerRow &&
        Array.from({ length: columnsPerRow - row.length }).map((_, i) => (
          <div key={`spacer-${i}`} className="tt-label tt-label--spacer" style={spacerStyle} aria-hidden />
        ))}
    </div>
  );
}

export const LabelSheet: React.FC<LabelSheetProps> = ({ products, dimensions, className = '' }) => {
  const { columnsPerRow, gapMm, leadingMarginMm = 0, labelHeightMm } = dimensions;
  const rowWidthMm = getLabelRowWidthMm(dimensions);
  const isPrint = className.includes('--print');
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += columnsPerRow) {
    rows.push(products.slice(i, i + columnsPerRow));
  }

  const rowProps = {
    dimensions,
    rowWidthMm,
    labelHeightMm,
    columnsPerRow,
    gapMm,
    leadingMarginMm,
    forPrint: true,
  };

  if (isPrint) {
    return (
      <div className={`labels-container ${className}`}>
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="print-page">
            <LabelRow row={row} {...rowProps} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`labels-container ${className}`}>
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="label-preview-page">
          <div className="label-preview-page__tag">Page {rowIdx + 1}</div>
          <LabelRow row={row} {...rowProps} />
        </div>
      ))}
    </div>
  );
};
