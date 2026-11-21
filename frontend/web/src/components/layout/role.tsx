import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/api';
import { ROLES, roleLabel, type Role } from '@/lib/roles';

const STORAGE_KEY = 'drh-demo-role';

function load(): Role {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (ROLES.some((r) => r.id === v)) return v as Role;
  } catch {
    // storage unavailable: fall back to the default role
  }
  return 'owner';
}

const Ctx = createContext<{ role: Role; setRole: (r: Role) => void }>({
  role: 'owner',
  setRole: () => {},
});
export const useRole = () => useContext(Ctx);

export function RoleProvider({ children, initial }: { children: ReactNode; initial?: Role }) {
  const [role, setRole] = useState<Role>(initial ?? load);
  api.setActor(roleLabel(role));
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {
      // not persisted; the demo role resets on reload
    }
  }, [role]);
  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
}
