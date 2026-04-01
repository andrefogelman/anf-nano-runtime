import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vitest/config';

// Load .env into process.env for tests
function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env not found — use existing env vars
  }
}

loadDotEnv();

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'setup/**/*.test.ts', 'tests/**/*.test.ts'],
    // Tests share a single remote Supabase instance — run sequentially to avoid
    // _initTestDatabase() truncations from colliding across files.
    fileParallelism: false,
  },
});
