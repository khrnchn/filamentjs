import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { getResourceForm, resolveForm, saveResource, type FormCell } from '~/server/resource-fns';
import { FormRenderer } from '~/filament/form-renderer';
import { useToast } from '~/components/toaster';

export const Route = createFileRoute('/admin/$resource_/new')({
  loader: ({ params }) => getResourceForm({ data: { slug: params.resource } }),
  component: NewRecord,
});

function NewRecord() {
  const { resource } = Route.useParams();
  const { title, spec, values } = Route.useLoaderData();
  const navigate = useNavigate();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async (next: Record<string, unknown>) => {
    const result = await saveResource({
      data: { slug: resource, values: next as Record<string, FormCell> },
    });
    if (result.ok) {
      toast(`${title} created`);
      navigate({ to: '/admin/$resource', params: { resource }, search: { page: 1 } });
      return;
    }
    setErrors(result.errors ?? {});
    // field errors already render inline; anything else needs surfacing
    if (result.error) toast(result.error, 'error');
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New {title}</h1>
        <Link to="/admin/$resource" params={{ resource }} search={{ page: 1 }} className="text-sm hover:underline">
          Back
        </Link>
      </div>
      <FormRenderer
        spec={spec}
        initialValues={values}
        errors={errors}
        onSubmit={onSubmit}
        onLiveChange={async (next) => {
          const result = await resolveForm({
            data: { slug: resource, values: next as Record<string, FormCell> },
          });
          return result.spec;
        }}
      />
    </div>
  );
}
