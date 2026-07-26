import type { PanelInput, Panel, Resource, NavItem, NavGroup } from './types.js';
import { defineWidget } from './widget.js';

export function definePanel(input: PanelInput): Panel {
  const basePath = input.basePath ?? '/admin';
  const brand = input.brand ?? 'FilamentJS';
  const resources = input.resources;

  const itemsByGroup = new Map<string | null, NavItem[]>();
  for (const resource of resources) {
    const groupKey = resource.nav.group ?? null;
    const item: NavItem = {
      slug: resource.slug,
      label: resource.pluralName,
      href: `${basePath}/${resource.slug}`,
      icon: resource.nav.icon,
      sort: resource.nav.sort ?? 0,
    };
    const bucket = itemsByGroup.get(groupKey);
    if (bucket) bucket.push(item);
    else itemsByGroup.set(groupKey, [item]);
  }

  // Ordered named groups: navGroups order first, then any remaining named
  // groups in insertion order. The null (ungrouped) group always goes last.
  const orderedNames: string[] = [];
  for (const name of input.navGroups ?? []) {
    if (itemsByGroup.has(name) && !orderedNames.includes(name)) orderedNames.push(name);
  }
  for (const key of itemsByGroup.keys()) {
    if (key !== null && !orderedNames.includes(key)) orderedNames.push(key);
  }

  const nav: NavGroup[] = [];
  const collect = (label: string | null) => {
    const items = itemsByGroup.get(label);
    if (!items) return;
    items.sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
    nav.push({ label, items });
  };
  for (const name of orderedNames) collect(name);
  collect(null);

  return {
    basePath,
    brand,
    resources,
    widgets: (input.widgets ?? []).map(defineWidget),
    nav,
    getResource(slug: string): Resource | undefined {
      return resources.find((r) => r.slug === slug);
    },
  };
}
