import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://brainify:brainify@localhost:5432/brainify';

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../drizzle');

console.log('Running migrations...');
await migrate(db, { migrationsFolder });
console.log('Migrations completed successfully');

await client.end();
