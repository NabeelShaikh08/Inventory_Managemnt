import { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createProduct } from '../api/products';
import { getCategories } from '../api/categories';
import type { ProductFormData } from '../types';

interface Props {
  onClose: () => void;
}

interface CsvRow {
  rowNum: number;
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  is_active: string;
  error?: string;
  done?: boolean;
}

const ADMIN_CSV_COLUMNS = 'name,description,price,stock,category,is_active';

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  return lines.slice(1).map((line, idx) => {
    const cols = line.split(',').map((c) => c.trim());
    return {
      rowNum: idx + 1,
      name: cols[0] || '',
      description: cols[1] || '',
      price: cols[2] || '',
      stock: cols[3] || '',
      category: cols[4] || '',
      is_active: cols[5] || 'true',
    };
  });
}

function validateRows(rows: CsvRow[]): CsvRow[] {
  return rows.map((r) => {
    if (!r.name) return { ...r, error: 'Name is required' };
    if (!r.price || isNaN(parseFloat(r.price)) || parseFloat(r.price) <= 0)
      return { ...r, error: 'Price must be > 0' };
    if (r.stock !== '' && (isNaN(parseInt(r.stock)) || parseInt(r.stock) < 0))
      return { ...r, error: 'Stock must be ≥ 0' };
    if (!r.category) return { ...r, error: 'Category is required' };
    return r;
  });
}

export default function BulkProductUpload({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [parsed, setParsed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<CsvRow[]>([]);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const createMut = useMutation({ mutationFn: createProduct });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setParsed(false);
      setRows([]);
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    const parsed = validateRows(parseCsv(csvText));
    setRows(parsed);
    setParsed(true);
  };

  const handleImport = async () => {
    setImporting(true);
    const results: CsvRow[] = [];
    for (const row of rows) {
      if (row.error) {
        results.push(row);
        continue;
      }
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === row.category.toLowerCase()
      );
      if (!matchedCat) {
        results.push({ ...row, error: `Category "${row.category}" not found` });
        continue;
      }
      const payload: ProductFormData = {
        name: row.name,
        description: row.description,
        price: row.price,
        stock: parseInt(row.stock) || 0,
        category: matchedCat.id,
        is_active: row.is_active.toLowerCase() !== 'false',
      };
      try {
        await createMut.mutateAsync(payload);
        results.push({ ...row, done: true });
      } catch {
        results.push({ ...row, error: 'API error — check name/price uniqueness' });
      }
    }
    setImportResults(results);
    setDone(true);
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const hasErrors = rows.some((r) => r.error);
  const successCount = importResults.filter((r) => r.done).length;
  const failCount = importResults.filter((r) => r.error).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Bulk Product Import (CSV)</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {!done ? (
            <>
              {/* Format hint */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">CSV Format (Admin Direct Import)</p>
                  <p className="text-xs text-blue-600">
                    Columns: <code className="font-mono">{ADMIN_CSV_COLUMNS}</code>
                  </p>
                  <p className="text-xs text-blue-600">
                    <code className="font-mono">is_active</code>: <code className="font-mono">true</code> or <code className="font-mono">false</code> (defaults to true)
                  </p>
                  <a
                    href="/inventory_upload_template.csv"
                    download="inventory_upload_template.csv"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                  >
                    Download template CSV
                  </a>
                </div>
              </div>

              {/* File + paste */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <label className="text-sm font-medium text-slate-700">Upload or paste CSV</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition text-slate-600"
                  >
                    <Upload size={13} />
                    Choose file
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                <textarea
                  value={csvText}
                  onChange={(e) => { setCsvText(e.target.value); setParsed(false); setRows([]); }}
                  rows={6}
                  placeholder={`name,description,price,stock,category,is_active\nPortland Cement OPC 42.5R,Standard grade cement,28.50,500,Cement & Concrete,true`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleParse}
                disabled={!csvText.trim()}
                className="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition"
              >
                Parse &amp; Preview
              </button>

              {/* Preview table */}
              {parsed && rows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    {rows.length} row{rows.length !== 1 ? 's' : ''} parsed
                    {hasErrors && (
                      <span className="ml-2 text-red-500 font-normal">— fix errors before importing</span>
                    )}
                  </p>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">#</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Name</th>
                          <th className="px-3 py-2 text-right text-slate-500 font-medium">Price</th>
                          <th className="px-3 py-2 text-right text-slate-500 font-medium">Stock</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Category</th>
                          <th className="px-3 py-2 text-center text-slate-500 font-medium">Active</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((row) => (
                          <tr key={row.rowNum} className={row.error ? 'bg-red-50' : 'bg-white'}>
                            <td className="px-3 py-2 text-slate-400">{row.rowNum}</td>
                            <td className="px-3 py-2 text-slate-700 max-w-[140px] truncate">{row.name || '—'}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{row.price ? `AED ${row.price}` : '—'}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{row.stock || '0'}</td>
                            <td className="px-3 py-2 text-slate-600">{row.category || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={row.is_active.toLowerCase() === 'false' ? 'text-slate-400' : 'text-green-600'}>
                                {row.is_active.toLowerCase() === 'false' ? 'No' : 'Yes'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {row.error ? (
                                <span className="text-red-500 font-medium">{row.error}</span>
                              ) : (
                                <span className="text-green-600 font-medium">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {parsed && rows.length === 0 && (
                <p className="text-sm text-slate-400">No data rows found.</p>
              )}
            </>
          ) : (
            /* Import results */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-500" />
                <p className="text-sm font-medium text-slate-700">
                  Import complete — {successCount} succeeded, {failCount} failed
                </p>
              </div>
              {failCount > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">#</th>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Name</th>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importResults.map((row) => (
                        <tr key={row.rowNum} className={row.error ? 'bg-red-50' : 'bg-white'}>
                          <td className="px-3 py-2 text-slate-400">{row.rowNum}</td>
                          <td className="px-3 py-2 text-slate-700">{row.name}</td>
                          <td className="px-3 py-2">
                            {row.error ? (
                              <span className="text-red-500 font-medium">{row.error}</span>
                            ) : (
                              <span className="text-green-600 font-medium">Imported</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && (
            <button
              type="button"
              onClick={handleImport}
              disabled={!parsed || hasErrors || rows.length === 0 || importing}
              className="px-6 py-2.5 bg-[#ED7E07] hover:bg-[#d06d06] disabled:bg-orange-300 text-white font-semibold rounded-lg transition"
            >
              {importing ? 'Importing…' : `Import ${rows.filter((r) => !r.error).length} Products`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
