import 'reflect-metadata';
import { HealthResponse } from '@drh/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type postgres from 'postgres';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { parseEnv } from '../src/config/env';
import { PG } from '../src/db/db.module';

// Requires the Supabase local stack (`supabase start`). Never reads DATABASE_URL, and
// refuses non-local hosts, so an exported staging/prod URL can't be hit by tests.
const url =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
  throw new Error(`Refusing to run DB tests against non-local host "${host}"`);
}
const env = parseEnv({ NODE_ENV: 'test', LOG_LEVEL: 'warn', DATABASE_URL: url });

describe('GET /health (real DB)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('reports ok for api and db', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(HealthResponse.parse(res.body)).toEqual({ status: 'ok', db: 'ok' });
  });

  it('has the postgis extension installed', async () => {
    const sql = app.get<postgres.Sql>(PG);
    const rows = await sql`select extname from pg_extension where extname = 'postgis'`;
    expect(rows).toHaveLength(1);
  });
});
