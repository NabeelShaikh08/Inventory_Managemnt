import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Plus, Trash2 } from 'lucide-react';
import { getProducts } from '../api/products';
import { getCategories } from '../api/categories';
import { createRequest } from '../api/requests';
import type { LineAction, RequestLineInput } from '../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface LineFormState {
  action: LineAction;
  product_id: string;
  quantity: string;
  unit_cost: string;
  supplier: string;
  proposed_name: string;
  proposed_price: string;
  proposed_stock: string;
  proposed_category_id: string;
  proposed_description: string;
}

function emptyLine(): LineFormState {
  return {
    action: 'stock_in',
    product_id: '',
    quantity: '',
    unit_cost: '',
    supplier: '',
    proposed_name: '',
    proposed_price: '',
    proposed_stock: '',
    proposed_category_id: '',
    proposed_description: '',
  };
}

export default function StockRequestForm({ onClose, onSuccess }: Props) {
  const [documentRef, setDocumentRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<LineFormState[]>([emptyLine()]);
  const [serverError, setServerError] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const parsedLines: RequestLineInput[] = lines.map((l) => {
      const base: RequestLineInput = { action: l.action };
      if (l.product_id) base.product = Number(l.product_id);
      if (l.action === 'stock_in') {
        if (l.quantity) base.quantity = l.quantity;
        if (l.unit_cost) base.unit_cost = l.unit_cost;
        if (l.supplier) base.supplier = l.supplier;
      } else {
        if (l.proposed_name) base.proposed_name = l.proposed_name;
        if (l.proposed_price) base.proposed_price = l.proposed_price;
        if (l.proposed_stock) base.proposed_stock = Number(l.proposed_stock);
        if (l.proposed_category_id) base.proposed_category = Number(l.proposed_category_id);
        if (l.proposed_description) base.proposed_description = l.proposed_description;
      }
      return base;
    });
    mutation.mutate({ document_ref: documentRef, remarks, lines: parsedLines });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">New Stock Request</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
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

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">Request Lines</h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-1.5 text-sm text-[#ED7E07] hover:text-[#d06d06] font-medium"
                >
                  <Plus size={15} />
                  Add Line
                </button>
              </div>

              <div className="space-y-4">
                {lines.map((line, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Line {idx + 1}
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              disabled={mutation.isPending}
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
