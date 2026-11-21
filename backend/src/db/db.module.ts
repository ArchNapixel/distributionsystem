import {
  type DynamicModule,
  Global,
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const PG = Symbol('PG');
export const DB = Symbol('DB');
export type Db = PostgresJsDatabase;

@Injectable()
class PgShutdown implements OnApplicationShutdown {
  constructor(@Inject(PG) private readonly sql: postgres.Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}

@Global()
@Module({})
export class DbModule {
  static forRoot(url: string): DynamicModule {
    return {
      module: DbModule,
      providers: [
        {
          provide: PG,
          // prepare:false is required behind the Supavisor transaction pooler.
          useFactory: () => postgres(url, { prepare: false, max: 10, connect_timeout: 5 }),
        },
        { provide: DB, inject: [PG], useFactory: (sql: postgres.Sql) => drizzle({ client: sql }) },
        PgShutdown,
      ],
      exports: [PG, DB],
    };
  }
}
