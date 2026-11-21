import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { loadDotEnv, parseEnv } from './config/env';

async function bootstrap(): Promise<void> {
  loadDotEnv();
  const env = parseEnv(process.env);
  const app = await NestFactory.create(AppModule.forRoot(env), { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
