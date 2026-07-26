import { createServerFn } from '@tanstack/react-start';
import type { NavGroup } from '@filamentjs/panels';
import { panel } from '~/filament/panel';

// The panel module reaches resource definitions, which hold Drizzle models and action
// handlers, so it must never be imported from a component. The shell asks for the
// serializable chrome instead.
export const getPanelChrome = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ brand: string; nav: NavGroup[] }> => ({
    brand: panel.brand,
    nav: panel.nav,
  }),
);
