import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins/admin';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { baseAuthOptions } from './auth-options.js';

export const auth = betterAuth({
  ...baseAuthOptions,
  plugins: [admin(), tanstackStartCookies()],
});
