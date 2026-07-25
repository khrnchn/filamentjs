import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client.js';

// Shared better-auth options. The web instance (auth.ts) adds the TanStack Start
// cookie plugin; the CLI builds a cookie-free instance from these same options,
// so there is no config drift between the app and the make:user command.
export const baseAuthOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg' as const }),
  emailAndPassword: { enabled: true },
};
