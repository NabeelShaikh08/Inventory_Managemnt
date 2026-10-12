import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { Package, Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await login(data);
      navigate('/');
    } catch {
      setServerError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl mb-4">
            <Package className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Manager</h1>
          <p className="text-slate-500 text-sm mt-1">Al Yafour General Contracting</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-5">
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              {...register('username')}
              className={`w-full px-4 py-2.5 rounded-lg border text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.username ? 'border-red-400' : 'border-slate-300'
              }`}
              placeholder="Enter your username"
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.password ? 'border-red-400' : 'border-slate-300'
                }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Test accounts: <strong>admin</strong> / Admin@123 &nbsp;·&nbsp; <strong>storekeeper</strong> / Store@123
        </p>
      </div>
    </div>
  );
}
