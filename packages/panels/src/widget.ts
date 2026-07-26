import type { PolicyUser, Widget } from './types.js';

export function defineWidget(widget: Widget): Widget {
  return { ...widget, columnSpan: widget.columnSpan ?? 1, roles: widget.roles ?? [] };
}

// Same coarse gate as resources: no declared roles means everyone sees it.
export function widgetVisible(widget: Widget, user: PolicyUser): boolean {
  if (!widget.roles?.length) return true;
  return widget.roles.includes(user.role ?? '');
}
