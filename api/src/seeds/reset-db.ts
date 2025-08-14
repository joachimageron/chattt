/*
 * Script: reset-db
 * Purpose: Drop the entire database schema and recreate it (development only).
 * Usage: npm run db:reset
 * Notes:
 *  - Uses TypeORM DataSource.dropDatabase() then synchronize() to rebuild schema.
 *  - Aborts automatically if NODE_ENV=production for safety.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[reset-db] Refusing to run in production environment');
    process.exit(1);
    return;
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const ds = app.get(DataSource);
  try {
    console.log('[reset-db] Dropping database...');
    await ds.dropDatabase();
    console.log('[reset-db] Re-synchronizing schema...');
    await ds.synchronize();
    console.log('[reset-db] Database reset complete ✔');
  } catch (err) {
    console.error('[reset-db] Failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
