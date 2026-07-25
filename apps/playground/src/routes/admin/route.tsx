import { createFileRoute, redirect, Link, Outlet, useNavigate } from '@tanstack/react-router';
import { panel } from '~/filament/panel';
import { getSession } from '~/server/session';
import { authClient } from '~/lib/auth-client';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from '~/components/theme-toggle';

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: '/login' });
    return { session };
  },
  component: AdminShell,
});

function AdminShell() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

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
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
