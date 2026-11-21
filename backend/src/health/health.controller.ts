import { Controller, Get, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@drh/shared';
import { sql } from 'drizzle-orm';
import { setTimeout as sleep } from 'node:timers/promises';
import { DB, type Db } from '../db/db.module';

/** Fail the probe fast instead of waiting on a stalled DB or an exhausted pool. */
export const HEALTH_DB_TIMEOUT_MS = 2000;

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const timer = new AbortController();
    try {
      await Promise.race([
        this.db.execute(sql`select 1`),
        sleep(HEALTH_DB_TIMEOUT_MS, undefined, { signal: timer.signal }).then(() => {
          throw new Error(`Database did not respond within ${HEALTH_DB_TIMEOUT_MS}ms`);
        }),
      ]);
      return { status: 'ok', db: 'ok' };
    } catch (err) {
      this.logger.error({ err }, 'Database health check failed');
      const body: HealthResponse = { status: 'error', db: 'error' };
      throw new ServiceUnavailableException(body);
    } finally {
      timer.abort();
    }
  }
}
