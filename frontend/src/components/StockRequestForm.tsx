import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Plus, Trash2, Upload, FileText, AlertCircle } from 'lucide-react';
import { getProducts } from '../api/products';
import { getCategories } from '../api/categories';
import { createRequest } from '../api/requests';
import type { LineAction, RequestLine, RequestLineInput } from '../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  prefillLines?: RequestLine[];
  prefillDocRef?: string;
}

const UOM_OPTIONS = ['BAG','BOX','KG','L','LENGTH','M','M2','M3','PAIL','PAIR','PCS','ROLL','SET','SHEET','TON','TUBE'] as const;
const WAREHOUSE_CODE = 'MAIN-WH';

interface LineFormState {
  action: LineAction;
  product_id: string;
  quantity: string;
  unit_cost: string;
  supplier: string;
  uom: string;
  proposed_name: string;
  proposed_price: string;
  proposed_stock: string;
  proposed_category_id: string;
  proposed_description: string;
  proposed_uom: string;
  subcategory: string;
  proposed_subcategory: string;
  min_stock: string;
  proposed_min_stock: string;
  reorder_level: string;
  proposed_reorder_level: string;
  barcode: string;
}

interface CsvRow {
  rowNum: number;
  action: string;
  product_name: string;
  quantity: string;
  unit_cost: string;
  supplier: string;
  uom: string;
  proposed_name: string;
  proposed_price: string;
  proposed_stock: string;
  category: string;
  description: string;
  subcategory: string;
  min_stock: string;
  reorder_level: string;
  barcode: string;
  error?: string;
}

function emptyLine(): LineFormState {
  return {
    action: 'stock_in',
    product_id: '',
    quantity: '',
    unit_cost: '',
    supplier: '',
    uom: '',
    proposed_name: '',
    proposed_price: '',
    proposed_stock: '',
    proposed_category_id: '',
    proposed_description: '',
    proposed_uom: '',
    subcategory: '',
    proposed_subcategory: '',
    min_stock: '',
    proposed_min_stock: '',
    reorder_level: '',
    proposed_reorder_level: '',
    barcode: '',
  };
}


function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    rows.push({
      rowNum: i,
      action: cols[0] || '',
      product_name: cols[1] || '',
      quantity: cols[2] || '',
      unit_cost: cols[3] || '',
      supplier: cols[4] || '',
      uom: cols[5] || '',
      proposed_name: cols[6] || '',
      proposed_price: cols[7] || '',
      proposed_stock: cols[8] || '',
      category: cols[9] || '',
      description: cols[10] || '',
      subcategory: cols[11] || '',
      min_stock: cols[12] || '',
      reorder_level: cols[13] || '',
      barcode: cols[14] || '',
    });
  }
  return rows;
}

function validateRows(rows: CsvRow[]): CsvRow[] {
  return rows.map((r) => {
    const validActions = ['stock_in', 'new_product', 'edit_product'];
    if (!validActions.includes(r.action)) {
      return { ...r, error: `Invalid action "${r.action}"` };
    }
    if (r.action === 'stock_in' && !r.product_name) {
      return { ...r, error: 'stock_in requires product_name' };
    }
    if (r.action === 'new_product' && !r.proposed_name) {
      return { ...r, error: 'new_product requires proposed_name' };
    }
    if (r.action === 'edit_product' && !r.product_name) {
      return { ...r, error: 'edit_product requires product_name' };
    }
    return r;
  });
}

function lineFromRequestLine(rl: RequestLine): LineFormState {
  return {
    action: rl.action,
    product_id: rl.product != null ? String(rl.product) : '',
    quantity: rl.quantity ?? '',
    unit_cost: rl.unit_cost ?? '',
    supplier: rl.supplier ?? '',
    uom: rl.uom ?? '',
    proposed_name: rl.proposed_name ?? '',
    proposed_price: rl.proposed_price ?? '',
    proposed_stock: rl.proposed_stock != null ? String(rl.proposed_stock) : '',
    proposed_category_id: rl.proposed_category != null ? String(rl.proposed_category) : '',
    proposed_description: rl.proposed_description ?? '',
    proposed_uom: rl.proposed_uom ?? '',
    subcategory: rl.subcategory ?? '',
    proposed_subcategory: rl.proposed_subcategory ?? '',
    min_stock: rl.min_stock != null ? String(rl.min_stock) : '',
    proposed_min_stock: rl.proposed_min_stock != null ? String(rl.proposed_min_stock) : '',
    reorder_level: rl.reorder_level != null ? String(rl.reorder_level) : '',
    proposed_reorder_level: rl.proposed_reorder_level != null ? String(rl.proposed_reorder_level) : '',
    barcode: rl.barcode ?? '',
  };
}

