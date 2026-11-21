// Demo role matrix (plan 004). UI only: real RBAC is enforced server-side.
export const ROLES = [
  { id: 'owner', label: 'Owner' },
  { id: 'manager', label: 'Warehouse manager' },
  { id: 'staff', label: 'Warehouse staff' },
  { id: 'dispatcher', label: 'Dispatcher' },
  { id: 'driver', label: 'Driver' },
] as const;
export type Role = (typeof ROLES)[number]['id'];

export const roleLabel = (r: Role) => ROLES.find((x) => x.id === r)!.label;

export type Area =
  | 'dashboard'
  | 'inventory'
  | 'stockops'
  | 'adjustments'
  | 'setup'
  | 'purchasing'
  | 'audit'
  | 'later'
  | 'driver';

const ACCESS: Record<Area, readonly Role[]> = {
  dashboard: ['owner', 'manager', 'staff', 'dispatcher'],
  inventory: ['owner', 'manager', 'staff', 'dispatcher'],
  stockops: ['owner', 'manager', 'staff'],
  adjustments: ['owner', 'manager'],
  setup: ['owner', 'manager', 'staff', 'dispatcher'],
  purchasing: ['owner', 'manager'],
  audit: ['owner', 'manager'],
  later: ['owner', 'manager', 'dispatcher'],
  driver: ['driver'],
};

export const canAccess = (role: Role, area: Area) => ACCESS[area].includes(role);
/** Products, warehouses and bins are view-only for staff and dispatcher. */
export const canEditSetup = (role: Role) => role === 'owner' || role === 'manager';

export interface NavItem {
  label: string;
  path: string;
  area: Area;
  group: string;
  soon?: { phase: number; description: string };
}

const soon = (phase: number, description: string) => ({ phase, description });

export const NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', area: 'dashboard', group: '' },
  {
    label: 'Warehouse handling',
    path: '/inventory/handling',
    area: 'inventory',
    group: 'Inventory',
  },
  { label: 'Stock on hand', path: '/inventory/stock', area: 'inventory', group: 'Inventory' },
  { label: 'Movements', path: '/inventory/movements', area: 'inventory', group: 'Inventory' },
  { label: 'Receiving', path: '/inventory/receiving', area: 'stockops', group: 'Inventory' },
  { label: 'Transfers', path: '/inventory/transfers', area: 'stockops', group: 'Inventory' },
  {
    label: 'Adjustments & write-offs',
    path: '/inventory/adjustments',
    area: 'adjustments',
    group: 'Inventory',
  },
  { label: 'Cycle counts', path: '/inventory/counts', area: 'stockops', group: 'Inventory' },
  { label: 'Lots', path: '/inventory/lots', area: 'inventory', group: 'Inventory' },
  { label: 'Alerts', path: '/inventory/alerts', area: 'inventory', group: 'Inventory' },
  { label: 'Suppliers', path: '/purchasing/suppliers', area: 'purchasing', group: 'Purchasing' },
  { label: 'Purchase orders', path: '/purchasing/orders', area: 'purchasing', group: 'Purchasing' },
  { label: 'Products', path: '/setup/products', area: 'setup', group: 'Setup' },
  { label: 'Warehouses & bins', path: '/setup/warehouses', area: 'setup', group: 'Setup' },
  ...(
    [
      [
        'Sales',
        2,
        [
          ['Customers', 'Customer accounts, delivery addresses and credit terms.'],
          ['Price lists', 'Prices per product and customer group.'],
          ['Orders', 'Sales orders from request to delivery.'],
          ['Picking', 'Pick lists that reserve stock for orders.'],
          ['Invoices', 'Invoices issued under Davao Trading Rice Hub.'],
        ],
      ],
      [
        'Delivery',
        3,
        [
          ['Trips', 'Multi-stop trips with vehicle load and proof of delivery.'],
          ['Vehicles', 'Vehicle stock while in transit.'],
          ['Drivers', 'Driver assignments and trip history.'],
          ['Live map', 'Live vehicle positions.'],
          ['Reconciliation', 'End-of-trip stock and cash reconciliation.'],
        ],
      ],
      [
        'Money',
        4,
        [
          ['Payments', 'Customer payments and allocation.'],
          ['AR aging', 'Receivables by age bucket.'],
          ['Remittances', 'Driver cash remittances.'],
          ['Credit', 'Credit limits and holds.'],
        ],
      ],
      [
        'Fleet',
        5,
        [
          ['Maintenance', 'Service schedules and repairs.'],
          ['Fuel', 'Fuel logs and consumption.'],
          ['Documents & expiry', 'Registrations, licences and expiry reminders.'],
        ],
      ],
    ] as const
  ).flatMap(([group, phase, items]) =>
    items.map(([label, d]) => ({
      label,
      path: `/${group.toLowerCase()}/${label.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`,
      area: 'later' as Area,
      group,
      soon: soon(phase, d),
    })),
  ),
  {
    label: 'Reports',
    path: '/reports',
    area: 'later',
    group: 'Reports',
    soon: soon(6, 'Sales, stock, collections and fleet reports.'),
  },
  { label: 'Audit log', path: '/admin/audit', area: 'audit', group: 'Admin' },
  {
    label: 'Users & roles',
    path: '/admin/users',
    area: 'later',
    group: 'Admin',
    soon: soon(1, 'Real sign-in and roles arrive with Supabase Auth.'),
  },
  {
    label: 'Opening stock import',
    path: '/admin/import',
    area: 'later',
    group: 'Admin',
    soon: soon(1, 'Needs the real ledger for its dry-run.'),
  },
];

export const navFor = (role: Role) => NAV.filter((n) => canAccess(role, n.area));

export const homePath = (role: Role) => (role === 'driver' ? '/driver' : '/dashboard');

export const areaForPath = (path: string): Area | undefined =>
  NAV.find((n) => path === n.path || path.startsWith(n.path + '/'))?.area;
