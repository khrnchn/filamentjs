import { FieldBuilder, SelectFieldBuilder, TextFieldBuilder } from './fields.js';
import { GridBuilder, SectionBuilder, type AnyBuilder } from './layout.js';

export const f = {
  text: (name: string) => new TextFieldBuilder('text', name),
  textarea: (name: string) => new TextFieldBuilder('textarea', name),
  select: (name: string) => new SelectFieldBuilder('select', name),
  multiSelect: (name: string) => new SelectFieldBuilder('multiSelect', name),
  radio: (name: string) => new SelectFieldBuilder('radio', name),
  checkboxList: (name: string) => new SelectFieldBuilder('checkboxList', name),
  checkbox: (name: string) => new FieldBuilder('checkbox', name),
  toggle: (name: string) => new FieldBuilder('toggle', name),
  datePicker: (name: string) => new FieldBuilder('datePicker', name),
  dateTimePicker: (name: string) => new FieldBuilder('dateTimePicker', name),
  section: (heading: string, children: AnyBuilder[]) => new SectionBuilder(heading, children),
  grid: (columns: number, children: AnyBuilder[]) => new GridBuilder(columns, children),
};
