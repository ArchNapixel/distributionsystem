import { Card, PageHeader } from '@/components/ui';
import type { NavItem } from '@/lib/roles';

export function ComingSoon({ item }: { item: NavItem }) {
  return (
    <>
      <PageHeader title={item.label} />
      <Card className="max-w-lg">
        <p className="text-sm font-medium text-green-800">Coming soon · Phase {item.soon?.phase}</p>
        <p className="mt-1 text-sm text-neutral-600">{item.soon?.description}</p>
      </Card>
    </>
  );
}
