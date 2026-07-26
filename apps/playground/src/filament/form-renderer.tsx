import { useState, type FormEvent } from 'react';
import type { ResolvedNode } from '@filamentjs/forms';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface FormRendererProps {
  spec: ResolvedNode[];
  initialValues: Record<string, unknown>;
  errors?: Record<string, string>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
}

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function FormRenderer({ spec, initialValues, errors, onSubmit }: FormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [submitting, setSubmitting] = useState(false);

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  const renderNode = (node: ResolvedNode, key: number) => {
    if (node.visible === false) return null;

    if (node.type === 'section') {
      return (
        <fieldset key={key} className="rounded-md border p-4">
          {node.heading ? <legend className="px-1 text-sm font-medium">{node.heading}</legend> : null}
          <div className="flex flex-col gap-4">{node.children?.map(renderNode)}</div>
        </fieldset>
      );
    }

    if (node.type === 'grid') {
      return (
        <div key={key} className={cn('grid gap-4', `grid-cols-${node.columns ?? 1}`)}>
          {node.children?.map(renderNode)}
        </div>
      );
    }

    const name = node.name;
    if (!name) return null;

    const error = errors?.[name];
    const value = values[name];

    let control: React.ReactNode;
    if (node.type === 'textarea') {
      control = (
        <Textarea
          id={name}
          value={value == null ? '' : String(value)}
          disabled={node.disabled}
          onChange={(e) => setValue(name, e.target.value)}
        />
      );
    } else if (node.type === 'select' || node.type === 'relationSelect') {
      control = (
        <select
          id={name}
          className={inputClass}
          value={value == null ? '' : String(value)}
          disabled={node.disabled}
          onChange={(e) => setValue(name, e.target.value)}
        >
          {Object.entries(node.options ?? {}).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      );
    } else if (node.type === 'toggle' || node.type === 'checkbox') {
      control = (
        <input
          id={name}
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={Boolean(value)}
          disabled={node.disabled}
          onChange={(e) => setValue(name, e.target.checked)}
        />
      );
    } else {
      control = (
        <Input
          id={name}
          value={value == null ? '' : String(value)}
          disabled={node.disabled}
          onChange={(e) => setValue(name, e.target.value)}
        />
      );
    }

    return (
      <div key={key} className="flex flex-col gap-1.5">
        {node.label ? (
          <label htmlFor={name} className="text-sm font-medium">
            {node.label}
          </label>
        ) : null}
        {control}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {spec.map(renderNode)}
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
