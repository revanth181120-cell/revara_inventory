import React from 'react';
import Barcode from 'react-barcode';
import { Product, LabelDimensions, getLabelRowWidthMm, isDumbbellLayout, getDumbbellStockWidthMm } from '../types/Product';
import { getLabelSizing } from '../utils/labelSizing';

interface LabelPrintProps {
  product: Product;
  dimensions: LabelDimensions;
  forPrint?: boolean;
}

function DumbbellLabelPrint({ product, dimensions, forPrint = false }: LabelPrintProps) {
  const {
    labelHeightMm,
    dumbbellLeftMm = 30,
    dumbbellBridgeMm = 20,
    dumbbellRightMm = 30,
    printOffsetXMm = 0,
    printOffsetYMm = 0,
    dumbbellMirrorForPrint = false,
  } = dimensions;
  const sizing = getLabelSizing(dimensions, forPrint);
  const stockWidthMm = getDumbbellStockWidthMm(dimensions);
  const padY = forPrint ? sizing.paddingTopMm : sizing.paddingMm;
  const padX = sizing.paddingMm;
  const mirror = forPrint && dumbbellMirrorForPrint;
  const nudge = forPrint && (printOffsetXMm || printOffsetYMm)
    ? { transform: `translate(${printOffsetXMm}mm, ${printOffsetYMm}mm)` }
    : {};

  const brandPad = (
    <div
      className="tt-dumbbell__left"
      style={{
        width: `${dumbbellLeftMm}mm`,
        height: `${labelHeightMm}mm`,
        padding: `${padY}mm ${padX}mm`,
        gap: `${sizing.sectionGapMm}mm`,
      }}
    >
      <strong
        className="tt-dumbbell__brand"
        style={{ fontSize: sizing.brandPx, paddingLeft: `${sizing.textInsetMm}mm` }}
      >
        REVARA
      </strong>
      <span
        className="tt-dumbbell__code"
        style={{ fontSize: sizing.codePx, paddingLeft: `${sizing.textInsetMm}mm` }}
      >
        {product.code}
      </span>
    </div>
  );

  const mrpPad = (
    <div
      className="tt-dumbbell__right"
      style={{
        width: `${dumbbellRightMm}mm`,
        height: `${labelHeightMm}mm`,
        padding: `${padY}mm ${padX}mm`,
      }}
    >
      <div className="tt-dumbbell__mrp" style={{ fontSize: sizing.mrpPx }}>
        MRP: ₹{product.sellingPrice.toLocaleString('en-IN')}
      </div>
    </div>
  );

  return (
    <div
      className="tt-dumbbell"
      style={{
        width: `${stockWidthMm}mm`,
        height: `${labelHeightMm}mm`,
        boxSizing: 'border-box',
        ...nudge,
      }}
    >
      {mirror ? mrpPad : brandPad}
      <div className="tt-dumbbell__bridge" style={{ width: `${dumbbellBridgeMm}mm`, height: `${labelHeightMm}mm` }} aria-hidden />
      {mirror ? brandPad : mrpPad}
    </div>
  );
}

export const LabelPrint: React.FC<LabelPrintProps> = ({ product, dimensions, forPrint = false }) => {
  if (isDumbbellLayout(dimensions)) {
    return <DumbbellLabelPrint product={product} dimensions={dimensions} forPrint={forPrint} />;
  }

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

      <div className="tt-label__prices tt-label__prices--center">
        <div className="tt-label__mrp tt-label__mrp--center" style={{ fontSize: sizing.mrpPx }}>
          MRP: ₹{product.sellingPrice.toLocaleString('en-IN')}
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
  rowIdx,
  dimensions,
  rowWidthMm,
  labelHeightMm,
  columnsPerRow,
  gapMm,
  leadingMarginMm,
  forPrint,
}: {
  row: Product[];
  rowIdx: number;
  dimensions: LabelDimensions;
  rowWidthMm: number;
  labelHeightMm: number;
  columnsPerRow: number;
  gapMm: number;
  leadingMarginMm: number;
  forPrint: boolean;
}) {
  const rowLabelWidthMm = isDumbbellLayout(dimensions)
    ? getDumbbellStockWidthMm(dimensions)
    : dimensions.labelWidthMm;
  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columnsPerRow}, ${rowLabelWidthMm}mm)`,
    gap: `${gapMm}mm`,
    paddingLeft: `${leadingMarginMm}mm`,
    width: `${rowWidthMm}mm`,
    height: `${labelHeightMm}mm`,
    alignItems: 'start',
    alignContent: 'start',
  };

  const spacerStyle: React.CSSProperties = {
    width: `${rowLabelWidthMm}mm`,
    height: `${labelHeightMm}mm`,
    visibility: 'hidden',
    pointerEvents: 'none',
  };

  return (
    <div className="label-row" style={rowStyle}>
      {row.map((product, colIdx) => (
        <LabelPrint
          key={`${rowIdx}-${colIdx}-${product.id}`}
          product={product}
          dimensions={dimensions}
          forPrint={forPrint}
        />
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
    forPrint: isPrint,
  };

  if (isPrint) {
    return (
      <div className={`labels-container ${className}`}>
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="print-page">
            <LabelRow row={row} rowIdx={rowIdx} {...rowProps} />
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
            <LabelRow row={row} rowIdx={rowIdx} {...rowProps} />
          </div>
        ))}
    </div>
  );
};
