import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileJson, TrendingUp, Upload } from 'lucide-react';

interface ExportInventoryProps {
  onExportExcel: () => void;
  onExportJson: () => void;
  onRestoreJson: (backup: unknown) => { success: boolean; error?: string };
  onExportSales: () => void;
}

export const ExportInventory: React.FC<ExportInventoryProps> = ({ onExportExcel, onExportJson, onRestoreJson, onExportSales }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleRestoreFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result || ''));
        const confirmed = window.confirm(
          'Restore this full backup? This replaces all current products, sales history, and pending stock in this browser and then syncs the restored data.',
        );
        if (!confirmed) return;

        const result = onRestoreJson(backup);
        if (result.success) {
          window.alert('Backup restored successfully.');
          setOpen(false);
        } else {
          window.alert(result.error || 'Could not restore backup.');
        }
      } catch {
        window.alert('Could not read this JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="export-dropdown" ref={ref}>
      <button className="btn btn--outline" onClick={() => setOpen((v) => !v)}>
        <Download size={15} /> Export / Backup
      </button>
      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleRestoreFile}
      />
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
          <button onClick={() => restoreInputRef.current?.click()}>
            <Upload size={15} /> Restore Full Backup
          </button>
        </div>
      )}
    </div>
  );
};
