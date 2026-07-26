import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LoadedWidget } from '~/server/widget-fns';

interface StatData {
  value: string | number;
  description?: string;
  trend?: number[];
}

interface ChartData {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
}

// Tailwind needs the full class name in the source, so spans are a lookup, not a template.
const spanClass: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
};

const seriesColors = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#06b6d4'];

export function WidgetGrid({ widgets }: { widgets: LoadedWidget[] }) {
  // Recharts measures the DOM, so it only renders after hydration. The server pass
  // emits the card shell and nothing inside the chart area.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {widgets.map((widget) => {
        const failed = typeof widget.data === 'object' && widget.data !== null && 'error' in widget.data;
        return (
          <div
            key={widget.name}
            className={`rounded-lg border bg-card p-4 ${spanClass[widget.columnSpan] ?? 'lg:col-span-1'} ${
              widget.type === 'chart' ? 'sm:col-span-2' : ''
            }`}
          >
            <div className="text-sm font-medium text-muted-foreground">{widget.title}</div>

            {failed ? (
              <div className="mt-3 text-sm text-destructive">
                {String((widget.data as { error: unknown }).error)}
              </div>
            ) : widget.type === 'stat' ? (
              <Stat data={widget.data as StatData} />
            ) : (
              <div className="mt-3 h-56">
                {mounted ? <Chart kind={widget.chart} data={widget.data as ChartData} /> : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ data }: { data: StatData }) {
  const trend = data.trend ?? [];
  const max = Math.max(1, ...trend);
  const points = trend
    .map((value, index) => `${(index / Math.max(1, trend.length - 1)) * 100},${28 - (value / max) * 26}`)
    .join(' ');

  return (
    <>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{data.value}</div>
      {data.description ? (
        <div className="mt-1 text-xs text-muted-foreground">{data.description}</div>
      ) : null}
      {trend.length > 1 ? (
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-8 w-full">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-primary"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
    </>
  );
}

function Chart({ kind, data }: { kind?: string; data: ChartData }) {
  const rows = data.labels.map((label, index) => {
    const row: Record<string, string | number> = { label };
    for (const series of data.series) row[series.name] = series.data[index] ?? 0;
    return row;
  });

  if (kind === 'pie') {
    const first = data.series[0];
    const slices = data.labels.map((label, index) => ({
      name: label,
      value: first?.data[index] ?? 0,
    }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Pie data={slices} dataKey="value" nameKey="name" outerRadius="80%">
            {slices.map((slice, index) => (
              <Cell key={slice.name} fill={seriesColors[index % seriesColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (kind === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" fontSize={11} />
          <YAxis allowDecimals={false} fontSize={11} width={30} />
          <Tooltip />
          {data.series.map((series, index) => (
            <Bar key={series.name} dataKey={series.name} fill={seriesColors[index % seriesColors.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="label" fontSize={11} />
        <YAxis allowDecimals={false} fontSize={11} width={30} />
        <Tooltip />
        {data.series.map((series, index) => (
          <Line
            key={series.name}
            type="monotone"
            dataKey={series.name}
            stroke={seriesColors[index % seriesColors.length]}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
