import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/products';
import { getCategories } from '../api/categories';
import { useDebounce } from '../hooks/useDebounce';
import type { Product, ProductFilters } from '../types';
import Navbar from '../components/Navbar';
import ProductForm from '../components/ProductForm';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import BulkProductUpload from '../components/BulkProductUpload';
import {
  Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2,
  RefreshCw, PackageOpen, X, Upload, ChevronUp, ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';

const PAGE_SIZE = 10;

// Columns that support server-side ordering
type SortField = 'name' | 'price' | 'stock' | 'created_at';

function toOrdering(field: SortField, dir: 'asc' | 'desc') {
  return dir === 'asc' ? field : `-${field}`;
}

function SortIcon({ field, ordering }: { field: SortField; ordering: string }) {
  const active = ordering === field || ordering === `-${field}`;
  const asc = ordering === field;
  if (!active) return <ChevronsUpDown size={13} className="text-slate-400 ml-1 inline-block" />;
  return asc
    ? <ChevronUp size={13} className="text-blue-600 ml-1 inline-block" />
    : <ChevronDown size={13} className="text-blue-600 ml-1 inline-block" />;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// Build a stable pagination sequence: always show first, last, current-1, current, current+1
// with '…' gaps. Never changes length when navigating within the middle.
function buildPages(total: number, current: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current - 1, current, current + 1].filter(n => n >= 1 && n <= total));
  const sorted = Array.from(set).sort((a, b) => a - b);
  const result: (number | '…')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
    result.push(sorted[i]);
  }
  return result;
}

export default function ProductsPage({ readOnly = false }: { readOnly?: boolean }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [ordering, setOrdering] = useState('name');
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const filters: ProductFilters = {
    search: debouncedSearch || undefined,
    category: categoryFilter || undefined,
    ordering,
    page,
    page_size: PAGE_SIZE,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => getProducts(filters),
    placeholderData: (prev) => prev,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleCategoryChange = (v: number | '') => { setCategoryFilter(v); setPage(1); };
  const clearSearch = () => { setSearch(''); setPage(1); };
  const clearCategory = () => { setCategoryFilter(''); setPage(1); };

  // Column header sort: clicking the same column toggles asc/desc
  const handleSort = (field: SortField) => {
    const currentDir = ordering === field ? 'asc' : ordering === `-${field}` ? 'desc' : null;
    const nextDir = currentDir === 'asc' ? 'desc' : 'asc';
    setOrdering(toOrdering(field, nextDir));
    setPage(1);
  };

  const thClass = (field: SortField) => {
    const active = ordering === field || ordering === `-${field}`;
    return `px-4 py-3 text-left font-semibold select-none cursor-pointer transition ${
      active ? 'text-blue-600' : 'text-slate-600 hover:text-slate-800'
    }`;
  };

  const activeCategoryName = categoryFilter
    ? categories.find(c => c.id === categoryFilter)
    : null;

  const hasActiveFilter = !!categoryFilter;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Products</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {data ? `${data.count} item${data.count !== 1 ? 's' : ''} total` : 'Loading…'}
            </p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg transition shadow-sm text-sm"
              >
                <Upload size={16} />
                Import CSV
              </button>
              <button
                onClick={() => setEditingProduct(null)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-sm"
              >
                <Plus size={18} />
                Add Product
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, description or category…"
              className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {search && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category filter — entire area is clickable via <label> wrapping the select */}
          <label
            className={`relative sm:w-52 flex items-center gap-2 pl-3 pr-3 py-2 border rounded-lg cursor-pointer transition ${
              hasActiveFilter
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <Search size={0} className="hidden" />
            {/* Filter funnel icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 ${hasActiveFilter ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value === '' ? '' : Number(e.target.value))}
              className={`flex-1 bg-transparent text-sm focus:outline-none appearance-none cursor-pointer ${
                hasActiveFilter ? 'text-blue-700 font-medium' : 'text-slate-800'
              }`}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); clearCategory(); }}
                className="shrink-0 text-blue-400 hover:text-blue-700 transition"
                aria-label="Clear category filter"
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>

        {/* Active filter pill */}
        {hasActiveFilter && activeCategoryName && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-500">Filtered by:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
              {activeCategoryName.code} · {activeCategoryName.name}
              <button onClick={clearCategory} className="hover:text-blue-900 transition" aria-label="Remove filter">
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-slate-500">Failed to load products.</p>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className={thClass('name')} onClick={() => handleSort('name')}>
                        Name <SortIcon field="name" ordering={ordering} />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                      <th className={`${thClass('price')} text-right`} onClick={() => handleSort('price')}>
                        Price (AED) <SortIcon field="price" ordering={ordering} />
                      </th>
                      <th className={`${thClass('stock')} text-right`} onClick={() => handleSort('stock')}>
                        Stock <SortIcon field="stock" ordering={ordering} />
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                      <th
                        className={`${thClass('created_at')} hidden md:table-cell`}
                        onClick={() => handleSort('created_at')}
                      >
                        Added <SortIcon field="created_at" ordering={ordering} />
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      [...Array(PAGE_SIZE)].map((_, i) => <SkeletonRow key={i} />)
                    ) : data?.results.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <PackageOpen size={40} />
                            <p className="font-medium text-slate-500">No products found</p>
                            <p className="text-xs">
                              {search || categoryFilter
                                ? 'Try adjusting your search or filter.'
                                : 'Add your first product to get started.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data?.results.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800 max-w-[220px] truncate" title={product.name}>
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-xs text-slate-400 truncate max-w-[220px]" title={product.description}>
                                {product.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                              <span className="font-mono">{product.category_code}</span>
                              <span className="text-blue-400">·</span>
                              {product.category_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">
                            {parseFloat(product.price).toLocaleString('en-AE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={product.stock === 0 ? 'text-red-500 font-semibold' : 'text-slate-700'}>
                              {product.stock.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge isActive={product.is_active} />
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                            {new Date(product.created_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3">
                            {readOnly ? (
                              <span className="text-xs text-slate-300 px-2">—</span>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setEditingProduct(product)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Edit product"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => setDeletingProduct(product)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete product"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.count > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <p className="text-xs text-slate-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.count)} of{' '}
                    {data.count}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {buildPages(totalPages, page).map((p, i) =>
                      p === '…' ? (
                        <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-sm">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                            page === p
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      {editingProduct !== undefined && (
        <ProductForm
          product={editingProduct}
          onClose={() => setEditingProduct(undefined)}
        />
      )}
      {deletingProduct && (
        <DeleteConfirmDialog
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
        />
      )}
      {showBulkUpload && (
        <BulkProductUpload
          onClose={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  );
}
