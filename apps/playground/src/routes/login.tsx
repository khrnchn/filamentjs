import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { authClient } from '~/lib/auth-client';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';

export const Route = createFileRoute('/login')({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await authClient.signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    setPending(false);
    if (res.error) {
      setError(res.error.message ?? 'Sign in failed');
      return;
    }
    navigate({ to: '/admin/$resource', params: { resource: 'posts' }, search: { page: 1 } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">FilamentJS</h1>
        <p className="mb-4 text-sm text-muted-foreground">Sign in to the admin panel.</p>
        <div className="space-y-3">
          <Input name="email" type="email" placeholder="Email" required autoComplete="email" />
          <Input name="password" type="password" placeholder="Password" required autoComplete="current-password" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>
    </div>
  );
}