export default function StockRequestForm({ onClose, onSuccess, prefillLines, prefillDocRef }: Props) {
  const [tab, setTab] = useState<'manual' | 'csv'>('manual');
  const [documentRef, setDocumentRef] = useState(prefillDocRef ?? '');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<LineFormState[]>(
    prefillLines && prefillLines.length > 0
      ? prefillLines.map(lineFromRequestLine)
      : [emptyLine()]
  );
  const [serverError, setServerError] = useState('');

  // CSV state
  const [csvText, setCsvText] = useState('');
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvParsed, setCsvParsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [] } = useQuery({
    queryKey: ['products', { page: 1, page_size: 200 }],
    queryFn: () => getProducts({ page: 1, page_size: 200 }),
    select: (d) => d.results,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const mutation = useMutation({
    mutationFn: createRequest,
    onSuccess,
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to submit request. Please check your inputs.';
      setServerError(msg);
    },
  });

  const updateLine = (idx: number, field: keyof LineFormState, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const buildLines = (manualLines: LineFormState[]): RequestLineInput[] =>
    manualLines.map((l) => {
      const base: RequestLineInput = { action: l.action, warehouse_code: WAREHOUSE_CODE };
      if (l.product_id) base.product = Number(l.product_id);
      if (l.action === 'stock_in') {
        if (l.quantity) base.quantity = l.quantity;
        if (l.unit_cost) base.unit_cost = l.unit_cost;
        if (l.supplier) base.supplier = l.supplier;
        if (l.uom) base.uom = l.uom;
      } else {
        if (l.proposed_name) base.proposed_name = l.proposed_name;
        if (l.proposed_price) base.proposed_price = l.proposed_price;
        if (l.proposed_stock) base.proposed_stock = Number(l.proposed_stock);
        if (l.proposed_category_id) base.proposed_category = Number(l.proposed_category_id);
        if (l.proposed_description) base.proposed_description = l.proposed_description;
        if (l.proposed_uom) base.proposed_uom = l.proposed_uom;
        if (l.proposed_subcategory) base.proposed_subcategory = l.proposed_subcategory;
        if (l.proposed_min_stock) base.proposed_min_stock = Number(l.proposed_min_stock);
        if (l.proposed_reorder_level) base.proposed_reorder_level = Number(l.proposed_reorder_level);
      }
      if (l.barcode) base.barcode = l.barcode;
      return base;
    });

  const buildLinesFromCsv = (rows: CsvRow[]): RequestLineInput[] =>
    rows.map((r) => {
      const matchedProduct = products.find(
        (p) => p.name.toLowerCase() === r.product_name.toLowerCase()
      );
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase() === r.category.toLowerCase()
      );
      const base: RequestLineInput = { action: r.action as LineAction, warehouse_code: WAREHOUSE_CODE };
      if (matchedProduct) base.product = matchedProduct.id;
      if (r.action === 'stock_in') {
        if (r.quantity) base.quantity = r.quantity;
        if (r.unit_cost) base.unit_cost = r.unit_cost;
        if (r.supplier) base.supplier = r.supplier;
        if (r.uom) base.uom = r.uom;
      } else {
        if (r.proposed_name) base.proposed_name = r.proposed_name;
        if (r.proposed_price) base.proposed_price = r.proposed_price;
        if (r.proposed_stock) base.proposed_stock = Number(r.proposed_stock);
        if (matchedCategory) base.proposed_category = matchedCategory.id;
        if (r.description) base.proposed_description = r.description;
        if (r.subcategory) base.proposed_subcategory = r.subcategory;
        if (r.min_stock) base.proposed_min_stock = Number(r.min_stock);
        if (r.reorder_level) base.proposed_reorder_level = Number(r.reorder_level);
      }
      if (r.barcode) base.barcode = r.barcode;
      return base;
    });

  const handleParseCsv = () => {
    const rows = validateRows(parseCsv(csvText));
    setCsvRows(rows);
    setCsvParsed(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setCsvParsed(false);
      setCsvRows([]);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    let parsedLines: RequestLineInput[];
    if (tab === 'csv') {
      if (!csvParsed || csvRows.length === 0) {
        setServerError('Please parse the CSV first.');
        return;
      }
      const hasErrors = csvRows.some((r) => r.error);
      if (hasErrors) {
        setServerError('Fix the CSV errors before submitting.');
        return;
      }
      parsedLines = buildLinesFromCsv(csvRows);
    } else {
      parsedLines = buildLines(lines);
    }
    mutation.mutate({ document_ref: documentRef, remarks, lines: parsedLines });
  };

  const hasErrors = csvRows.some((r) => r.error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">
            {prefillLines ? 'Re-submit Request' : 'New Inventory Upload'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 px-4 sm:px-6 gap-1 pt-2">
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition ${
              tab === 'manual'
                ? 'border-[#ED7E07] text-[#ED7E07]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={14} />
            Manual
          </button>
          <button
            type="button"
            onClick={() => setTab('csv')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition ${
              tab === 'csv'
                ? 'border-[#ED7E07] text-[#ED7E07]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload size={14} />
            Bulk CSV
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {/* Common header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Document Ref <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={documentRef}
                  onChange={(e) => setDocumentRef(e.target.value)}
                  placeholder="e.g. PO-2026-001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Remarks <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any notes for the checker"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>
            </div>

            {/* Manual tab */}
            {tab === 'manual' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-700">Articles</h3>
                  <button
                    type="button"
                    onClick={addLine}
                    className="flex items-center gap-1.5 text-sm text-[#ED7E07] hover:text-[#d06d06] font-medium"
                  >
                    <Plus size={15} />
                    Add Article
                  </button>
                </div>

                <div className="space-y-4">
                  {lines.map((line, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Article {idx + 1}
                        </span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
                        <select
                          value={line.action}
                          onChange={(e) => updateLine(idx, 'action', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                        >
                          <option value="stock_in">Stock In</option>
                          <option value="new_product">New Product</option>
                          <option value="edit_product">Edit Product</option>
                        </select>
                      </div>

                      {(line.action === 'stock_in' || line.action === 'edit_product') && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
                          <select
                            value={line.product_id}
                            onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                          >
                            <option value="">Select product…</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.category_code}] {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {line.action === 'stock_in' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                UOM <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={line.uom}
                                onChange={(e) => updateLine(idx, 'uom', e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                              >
                                <option value="">Select UOM…</option>
                                {UOM_OPTIONS.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={line.quantity}
                                onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                required
                                placeholder="0"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Unit Cost (AED)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unit_cost}
                                onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Supplier</label>
                              <input
                                type="text"
                                value={line.supplier}
                                onChange={(e) => updateLine(idx, 'supplier', e.target.value)}
                                placeholder="Supplier name"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Warehouse</label>
                              <input
                                type="text"
                                value={WAREHOUSE_CODE}
                                readOnly
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Barcode / QR <span className="text-slate-400 font-normal">(optional)</span></label>
                              <input
                                type="text"
                                value={line.barcode}
                                onChange={(e) => updateLine(idx, 'barcode', e.target.value)}
                                placeholder="Barcode or QR code"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {(line.action === 'new_product' || line.action === 'edit_product') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              {line.action === 'new_product' ? 'Product Name *' : 'New Name (optional)'}
                            </label>
                            <input
                              type="text"
                              value={line.proposed_name}
                              onChange={(e) => updateLine(idx, 'proposed_name', e.target.value)}
                              required={line.action === 'new_product'}
                              placeholder="Product name"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              UOM <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={line.proposed_uom}
                              onChange={(e) => updateLine(idx, 'proposed_uom', e.target.value)}
                              required={line.action === 'new_product'}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                            >
                              <option value="">Select UOM…</option>
                              {UOM_OPTIONS.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Price (AED)</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={line.proposed_price}
                              onChange={(e) => updateLine(idx, 'proposed_price', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Initial Stock</label>
                            <input
                              type="number"
                              min="0"
                              value={line.proposed_stock}
                              onChange={(e) => updateLine(idx, 'proposed_stock', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                            <select
                              value={line.proposed_category_id}
                              onChange={(e) => updateLine(idx, 'proposed_category_id', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                            >
                              <option value="">Select category…</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Subcategory <span className="text-slate-400 font-normal">(optional)</span></label>
                            <input
                              type="text"
                              value={line.proposed_subcategory}
                              onChange={(e) => updateLine(idx, 'proposed_subcategory', e.target.value)}
                              placeholder="e.g. Structural Steel"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Min Stock <span className="text-slate-400 font-normal">(optional)</span></label>
                            <input
                              type="number"
                              min="0"
                              value={line.proposed_min_stock}
                              onChange={(e) => updateLine(idx, 'proposed_min_stock', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Reorder Level <span className="text-slate-400 font-normal">(optional)</span></label>
                            <input
                              type="number"
                              min="0"
                              value={line.proposed_reorder_level}
                              onChange={(e) => updateLine(idx, 'proposed_reorder_level', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Barcode / QR <span className="text-slate-400 font-normal">(optional)</span></label>
                            <input
                              type="text"
                              value={line.barcode}
                              onChange={(e) => updateLine(idx, 'barcode', e.target.value)}
                              placeholder="Barcode or QR code"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Warehouse</label>
                            <input
                              type="text"
                              value={WAREHOUSE_CODE}
                              readOnly
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                            />
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                            <textarea
                              value={line.proposed_description}
                              onChange={(e) => updateLine(idx, 'proposed_description', e.target.value)}
                              rows={2}
                              placeholder="Optional description"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CSV tab */}
            {tab === 'csv' && (
              <div className="space-y-4">
                {/* Template download hint */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">CSV Format</p>
                    <p className="text-xs text-blue-600">
                      Columns: <code className="font-mono">action, product_name, quantity, unit_cost, supplier, uom, proposed_name, proposed_price, proposed_stock, category, description, subcategory, min_stock, reorder_level, barcode</code>
                    </p>
                    <p className="text-xs text-blue-600">
                      Valid actions: <code className="font-mono">stock_in</code>, <code className="font-mono">new_product</code>, <code className="font-mono">edit_product</code>
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

                {/* File upload */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="block text-sm font-medium text-slate-700">Upload or paste CSV</label>
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
                    onChange={(e) => { setCsvText(e.target.value); setCsvParsed(false); setCsvRows([]); }}
                    rows={6}
                    placeholder={`action,product_name,quantity,unit_cost,supplier,uom,...\nstock_in,Portland Cement OPC 42.5R,100,25.00,Al Fara,BAG,...`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleParseCsv}
                  disabled={!csvText.trim()}
                  className="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition"
                >
                  Parse &amp; Preview
                </button>

                {/* Preview table */}
                {csvParsed && csvRows.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      {csvRows.length} row{csvRows.length !== 1 ? 's' : ''} parsed
                      {hasErrors && (
                        <span className="ml-2 text-red-500 font-normal">— fix errors before submitting</span>
                      )}
                    </p>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-500 font-medium">#</th>
                            <th className="px-3 py-2 text-left text-slate-500 font-medium">Action</th>
                            <th className="px-3 py-2 text-left text-slate-500 font-medium">Product / Name</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-medium">Qty</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-medium">Price</th>
                            <th className="px-3 py-2 text-left text-slate-500 font-medium">Category</th>
                            <th className="px-3 py-2 text-left text-slate-500 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {csvRows.map((row) => (
                            <tr key={row.rowNum} className={row.error ? 'bg-red-50' : 'bg-white'}>
                              <td className="px-3 py-2 text-slate-400">{row.rowNum}</td>
                              <td className="px-3 py-2 font-mono text-slate-700">{row.action}</td>
                              <td className="px-3 py-2 text-slate-700 max-w-[140px] truncate">
                                {row.product_name || row.proposed_name || '—'}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-600">{row.quantity || '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-600">
                                {row.proposed_price ? `AED ${row.proposed_price}` : row.unit_cost ? `AED ${row.unit_cost}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{row.category || '—'}</td>
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

                {csvParsed && csvRows.length === 0 && (
                  <p className="text-sm text-slate-400">No data rows found. Make sure the CSV has a header row and at least one data row.</p>
                )}
              </div>
            )}

            {serverError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {serverError}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || (tab === 'csv' && (!csvParsed || hasErrors || csvRows.length === 0))}
              className="px-6 py-2.5 bg-[#ED7E07] hover:bg-[#d06d06] disabled:bg-orange-300 text-white font-semibold rounded-lg transition"
            >
              {mutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
