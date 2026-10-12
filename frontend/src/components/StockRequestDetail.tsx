import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getRequest, decideRequest } from '../api/requests';
import type { LineStatus, RequestLine, DecideRequestInput } from '../types';

interface Props {
  requestId: number;
  onClose: () => void;
  canDecide: boolean;
  onDecided?: () => void;
}

function LineBadge({ status }: { status: LineStatus }) {
  const map: Record<LineStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function actionLabel(action: string) {
  if (action === 'stock_in') return 'Stock In';
  if (action === 'new_product') return 'New Product';
  if (action === 'edit_product') return 'Edit Product';
  return action;
}

export default function StockRequestDetail({ requestId, onClose, canDecide, onDecided }: Props) {
  const [decisions, setDecisions] = useState<Record<number, { decision: 'approved' | 'rejected'; reason: string }>>({});
  const [checkerRemarks, setCheckerRemarks] = useState('');
  const [serverError, setServerError] = useState('');

  const { data: req, isLoading } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => getRequest(requestId),
  });

  const decideMut = useMutation({
    mutationFn: (payload: DecideRequestInput) => decideRequest(requestId, payload),
    onSuccess: () => onDecided?.(),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to submit decision.';
      setServerError(msg);
    },
  });

  const setLineDecision = (lineId: number, decision: 'approved' | 'rejected') => {
    setDecisions((prev) => ({
      ...prev,
      [lineId]: { decision, reason: prev[lineId]?.reason ?? '' },
    }));
  };

  const setLineReason = (lineId: number, reason: string) => {
    setDecisions((prev) => ({
      ...prev,
      [lineId]: { decision: prev[lineId]?.decision ?? 'rejected', reason },
    }));
  };

  const handleSubmitDecision = () => {
    if (!req) return;
    setServerError('');
    const lines = req.lines.filter((l) => l.line_status === 'pending').map((l) => ({
      line_id: l.id,
      decision: decisions[l.id]?.decision ?? 'rejected',
      rejection_reason: decisions[l.id]?.reason ?? '',
    }));
    decideMut.mutate({ lines, remarks: checkerRemarks });
  };

  const pendingLines = req?.lines.filter((l) => l.line_status === 'pending') ?? [];
  const allPendingDecided = pendingLines.length > 0 && pendingLines.every((l) => decisions[l.id]?.decision);
  const showDecidePanel = canDecide && req?.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isLoading ? 'Loading…' : `REQ-${String(req?.id ?? 0).padStart(4, '0')}`}
            </h2>
            {req && (
              <p className="text-sm text-slate-500 mt-0.5">
                Submitted by <span className="font-medium text-slate-700">{req.created_by_username}</span>
                {' · '}
                {new Date(req.created_at).toLocaleDateString('en-GB')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : req ? (
            <>
              {(req.document_ref || req.remarks) && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {req.document_ref && (
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-medium">Document Ref</span>
                      <p className="font-medium text-slate-700 mt-0.5">{req.document_ref}</p>
                    </div>
                  )}
                  {req.remarks && (
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-medium">Remarks</span>
                      <p className="text-slate-600 mt-0.5">{req.remarks}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm">
                  Articles ({req.lines.length})
                </h3>
                {req.lines.map((line: RequestLine) => (
                  <div
                    key={line.id}
                    className={`p-4 rounded-xl border ${
                      line.line_status === 'approved'
                        ? 'border-green-200 bg-green-50/50'
                        : line.line_status === 'rejected'
                        ? 'border-red-200 bg-red-50/50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {actionLabel(line.action)}
                        </span>
                        {line.product_name && (
                          <p className="font-medium text-slate-800 mt-0.5">{line.product_name}</p>
                        )}
                        {line.proposed_name && (
                          <p className="font-medium text-slate-800 mt-0.5">{line.proposed_name}</p>
                        )}
                      </div>
                      <LineBadge status={line.line_status} />
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 mt-1">
                      {line.quantity && (
                        <span>Qty: <span className="text-slate-700 font-medium">{line.quantity}</span></span>
                      )}
                      {line.unit_cost && (
                        <span>Unit cost: <span className="text-slate-700 font-medium">AED {line.unit_cost}</span></span>
                      )}
                      {line.supplier && (
                        <span>Supplier: <span className="text-slate-700 font-medium">{line.supplier}</span></span>
                      )}
                      {line.proposed_price && (
                        <span>Price: <span className="text-slate-700 font-medium">AED {line.proposed_price}</span></span>
                      )}
                      {line.proposed_stock !== null && line.proposed_stock !== undefined && (
                        <span>Stock: <span className="text-slate-700 font-medium">{line.proposed_stock}</span></span>
                      )}
                      {line.proposed_category_name && (
                        <span>Category: <span className="text-slate-700 font-medium">{line.proposed_category_name}</span></span>
                      )}
                    </div>

                    {line.proposed_description && (
                      <p className="text-xs text-slate-500 mt-1">{line.proposed_description}</p>
                    )}

                    {line.rejection_reason && (
                      <p className="text-xs text-red-500 mt-1">
                        Reason: {line.rejection_reason}
                      </p>
                    )}

                    {showDecidePanel && line.line_status === 'pending' && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLineDecision(line.id, 'approved')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              decisions[line.id]?.decision === 'approved'
                                ? 'bg-green-600 text-white'
                                : 'border border-green-300 text-green-600 hover:bg-green-50'
                            }`}
                          >
                            <CheckCircle size={13} />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setLineDecision(line.id, 'rejected')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              decisions[line.id]?.decision === 'rejected'
                                ? 'bg-red-600 text-white'
                                : 'border border-red-300 text-red-500 hover:bg-red-50'
                            }`}
                          >
                            <XCircle size={13} />
                            Reject
                          </button>
                        </div>
                        {decisions[line.id]?.decision === 'rejected' && (
                          <input
                            type="text"
                            value={decisions[line.id]?.reason ?? ''}
                            onChange={(e) => setLineReason(line.id, e.target.value)}
                            placeholder="Reason for rejection (optional)"
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 transition"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {showDecidePanel && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Approval Remarks <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={checkerRemarks}
                      onChange={(e) => setCheckerRemarks(e.target.value)}
                      rows={2}
                      placeholder="Any notes for the maker…"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                    />
                  </div>

                  {serverError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                      {serverError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmitDecision}
                    disabled={!allPendingDecided || decideMut.isPending}
                    className="w-full py-2.5 bg-[#ED7E07] hover:bg-[#d06d06] disabled:bg-orange-200 text-white font-semibold rounded-lg transition"
                  >
                    {decideMut.isPending ? 'Submitting…' : 'Submit Approval'}
                  </button>
                </div>
              )}

              {req.decided_by_username && (
                <div className="text-xs text-slate-400 pt-2">
                  Approved by <span className="font-medium text-slate-600">{req.decided_by_username}</span>
                  {req.decided_at && (
                    <> on {new Date(req.decided_at).toLocaleDateString('en-GB')}</>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-center py-8">Request not found.</p>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
