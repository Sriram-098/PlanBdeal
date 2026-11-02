import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Film, Plus, LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { NotificationBell } from './NotificationBell';
import { useState } from 'react';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-cine-surface2 text-white' : 'text-cine-muted hover:text-white'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-cine-border bg-cine-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-white">
          <Film className="h-6 w-6 text-cine-accent" />
          <span>
            Plan<span className="text-cine-accent">B</span>Deal
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/explore" className={navLinkClass}>
            Explore Tickets
          </NavLink>
          <NavLink to="/listings/new" className={navLinkClass}>
            List a Ticket
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={navLinkClass}>
              My Activity
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user && <NotificationBell />}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-cine-border bg-cine-surface2 px-3 py-1.5 text-sm text-cine-text"
              >
                <UserRound className="h-4 w-4" />
                {user.fullName.split(' ')[0]}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-cine-border bg-cine-surface p-1 shadow-xl">
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-cine-text hover:bg-cine-surface2"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-cine-surface2"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary">
                  <Plus className="h-4 w-4" /> Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
