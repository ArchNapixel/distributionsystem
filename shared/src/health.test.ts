import { describe, expect, it } from 'vitest';
import { HealthResponse } from './health.js';

describe('HealthResponse', () => {
  it('accepts a valid response', () => {
    expect(HealthResponse.parse({ status: 'ok', db: 'error' })).toEqual({
      status: 'ok',
      db: 'error',
    });
  });

  it('rejects unknown status values and missing fields', () => {
    expect(HealthResponse.safeParse({ status: 'fine', db: 'ok' }).success).toBe(false);
    expect(HealthResponse.safeParse({ status: 'ok' }).success).toBe(false);
  });
});
