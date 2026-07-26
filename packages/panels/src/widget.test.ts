import { describe, it, expect } from 'vitest';
import { defineWidget, widgetVisible } from './widget.js';
import { definePanel } from './panel.js';
import type { StatWidget } from './types.js';

const stat = (name: string, extra: Partial<StatWidget> = {}): StatWidget => ({
  type: 'stat',
  name,
  title: name,
  load: async () => ({ value: 1 }),
  ...extra,
});

describe('defineWidget', () => {
  it('defaults columnSpan to 1 and roles to an empty array', () => {
    const w = defineWidget(stat('posts'));
    expect(w.columnSpan).toBe(1);
    expect(w.roles).toEqual([]);
  });

  it('keeps declared columnSpan and roles', () => {
    const w = defineWidget(stat('posts', { columnSpan: 2, roles: ['admin'] }));
    expect(w.columnSpan).toBe(2);
    expect(w.roles).toEqual(['admin']);
  });

  it('keeps the chart fields of a chart widget', () => {
    const w = defineWidget({
      type: 'chart',
      name: 'per-day',
      title: 'Per day',
      chart: 'line',
      load: async () => ({ labels: [], series: [] }),
    });
    expect(w.type).toBe('chart');
    expect(w.type === 'chart' && w.chart).toBe('line');
    expect(w.columnSpan).toBe(1);
  });
});

describe('widgetVisible', () => {
  it('allows a widget with no roles', () => {
    expect(widgetVisible(defineWidget(stat('posts')), { id: '1', role: 'user' })).toBe(true);
    expect(widgetVisible(defineWidget(stat('posts')), { id: '1' })).toBe(true);
  });

  it('picks the subset whose roles the user matches', () => {
    const widgets = [
      defineWidget(stat('open', {})),
      defineWidget(stat('admins', { roles: ['admin'] })),
      defineWidget(stat('editors', { roles: ['editor', 'admin'] })),
    ];
    const visible = (role: string | null) =>
      widgets.filter((w) => widgetVisible(w, { id: '1', role })).map((w) => w.name);

    expect(visible('admin')).toEqual(['open', 'admins', 'editors']);
    expect(visible('editor')).toEqual(['open', 'editors']);
    expect(visible(null)).toEqual(['open']);
  });
});

describe('definePanel widgets', () => {
  it('defaults to no widgets', () => {
    expect(definePanel({ resources: [] }).widgets).toEqual([]);
  });

  it('normalizes and preserves declaration order', () => {
    const panel = definePanel({
      resources: [],
      widgets: [stat('c'), stat('a', { columnSpan: 4 }), stat('b')],
    });
    expect(panel.widgets.map((w) => w.name)).toEqual(['c', 'a', 'b']);
    expect(panel.widgets.map((w) => w.columnSpan)).toEqual([1, 4, 1]);
  });
});
