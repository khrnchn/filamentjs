import {
  createFileRoute,
  redirect,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { panel } from '~/filament/panel';
import { getSession } from '~/server/session';
import { authClient } from '~/lib/auth-client';
import { Button } from '~/components/ui/button';
import { ErrorPanel } from '~/components/error-panel';
import { ThemeToggle } from '~/components/theme-toggle';

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: '/login' });
    return { session };
  },
  errorComponent: AdminShell,
  component: AdminShell,
});

function AdminShell({ error, reset }: Partial<ErrorComponentProps> = {}) {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const isLoading = useRouterState({ select: (state) => state.isLoading });

  const signOut = async () => {
    await authClient.signOut();
    navigate({ to: '/login' });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r bg-muted/20">
        <div className="border-b px-4 py-4 text-lg font-semibold">{panel.brand}</div>
        <nav className="p-3">
          {panel.nav.map((group, gi) => (
            <div key={gi} className="mb-4">
              {group.label ? (
                <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
              ) : null}
              {group.items.map((item) => (
                <Link
                  key={item.slug}
                  to="/admin/$resource"
                  params={{ resource: item.slug }}
                  search={{ page: 1 }}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  activeProps={{ className: 'block rounded-md px-2 py-1.5 text-sm bg-muted font-medium' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="text-sm text-muted-foreground">Admin</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="relative flex-1">
          {isLoading ? (
            <div
              role="progressbar"
              aria-label="Loading page"
              className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-muted"
            >
              <div
                className="h-full w-1/3 bg-primary"
                style={{ animation: 'admin-route-loading 1s ease-in-out infinite' }}
              />
              <style>{`
                @keyframes admin-route-loading {
                  from { transform: translateX(-100%); }
                  to { transform: translateX(300%); }
                }
              `}</style>
            </div>
          ) : null}

          {error ? <ErrorPanel error={error} reset={reset} /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
