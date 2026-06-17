/**
 * Minimal forward-only migration runner. Applies every *.sql file under
 * supabase/migrations in lexical order exactly once, tracking applied files in
 * a `schema_migrations` table. Idempotent: re-running is a no-op.
 *
 * Usage: pnpm --filter @repeatless/api run db:migrate
 *
 * Works against any Postgres pointed to by DATABASE_URL (local docker pgvector
 * or your Supabase project's direct connection string).
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../supabase/migrations');

async function main(): Promise<void> {
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    const applied = new Set(
      (await client.query<{ filename: string }>('select filename from schema_migrations')).rows.map(
        (r) => r.filename,
      ),
    );

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        process.stdout.write(`• skip   ${file} (already applied)\n`);
        continue;
      }
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`→ apply  ${file}\n`);
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations(filename) values ($1)', [file]);
        await client.query('commit');
        count += 1;
      } catch (err) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
    process.stdout.write(`\n✓ Migrations complete (${count} applied, ${files.length} total).\n`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  process.stderr.write(`\n✗ Migration failed: ${(err as Error).message}\n`);
  process.exit(1);
});
