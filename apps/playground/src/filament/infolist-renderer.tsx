import type { ResolvedEntry } from '@filamentjs/infolists';
import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';

const badgeColors: Record<string, string> = {
  gray: 'border-transparent bg-muted text-muted-foreground',
  green: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  red: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  blue: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  yellow: 'border-transparent bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
};

export function InfolistRenderer({ spec }: { spec: ResolvedEntry[] }) {
  return <div className="flex flex-col gap-4">{spec.map(renderEntry)}</div>;
}

function renderEntry(entry: ResolvedEntry, key: number) {
  if (entry.type === 'section') {
    return (
      <section key={key} className="rounded-md border p-4">
        {entry.heading ? <h2 className="mb-3 text-sm font-medium">{entry.heading}</h2> : null}
        <div className="flex flex-col gap-4">{entry.children?.map(renderEntry)}</div>
      </section>
    );
  }

  if (entry.type === 'grid') {
    return (
      <div key={key} className={cn('grid gap-4', `grid-cols-${entry.columns ?? 1}`)}>
        {entry.children?.map(renderEntry)}
      </div>
    );
  }

  const value = entry.value;
  let content: React.ReactNode;

  if (value === null || value === '') {
    content = <span className="text-sm text-muted-foreground">-</span>;
  } else if (entry.type === 'badge') {
    const label = String(value);
    content = <Badge className={badgeColors[entry.colors?.[label] ?? ''] ?? ''}>{label}</Badge>;
  } else if (entry.type === 'boolean') {
    content = <span className="text-sm">{value ? 'Yes' : 'No'}</span>;
  } else if (entry.type === 'image') {
    content = <img src={String(value)} alt={entry.label ?? ''} className="max-h-40 rounded-md" />;
  } else if (entry.type === 'code') {
    content = (
      <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{String(value)}</pre>
    );
  } else {
    content = <span className="text-sm whitespace-pre-wrap">{String(value)}</span>;
  }

  return (
    <div key={key} className="flex flex-col gap-1.5">
      {entry.label ? (
        <span className="text-sm font-medium text-muted-foreground">{entry.label}</span>
      ) : null}
      {content}
    </div>
  );
}
