import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/products';
import { getCategories } from '../api/categories';
import { useDebounce } from '../hooks/useDebounce';
import type { Product, ProductFilters } from '../types';
import Navbar from '../components/Navbar';
import ProductForm from '../components/ProductForm';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import {
  Plus, Search, ChevronLeft, ChevronRight, Pencil, Trash2,
  RefreshCw, PackageOpen, Filter,
} from 'lucide-react';

const PAGE_SIZE = 10;

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

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const filters: ProductFilters = {
    search: debouncedSearch || undefined,
    category: categoryFilter || undefined,
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

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleCategoryChange = (v: number | '') => {
    setCategoryFilter(v);
    setPage(1);
  };

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
          <button
            onClick={() => setEditingProduct(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-sm"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, description or category…"
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="relative sm:w-56">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

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
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Price (AED)</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Stock</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden md:table-cell">Added</th>
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
                        <tr
                          key={product.id}
                          className="hover:bg-slate-50 transition"
                        >
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

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '...' ? (
                          <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
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
    </div>
  );
}
