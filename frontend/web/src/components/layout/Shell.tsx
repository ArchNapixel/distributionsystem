import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Select, cn } from '@/components/ui';
import { ROLES, canAccess, homePath, navFor, areaForPath, type Role } from '@/lib/roles';
import { useRole } from './role';

export function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const items = navFor(role);
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Main" className="space-y-4 p-3 text-sm">
      {groups.map((g) => (
        <div key={g || 'top'}>
          {g && <p className="px-2 pb-1 text-xs font-semibold uppercase text-neutral-500">{g}</p>}
          {items
            .filter((i) => i.group === g)
            .map((i) => (
              <Link
                key={i.path}
                to={i.path}
                onClick={onNavigate}
                className="flex min-h-9 items-center justify-between rounded-md px-2 hover:bg-neutral-100"
                activeProps={{
                  className: 'bg-green-100 font-medium text-green-900',
                }}
              >
                {i.label}
                {i.soon && i.soon.phase > 1 && (
                  <span className="text-xs text-neutral-500">P{i.soon.phase}</span>
                )}
              </Link>
            ))}
        </div>
      ))}
    </nav>
  );
}

function RoleSwitcher() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="role" className="sr-only">
        Demo role
      </label>
      <Select
        id="role"
        className="w-auto"
        value={role}
        onChange={(e) => {
          const r = e.target.value as Role;
          setRole(r);
          void navigate({ to: homePath(r) });
        }}
      >
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function NotAvailable() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">Not available for your role</h1>
      <p className="mt-2 text-neutral-500">Switch the demo role in the top bar to see this page.</p>
    </div>
  );
}

export function Shell() {
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const area =
    path === '/'
      ? undefined
      : (areaForPath(path) ?? (path.startsWith('/driver') ? 'driver' : undefined));
  const allowed = !area || canAccess(role, area);
  const hasNav = navFor(role).length > 0;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2 sm:px-6">
        {hasNav && (
          <Button
            variant="ghost"
            className="lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        )}
        <span className="font-semibold">Davao Trading Rice Hub</span>
        <Badge tone="amber">Demo data</Badge>
        <div className="ml-auto">
          <RoleSwitcher />
        </div>
      </header>
      <div className="flex">
        {hasNav && (
          <aside
            className={cn(
              'no-scrollbar fixed inset-y-0 left-0 top-[53px] z-10 w-64 overflow-y-auto border-r border-neutral-200 bg-white lg:sticky lg:block lg:h-[calc(100vh-53px)] lg:w-60 lg:shrink-0 lg:self-start',
              open ? 'block' : 'hidden',
            )}
          >
            <Sidebar role={role} onNavigate={() => setOpen(false)} />
          </aside>
        )}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl">{allowed ? <Outlet /> : <NotAvailable />}</div>
        </main>
      </div>
    </div>
  );
}
