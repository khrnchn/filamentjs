import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getPath, setPath } from '@filamentjs/core';
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
  onLiveChange?: (values: Record<string, unknown>) => Promise<ResolvedNode[]>;
}

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function FormRenderer({
  spec,
  initialValues,
  errors,
  onSubmit,
  onLiveChange,
}: FormRendererProps) {
  const [resolvedSpec, setResolvedSpec] = useState(spec);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const valuesRef = useRef(values);
  const liveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const liveSequence = useRef(0);

  useEffect(() => {
    setResolvedSpec(spec);
  }, [spec]);

  useEffect(
    () => () => {
      if (liveTimer.current) clearTimeout(liveTimer.current);
      liveSequence.current += 1;
    },
    [],
  );

  const setValue = (node: ResolvedNode, value: unknown) => {
    if (!node.name) return;
    // names can be nested ("meta.author") or row scoped ("links.0.label"), so write by path
    const nextValues = structuredClone(valuesRef.current);
    setPath(nextValues, node.name, value);
    valuesRef.current = nextValues;
    setValues(nextValues);

    if (!node.live || !onLiveChange) return;
    const sequence = ++liveSequence.current;
    if (liveTimer.current) clearTimeout(liveTimer.current);
    liveTimer.current = setTimeout(async () => {
      try {
        const nextSpec = await onLiveChange(nextValues);
        if (sequence === liveSequence.current) setResolvedSpec(nextSpec);
      } catch (error) {
        console.error('Could not refresh form', error);
      }
    }, 300);
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
    const value = getPath(values, name);

    if (node.type === 'repeater') {
      const rows = Array.isArray(value) ? (value as unknown[]) : [];
      const atMax = node.maxItems !== undefined && rows.length >= node.maxItems;
      const atMin = node.minItems !== undefined && rows.length <= node.minItems;

      const writeRows = (next: unknown[]) => {
        const nextValues = structuredClone(valuesRef.current);
        setPath(nextValues, name, next);
        valuesRef.current = nextValues;
        setValues(nextValues);
      };

      return (
        <div key={key} className="flex flex-col gap-2">
          {node.label ? <span className="text-sm font-medium">{node.label}</span> : null}
          <div className="flex flex-col gap-3">
            {(node.rows ?? []).map((rowNodes, index) => (
              <div key={index} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {node.itemLabel
                      ? String(
                          (rows[index] as Record<string, unknown> | undefined)?.[node.itemLabel] ??
                            `Item ${index + 1}`,
                        )
                      : `Item ${index + 1}`}
                  </span>
                  <button
                    type="button"
                    disabled={atMin}
                    onClick={() => writeRows(rows.filter((_, i) => i !== index))}
                    className="text-xs text-destructive hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-col gap-3">{rowNodes.map(renderNode)}</div>
              </div>
            ))}
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={atMax}
              onClick={() => writeRows([...rows, {}])}
            >
              Add
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      );
    }

    let control: React.ReactNode;
    if (node.type === 'textarea') {
      control = (
        <Textarea
          id={name}
          value={value == null ? '' : String(value)}
          disabled={node.disabled}
          onChange={(e) => setValue(node, e.target.value)}
        />
      );
    } else if (node.type === 'select' || node.type === 'relationSelect') {
      control = (
        <select
          id={name}
          className={inputClass}
          value={value == null ? '' : String(value)}
          disabled={node.disabled}
          onChange={(e) => setValue(node, e.target.value)}
        >
          {Object.entries(node.options ?? {}).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      );
    } else if (node.type === 'fileUpload') {
      const stored = value == null ? '' : String(value);
      control = (
        <div className="flex flex-col gap-2">
          {stored ? (
            <div className="flex items-center gap-3">
              <img
                src={`/api/uploads/${stored}`}
                alt=""
                className="h-16 w-16 rounded border object-cover"
              />
              <button
                type="button"
                onClick={() => setValue(node, null)}
                className="text-sm text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ) : null}
          <input
            id={name}
            type="file"
            accept={node.accept?.join(',')}
            disabled={node.disabled || uploading === name}
            className="text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (node.maxSize !== undefined && file.size > node.maxSize) {
                setUploadError(`That file is larger than ${Math.round(node.maxSize / 1000)} kB`);
                return;
              }
              setUploadError(null);
              setUploading(name);
              try {
                const body = new FormData();
                body.append('file', file);
                const res = await fetch('/api/uploads/', { method: 'POST', body });
                if (!res.ok) {
                  setUploadError('Upload failed');
                  return;
                }
                const stored = (await res.json()) as { path: string };
                setValue(node, stored.path);
              } finally {
                setUploading(null);
              }
            }}
          />
          {uploading === name ? <span className="text-xs text-muted-foreground">Uploading...</span> : null}
          {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
        </div>
      );
    } else if (node.type === 'toggle' || node.type === 'checkbox') {
      control = (
        <input
          id={name}
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={Boolean(value)}
          disabled={node.disabled}
          onChange={(e) => setValue(node, e.target.checked)}
        />
      );
    } else {
      control = (
        <Input
          id={name}
          value={value == null ? '' : String(value)}
          disabled={node.disabled}
          onChange={(e) => setValue(node, e.target.value)}
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
      {resolvedSpec.map(renderNode)}
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
