import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileJson, TrendingUp } from 'lucide-react';

interface ExportInventoryProps {
  onExportExcel: () => void;
  onExportJson: () => void;
  onExportSales: () => void;
}

export const ExportInventory: React.FC<ExportInventoryProps> = ({ onExportExcel, onExportJson, onExportSales }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="export-dropdown" ref={ref}>
      <button className="btn btn--outline" onClick={() => setOpen((v) => !v)}>
        <Download size={15} /> Export / Backup
      </button>
      {open && (
        <div className="export-dropdown__menu">
          <button onClick={() => { onExportExcel(); setOpen(false); }}>
            <FileSpreadsheet size={15} /> Inventory Excel
          </button>
          <button onClick={() => { onExportSales(); setOpen(false); }}>
            <TrendingUp size={15} /> Sales Excel
          </button>
          <button onClick={() => { onExportJson(); setOpen(false); }}>
            <FileJson size={15} /> Full Backup (JSON)
          </button>
        </div>
      )}
    </div>
  );
};
