import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  tablesFilter: ['auditor_*'],
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
