import { LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/alyafour-logo.svg';

export default function Navbar() {
  const { username, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadge: Record<string, string> = {
    maker: 'bg-blue-100 text-blue-700',
    checker: 'bg-green-100 text-green-700',
    superadmin: 'bg-orange-100 text-orange-700',
  };

  const roleLabel: Record<string, string> = {
    maker: 'Maker',
    checker: 'Checker',
    superadmin: 'Super Admin',
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <img src={logo} alt="Al Yafour General Contracting" className="h-9" />

        <div className="flex items-center gap-3">
          {role && (
            <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadge[role] ?? 'bg-slate-100 text-slate-600'}`}>
              {roleLabel[role] ?? role}
            </span>
          )}
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600">
            <User size={15} className="text-slate-400" />
            <span>{username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
