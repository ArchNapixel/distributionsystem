import { type DynamicModule, Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Env } from './config/env';
import { DbModule } from './db/db.module';
import { HealthController } from './health/health.controller';

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level: env.LOG_LEVEL,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
          },
        }),
        DbModule.forRoot(env.DATABASE_URL),
      ],
      controllers: [HealthController],
      providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
    };
  }
}
