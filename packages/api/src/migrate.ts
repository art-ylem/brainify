import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedTasks } from './db/seed.js';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://brainify:brainify@localhost:5432/brainify';

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../drizzle');

try {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder });
  console.log('Migrations completed successfully');

  console.log('Running seed...');
  await seedTasks(db);
  console.log('Seed completed');
} catch (error) {
  console.error('Migration/seed failed:', error);
  await client.end();
  process.exit(1);
}

await client.end();
