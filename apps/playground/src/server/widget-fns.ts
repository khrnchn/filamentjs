import { createServerFn } from '@tanstack/react-start';
import { widgetVisible } from '@filamentjs/panels';
import { panel } from '~/filament/panel';
import { currentSession } from './session';

// Spelled out rather than `unknown` so the payload stays provably serializable.
export type WidgetData =
  | { value: string | number; description?: string; trend?: number[] }
  | { labels: string[]; series: Array<{ name: string; data: number[] }> }
  | { error: string };

export interface LoadedWidget {
  name: string;
  title: string;
  type: string;
  chart?: string;
  columnSpan: number;
  data: WidgetData;
}

export const loadWidgets = createServerFn({ method: 'GET' }).handler(
  async (): Promise<LoadedWidget[]> => {
    // The /admin route guard already redirects unauthenticated users, so reaching
    // here without a session is a hard error, same as the resource loaders.
    const session = await currentSession();
    if (!session) throw new Error('unauthorized');
    const user = { id: session.user.id, role: session.user.role };

    const visible = panel.widgets.filter((widget) => widgetVisible(widget, user));
    return Promise.all(
      visible.map(async (widget) => {
        const base = {
          name: widget.name,
          title: widget.title,
          type: widget.type,
          chart: widget.type === 'chart' ? widget.chart : undefined,
          columnSpan: widget.columnSpan ?? 1,
        };
        try {
          return { ...base, data: await widget.load({ user }) };
        } catch (e) {
          // One failing widget must not take the dashboard down.
          console.error(`Widget ${widget.name} failed to load`, e);
          return { ...base, data: { error: 'Could not load this widget.' } };
        }
      }),
    );
  },
);
