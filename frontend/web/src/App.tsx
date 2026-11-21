import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, type RouterHistory } from '@tanstack/react-router';
import { useState } from 'react';
import { RoleProvider } from '@/components/layout/role';
import { createAppRouter } from '@/router';
import type { Role } from '@/lib/roles';

export default function App({ history, role }: { history?: RouterHistory; role?: Role }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } }),
  );
  const [router] = useState(() => createAppRouter(history));
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider {...(role && { initial: role })}>
        <RouterProvider router={router} />
      </RoleProvider>
    </QueryClientProvider>
  );
}
