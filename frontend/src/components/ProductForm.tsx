import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getCategories } from '../api/categories';
import { createProduct, updateProduct } from '../api/products';
import type { Product, ProductFormData } from '../types';
import { X } from 'lucide-react';

type FormData = {
  name: string;
  description: string;
  price: string;
  stock: number;
  category: number;
  is_active: boolean;
};

interface Props {
  product?: Product | null;
  onClose: () => void;
}

export default function ProductForm({ product, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const schema = z.object({
    name: z.string().min(1, t('productForm.nameRequired')).max(255, t('productForm.nameTooLong')),
    description: z.string(),
    price: z
      .string()
      .min(1, t('productForm.priceRequired'))
      .refine((v) => parseFloat(v) > 0, { message: t('productForm.priceGtZero') }),
    stock: z
      .number({ invalid_type_error: t('productForm.stockNumber') })
      .int(t('productForm.stockWhole'))
      .min(0, t('productForm.stockNegative')),
    category: z.number({ invalid_type_error: t('productForm.categorySelect') }).min(1, t('productForm.categoryRequired')),
    is_active: z.boolean(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      stock: 0,
      category: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: product.category,
        is_active: product.is_active,
      });
    }
  }, [product, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProductFormData) =>
      product ? updateProduct(product.id, data) : createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: Record<string, string[]> } };
      const data = err.response?.data;
      if (data) {
        Object.entries(data).forEach(([field, messages]) => {
          setError(field as keyof FormData, { message: (messages as string[]).join(' ') });
        });
      }
    },
  });

  const onSubmit = handleSubmit((data: FormData) => {
    mutation.mutate(data as ProductFormData);
  });

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2 rounded-lg border text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
      hasError ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            {product ? t('productForm.editTitle') : t('productForm.addTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="p-4 sm:p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('productForm.name')}
            </label>
            <input
              type="text"
              {...register('name')}
              className={inputClass(!!errors.name)}
              placeholder={t('productForm.namePlaceholder')}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('productForm.description')}</label>
            <textarea
              {...register('description')}
              rows={2}
              className={inputClass(!!errors.description)}
              placeholder={t('productForm.descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('productForm.price')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('price')}
                className={inputClass(!!errors.price)}
                placeholder={t('productForm.pricePlaceholder')}
              />
              {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('productForm.stock')}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                {...register('stock', { valueAsNumber: true })}
                className={inputClass(!!errors.stock)}
                placeholder={t('productForm.stockPlaceholder')}
              />
              {errors.stock && <p className="mt-1 text-xs text-red-500">{errors.stock.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('productForm.category')}
            </label>
            <select
              {...register('category', { valueAsNumber: true })}
              className={inputClass(!!errors.category)}
            >
              <option value={0}>{t('productForm.categoryPlaceholder')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is_active"
              type="checkbox"
              {...register('is_active')}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              {t('productForm.activeLabel')}
            </label>
          </div>

          {mutation.isError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {t('productForm.genericError')}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
            >
              {t('productForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition"
            >
              {mutation.isPending ? t('productForm.saving') : product ? t('productForm.saveChanges') : t('productForm.addProduct')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
