import { LayoutDashboard, LogOut } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../services/cn';
import Button from '../ui/Button';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        {user && (
          <nav aria-label="Main" className="ml-4 hidden sm:block">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
                )
              }
            >
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Dashboard
            </NavLink>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <div className="flex items-center gap-2 pl-1" data-testid="nav-user">
                <span
                  className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-xs font-semibold text-white"
                  aria-hidden="true"
                >
                  {initials(user.name)}
                </span>
                <span className="hidden max-w-40 truncate text-sm font-medium md:inline">
                  {user.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={LogOut}
                onClick={logout}
                data-testid="nav-logout"
              >
                <span className="hidden sm:inline">Log out</span>
                <span className="sr-only sm:hidden">Log out</span>
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" size="sm">
                Log in
              </Button>
              <Button as={Link} to="/register" size="sm">
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
