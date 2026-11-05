import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, FileText, Sparkles, X } from 'lucide-react';
import { parseCSV, ParseResult } from '../utils/csvParser';
import { SAMPLE_SALES_CSV } from '../utils/sampleData';
import { SalesOrderRow } from '../types';

interface CsvUploaderProps {
  onDataLoaded: (data: SalesOrderRow[], filename?: string) => void;
  currentFilename?: string;
  rowCount: number;
}

const REQUIRED_COLUMNS = ['quarter', 'region', 'channel', 'product', 'units', 'discount_pct', 'revenue'];

export const CsvUploader: React.FC<CsvUploaderProps> = ({
  onDataLoaded,
  currentFilename,
  rowCount
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pastedContent, setPastedContent] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processText = (text: string, filename?: string) => {
    setErrorMessage(null);
    setWarnings([]);

    const result: ParseResult = parseCSV(text);

    if (result.missingColumns.length > 0) {
      setErrorMessage(`CSV is missing required columns: ${result.missingColumns.join(', ')}. Please ensure columns: ${REQUIRED_COLUMNS.join(', ')} are present.`);
      return;
    }

    if (result.data.length === 0) {
      setErrorMessage('No valid sales order rows found in the CSV. Please check formatting.');
      return;
    }

    if (result.warnings.length > 0) {
      setWarnings(result.warnings);
    }

    onDataLoaded(result.data, filename || 'Uploaded Sales Orders');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processText(text, file.name);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the selected file.');
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      setErrorMessage('Please upload a valid .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processText(text, file.name);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read dropped file.');
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    processText(SAMPLE_SALES_CSV, 'Sample Global Sales Orders (Q1-Q4)');
  };

  const handlePasteSubmit = () => {
    if (!pastedContent.trim()) {
      setErrorMessage('Pasted content is empty.');
      return;
    }
    processText(pastedContent, 'Pasted Sales Orders CSV');
    setIsPasteModalOpen(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            Upload Sales Orders CSV
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Expected columns: <span className="text-indigo-300 font-mono">quarter, region, channel, product, units, discount_pct, revenue</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Sample Dataset
          </button>
          <button
            onClick={() => {
              setPastedContent(SAMPLE_SALES_CSV);
              setIsPasteModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Paste CSV
          </button>
        </div>
      </div>

      {/* Dropzone Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-400 bg-indigo-950/30 ring-2 ring-indigo-500/20'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm text-slate-200 font-medium">
            <span className="text-indigo-400 hover:underline">Click to browse file</span> or drag & drop CSV here
          </div>
          <p className="text-[11px] text-slate-500">
            Supports UTF-8 CSV with headers. Quotes, commas, and dollar signs are automatically cleaned.
          </p>
        </div>
      </div>

      {/* Status & Detected Columns Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-medium mr-1">Required Headers:</span>
          {REQUIRED_COLUMNS.map(col => (
            <span
              key={col}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700 flex items-center gap-1"
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              {col}
            </span>
          ))}
        </div>

        {currentFilename && (
          <div className="flex items-center gap-2 text-slate-400">
            <span>Active file:</span>
            <span className="text-indigo-300 font-medium truncate max-w-xs">{currentFilename}</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-200 font-mono">
              {rowCount.toLocaleString()} orders loaded
            </span>
          </div>
        )}
      </div>

      {/* Error / Warning alerts */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 text-amber-300 text-xs space-y-1">
          {warnings.map((w, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Paste CSV Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-slate-100">Paste CSV Sales Data</h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste comma-separated rows with columns: <code className="text-indigo-300">quarter, region, channel, product, units, discount_pct, revenue</code>
            </p>

            <textarea
              rows={12}
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              placeholder="quarter,region,channel,product,units,discount_pct,revenue&#10;Q2,EMEA,Direct,Cloud AI,150,10,300000..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm"
              >
                Parse & Load Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
