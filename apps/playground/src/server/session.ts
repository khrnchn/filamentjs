import { getRequest } from '@tanstack/react-start/server';
import { auth } from '~/lib/auth';

export async function currentSession() {
  return auth.api.getSession({ headers: getRequest().headers });
}
