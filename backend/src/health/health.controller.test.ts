import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Db } from '../db/db.module';
import { HEALTH_DB_TIMEOUT_MS, HealthController } from './health.controller';

const fakeDb = (execute: () => Promise<unknown>) => ({ execute }) as unknown as Db;

describe('HealthController', () => {
  it('returns ok when the DB answers', async () => {
    const controller = new HealthController(fakeDb(() => Promise.resolve([])));
    await expect(controller.check()).resolves.toEqual({ status: 'ok', db: 'ok' });
  });

  it('returns 503 when the DB query fails', async () => {
    const controller = new HealthController(fakeDb(() => Promise.reject(new Error('down'))));
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it(
    'returns 503 when the DB hangs past the timeout',
    async () => {
      const controller = new HealthController(fakeDb(() => new Promise(() => {})));
      const err = await controller.check().catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect((err as ServiceUnavailableException).getResponse()).toEqual({
        status: 'error',
        db: 'error',
      });
    },
    HEALTH_DB_TIMEOUT_MS + 2000,
  );
});
