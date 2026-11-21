import { Card } from '@/components/ui';

const CARDS = ['My trip', 'Stops', 'Proof of delivery', 'Remittance'];

export function DriverHome() {
  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-2xl font-semibold">Driver</h1>
      {CARDS.map((c) => (
        <Card key={c} className="min-h-20 p-5">
          <p className="text-lg font-medium">{c}</p>
          <p className="text-sm text-neutral-500">Coming in Phase 3</p>
        </Card>
      ))}
    </div>
  );
}
