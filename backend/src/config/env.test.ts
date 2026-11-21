import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

describe('parseEnv', () => {
  it('applies defaults', () => {
    expect(parseEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      DATABASE_URL,
    });
  });

  it('coerces PORT', () => {
    expect(parseEnv({ DATABASE_URL, PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails when DATABASE_URL is missing', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-postgres DATABASE_URL and a bad PORT', () => {
    expect(() => parseEnv({ DATABASE_URL: 'https://example.com' })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ DATABASE_URL, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('does not echo the secret value in the error', () => {
    const secret = 'mysql://user:s3cret@host/db';
    expect(() => parseEnv({ DATABASE_URL: secret })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('s3cret') }),
    );
  });
});
