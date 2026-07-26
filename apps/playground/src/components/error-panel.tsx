import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { Button } from '~/components/ui/button';

// Router-level boundary: a child route catches its own loader errors, so this is
// registered as the router default rather than only on /admin.
export function ErrorPanel({ error, reset }: Partial<ErrorComponentProps>) {
  const router = useRouter();

  return (
    <div className="mx-auto mt-8 max-w-xl rounded-md border border-destructive/30 bg-muted/20 p-6">
      <h1 className="text-lg font-semibold text-destructive">Unable to load this page</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error?.message ?? 'Something went wrong.'}</p>
      <div className="mt-5 flex gap-2">
        <Button
          onClick={() => {
            reset?.();
            void router.invalidate();
          }}
        >
          Try again
        </Button>
        <Link to="/admin/$resource" params={{ resource: 'posts' }} search={{ page: 1 }}>
          <Button variant="outline">Back to posts</Button>
        </Link>
      </div>
    </div>
  );
}
