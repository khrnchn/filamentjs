import { createServerFn, createServerOnlyFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '~/lib/auth';

// Server-only: uses the request-scoped headers. createServerOnlyFn keeps this
// (and the server-only getRequest import) out of the client bundle, while still
// being callable from other server function handlers.
export const currentSession = createServerOnlyFn(async () => {
  return auth.api.getSession({ headers: getRequest().headers });
});

export interface SessionUser {
  email: string;
  name: string;
  role: string;
}

export const getSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ user: SessionUser } | null> => {
    const session = await currentSession();
    if (!session) return null;
    return {
      user: {
        email: session.user.email,
        name: session.user.name,
        role: session.user.role ?? 'user',
      },
    };
  },
);
