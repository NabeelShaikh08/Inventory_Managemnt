import { useState } from 'react';
import { LogOut, User, LayoutDashboard, Package, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';
import logo from '../assets/alyafour-logo.svg';

export default function Navbar() {
  const { username, role, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const navLinks: { to: string; label: string; icon: React.ReactNode }[] = [];

  if (role === 'maker') {
    navLinks.push(
      { to: '/maker', label: 'Requests', icon: <LayoutDashboard size={15} /> },
      { to: '/maker/products', label: 'Inventory', icon: <Package size={15} /> },
    );
  } else if (role === 'checker') {
    navLinks.push(
      { to: '/checker', label: 'Approvals', icon: <LayoutDashboard size={15} /> },
      { to: '/checker/products', label: 'Inventory', icon: <Package size={15} /> },
    );
  } else if (role === 'superadmin') {
    navLinks.push(
      { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
      { to: '/admin/products', label: 'Inventory', icon: <Package size={15} /> },
    );
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive
        ? 'bg-orange-50 text-[#ED7E07]'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
    }`;

  return (
    <nav className="bg-white border-b border-slate-200">
      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-6">
          <img
            src={logo}
            alt="Al Yafour General Contracting"
            className="h-9 cursor-pointer"
            onClick={() => {
              setMenuOpen(false);
              if (role === 'checker') navigate('/checker');
              else if (role === 'superadmin') navigate('/admin');
              else navigate('/maker');
            }}
          />
          {navLinks.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end className={linkClass}>
                  {link.icon}
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Right: role badge + username + sign out (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-2">
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
            className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={16} />
            Sign Out
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="sm:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 pb-4 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-2 py-3 border-b border-slate-100 mb-2">
            <User size={15} className="text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">{username}</span>
            {role && (
              <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge[role] ?? 'bg-slate-100 text-slate-600'}`}>
                {roleLabel[role] ?? role}
              </span>
            )}
          </div>

          {/* Nav links */}
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-sm text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
