import type { AnyBuilder } from '@filamentjs/forms';
import type { TableConfig } from '@filamentjs/tables';

export interface NavMeta {
  group?: string;
  icon?: string;
  sort?: number;
}

export interface ResourceInput<Model = unknown> {
  name: string;
  pluralName?: string;
  slug: string;
  model: Model;
  form: AnyBuilder[];
  table: TableConfig;
  nav?: NavMeta;
  roles?: string[];
}

export interface Resource<Model = unknown> {
  name: string;
  pluralName: string;
  slug: string;
  model: Model;
  form: AnyBuilder[];
  table: TableConfig;
  nav: NavMeta;
  roles: string[];
}

export interface PanelInput {
  basePath?: string;
  brand?: string;
  resources: Resource[];
  navGroups?: string[];
}

export interface NavItem {
  slug: string;
  label: string;
  href: string;
  icon?: string;
  sort: number;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export interface Panel {
  basePath: string;
  brand: string;
  resources: Resource[];
  nav: NavGroup[];
  getResource(slug: string): Resource | undefined;
}
