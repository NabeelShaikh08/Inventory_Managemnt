import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/alyafour-logo.svg';

type FormData = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const schema = z.object({
    username: z.string().min(1, t('login.usernameRequired')),
    password: z.string().min(1, t('login.passwordRequired')),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const role = await login(data);
      if (role === 'checker') navigate('/checker');
      else if (role === 'superadmin') navigate('/admin');
      else navigate('/maker');
    } catch {
      setServerError(t('login.invalidCredentials'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Al Yafour General Contracting" className="h-12 mb-4" />
          <h1 className="text-xl font-bold text-slate-800">{t('login.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-5">
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
              {t('login.username')}
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              {...register('username')}
              className={`w-full px-4 py-2.5 rounded-lg border text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ${
                errors.username ? 'border-red-400' : 'border-slate-300'
              }`}
              placeholder={t('login.usernamePlaceholder')}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ${
                  errors.password ? 'border-red-400' : 'border-slate-300'
                }`}
                placeholder={t('login.passwordPlaceholder')}
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
            className="w-full py-2.5 px-4 bg-[#ED7E07] hover:bg-[#d06d06] disabled:bg-orange-300 text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            {isSubmitting ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>

        <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 font-medium mb-2">{t('login.testAccounts')}</p>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between"><span>{t('login.storekeeperlabel')}</span><span>Store@123</span></div>
            <div className="flex justify-between"><span>{t('login.checkerlabel')}</span><span>Checker@123</span></div>
            <div className="flex justify-between"><span>{t('login.adminlabel')}</span><span>Admin@123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
