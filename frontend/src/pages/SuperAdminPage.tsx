import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Eye, ChevronLeft, ChevronRight, PackageOpen, RefreshCw, Package, ClipboardList } from 'lucide-react';
import Navbar from '../components/Navbar';
import StockRequestDetail from '../components/StockRequestDetail';
import { listRequests } from '../api/requests';
import { getProducts } from '../api/products';
import type { StockRequest, RequestStatus } from '../types';

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    partially_approved: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-600',
    withdrawn: 'bg-slate-100 text-slate-500',
  };
  const labels: Record<RequestStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    partially_approved: 'Partial',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function SuperAdminPage() {
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'inventory'>('requests');
  const navigate = useNavigate();

  const { data: requestsData, isLoading: reqLoading, isError: reqError, refetch: reqRefetch } = useQuery({
    queryKey: ['requests', page],
    queryFn: () => listRequests({ page }),
    placeholderData: (prev) => prev,
    enabled: activeTab === 'requests',
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', { page: 1, page_size: 1 }],
    queryFn: () => getProducts({ page: 1, page_size: 1 }),
    enabled: activeTab === 'inventory',
  });

  const totalPages = requestsData ? Math.ceil(requestsData.count / PAGE_SIZE) : 1;

  const stats = {
    total: requestsData?.count ?? 0,
    pending: requestsData?.results.filter((r) => r.status === 'pending').length ?? 0,
    approved: requestsData?.results.filter((r) => r.status === 'approved').length ?? 0,
    rejected: requestsData?.results.filter((r) => r.status === 'rejected').length ?? 0,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
          <p className="text-slate-500 text-sm mt-0.5">Full visibility across all requests and inventory</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Requests', value: stats.total, color: 'text-slate-700' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
            { label: 'Approved', value: stats.approved, color: 'text-green-600' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'requests'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList size={15} />
            All Requests
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Package size={15} />
            Inventory
          </button>
        </div>

        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {reqError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <p className="text-slate-500">Failed to load requests.</p>
                <button
                  onClick={() => reqRefetch()}
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
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Ref #</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Submitted By</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Decided By</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Document Ref</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600">Lines</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reqLoading ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            {[...Array(8)].map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <div className="h-4 bg-slate-200 rounded w-3/4" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : requestsData?.results.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                              <PackageOpen size={40} />
                              <p className="font-medium text-slate-500">No requests found</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        requestsData?.results.map((req: StockRequest) => (
                          <tr key={req.id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 font-mono text-slate-700">
                              REQ-{String(req.id).padStart(4, '0')}
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium">
                              {req.created_by_username}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {req.decided_by_username ?? <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {req.document_ref || <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600">
                              {req.line_count ?? req.lines?.length ?? 0}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge status={req.status} />
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                              {new Date(req.created_at).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setViewingId(req.id)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="View details"
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {requestsData && requestsData.count > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                    <p className="text-xs text-slate-500">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, requestsData.count)} of {requestsData.count}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-40 transition"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                            page === p ? 'bg-[#ED7E07] text-white' : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-40 transition"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total products in system</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{productsData?.count ?? '…'}</p>
            </div>
            <button
              onClick={() => navigate('/admin/products')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#ED7E07] hover:bg-[#d06d06] text-white font-semibold rounded-lg transition shadow-sm"
            >
              <Package size={17} />
              Manage Inventory
            </button>
          </div>
        )}
      </main>

      {viewingId !== null && (
        <StockRequestDetail
          requestId={viewingId}
          onClose={() => setViewingId(null)}
          canDecide={false}
        />
      )}
    </div>
  );
}
