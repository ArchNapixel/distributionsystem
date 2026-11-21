import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router';
import { Shell } from '@/components/layout/Shell';
import { ComingSoon } from '@/features/ComingSoon';
import { AuditLog } from '@/features/admin/AuditLog';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { DriverHome } from '@/features/driver/DriverHome';
import { Adjustments } from '@/features/inventory/Adjustments';
import { Alerts } from '@/features/inventory/Alerts';
import { CycleCounts } from '@/features/inventory/CycleCounts';
import { LotDetail, Lots } from '@/features/inventory/Lots';
import { WarehouseHandling } from '@/features/inventory/handling/WarehouseHandling';
import { Movements } from '@/features/inventory/Movements';
import { Receiving } from '@/features/inventory/Receiving';
import { StockOnHand } from '@/features/inventory/StockOnHand';
import { Transfers } from '@/features/inventory/Transfers';
import { PurchaseOrders } from '@/features/purchasing/PurchaseOrders';
import { Suppliers } from '@/features/purchasing/Suppliers';
import { Products } from '@/features/setup/Products';
import { Warehouses } from '@/features/setup/Warehouses';
import { NAV } from '@/lib/roles';

const root = createRootRoute({ component: Shell });

const page = (path: string, component: () => React.JSX.Element | null) =>
  createRoute({ getParentRoute: () => root, path, component });

// The role lives in React state, so access is enforced by Shell (not-available page).
const index = createRoute({
  getParentRoute: () => root,
  path: '/',
  beforeLoad: () => {
    let role: string | null = null;
    try {
      role = localStorage.getItem('drh-demo-role');
    } catch {
      // default role
    }
    throw redirect({ to: role === 'driver' ? '/driver' : '/dashboard' });
  },
});

const implemented = [
  page('/dashboard', Dashboard),
  page('/inventory/handling', WarehouseHandling),
  page('/inventory/stock', StockOnHand),
  page('/inventory/movements', Movements),
  page('/inventory/receiving', Receiving),
  page('/inventory/transfers', Transfers),
  page('/inventory/adjustments', Adjustments),
  page('/inventory/counts', CycleCounts),
  page('/inventory/lots', Lots),
  page('/inventory/lots/$lotId', LotDetail),
  page('/inventory/alerts', Alerts),
  page('/purchasing/suppliers', Suppliers),
  page('/purchasing/orders', PurchaseOrders),
  page('/setup/products', Products),
  page('/setup/warehouses', Warehouses),
  page('/admin/audit', AuditLog),
  page('/driver', DriverHome),
];

const comingSoon = NAV.filter((n) => n.soon).map((item) =>
  page(item.path, () => <ComingSoon item={item} />),
);

const routeTree = root.addChildren([index, ...implemented, ...comingSoon]);

export const createAppRouter = (history?: RouterHistory) =>
  createRouter({ routeTree, ...(history && { history }) });
