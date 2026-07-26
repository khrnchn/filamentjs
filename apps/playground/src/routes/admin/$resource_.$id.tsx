import { createFileRoute, Link } from '@tanstack/react-router';
import { getResourceView } from '~/server/resource-fns';
import { InfolistRenderer } from '~/filament/infolist-renderer';

export const Route = createFileRoute('/admin/$resource_/$id')({
  loader: ({ params }) => getResourceView({ data: { slug: params.resource, id: params.id } }),
  component: ViewRecord,
});

function ViewRecord() {
  const { resource, id } = Route.useParams();
  const { title, spec } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/admin/$resource/$id/edit" params={{ resource, id }} className="hover:underline">
            Edit
          </Link>
          <Link
            to="/admin/$resource"
            params={{ resource }}
            search={{ page: 1 }}
            className="hover:underline"
          >
            Back
          </Link>
        </div>
      </div>
      <InfolistRenderer spec={spec} />
    </div>
  );
}
