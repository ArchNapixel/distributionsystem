import { z } from 'zod';

export const HealthStatus = z.enum(['ok', 'error']);

export const HealthResponse = z.object({
  status: HealthStatus,
  db: HealthStatus,
});

export type HealthResponse = z.infer<typeof HealthResponse>;
