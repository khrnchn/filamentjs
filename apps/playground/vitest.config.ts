import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Integration tests hit the real Postgres from docker compose; run serially.
    fileParallelism: false,
  },
});
