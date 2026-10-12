import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteProduct } from '../api/products';
import type { Product } from '../types';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  product: Product;
  onClose: () => void;
}

export default function DeleteConfirmDialog({ product, onClose }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteProduct(product.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="text-red-600" size={22} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Delete Product</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-slate-600 text-sm mb-2">
          Are you sure you want to delete this product? This action cannot be undone.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6">
          <p className="font-medium text-slate-800 text-sm">{product.name}</p>
          <p className="text-slate-500 text-xs mt-0.5">{product.category_name} · AED {parseFloat(product.price).toFixed(2)}</p>
        </div>

        {mutation.isError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            Failed to delete. Please try again.
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition"
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
