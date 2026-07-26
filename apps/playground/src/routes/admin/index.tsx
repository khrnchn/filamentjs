import { createFileRoute } from '@tanstack/react-router';
import { loadWidgets } from '~/server/widget-fns';
import { WidgetGrid } from '~/components/widget-grid';

export const Route = createFileRoute('/admin/')({
  loader: () => loadWidgets(),
  component: Dashboard,
});

function Dashboard() {
  const widgets = Route.useLoaderData();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>
      {widgets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No widgets are available for your account.</p>
      ) : (
        <WidgetGrid widgets={widgets} />
      )}
    </div>
  );
}
