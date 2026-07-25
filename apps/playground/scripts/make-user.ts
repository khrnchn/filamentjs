import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins/admin';
import { eq } from 'drizzle-orm';
import { baseAuthOptions } from '../src/lib/auth-options.js';
import { db } from '../src/db/client.js';
import { user } from '../src/db/schema.js';

// Non-interactive user creation, the agent-friendly equivalent of Filament's
// `php artisan make:filament-user`. Reads flags (--email, --password, --name,
// --role) or the matching USER_* env vars. Uses a cookie-plugin-free auth
// instance so it runs headless.
function flag(name: string): string | undefined {
  const withEq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const email = flag('email') || process.env.USER_EMAIL;
const password = flag('password') || process.env.USER_PASSWORD;
const name = flag('name') || process.env.USER_NAME || 'Admin';
const role = flag('role') || process.env.USER_ROLE || 'admin';

if (!email || !password) {
  console.error(
    'Usage: pnpm make:user --email <email> --password <password> [--name <name>] [--role user|admin]',
  );
  process.exit(1);
}

const auth = betterAuth({ ...baseAuthOptions, plugins: [admin()] });

try {
  await auth.api.signUpEmail({ body: { email, password, name } });
  if (role !== 'user') {
    await db.update(user).set({ role }).where(eq(user.email, email));
  }
  console.log(`Created ${role}: ${email}`);
  process.exit(0);
} catch (e) {
  console.error(`Failed to create user: ${(e as Error).message}`);
  process.exit(1);
}
