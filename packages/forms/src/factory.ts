import {
  FieldBuilder,
  FileUploadFieldBuilder,
  RelationSelectFieldBuilder,
  RepeaterFieldBuilder,
  SelectFieldBuilder,
  TextFieldBuilder,
} from './fields.js';
import { GridBuilder, SectionBuilder, type AnyBuilder } from './layout.js';

// The plain fields, split out so a repeater row can be typed against them without the
// factory referencing itself. A row holds fields, not layout or further repeaters.
const rowFields = {
  text: (name: string) => new TextFieldBuilder('text', name),
  textarea: (name: string) => new TextFieldBuilder('textarea', name),
  select: (name: string) => new SelectFieldBuilder('select', name),
  relationSelect: (name: string) => new RelationSelectFieldBuilder('relationSelect', name),
  multiSelect: (name: string) => new SelectFieldBuilder('multiSelect', name),
  radio: (name: string) => new SelectFieldBuilder('radio', name),
  checkboxList: (name: string) => new SelectFieldBuilder('checkboxList', name),
  checkbox: (name: string) => new FieldBuilder('checkbox', name),
  toggle: (name: string) => new FieldBuilder('toggle', name),
  datePicker: (name: string) => new FieldBuilder('datePicker', name),
  dateTimePicker: (name: string) => new FieldBuilder('dateTimePicker', name),
  fileUpload: (name: string) => new FileUploadFieldBuilder('fileUpload', name),
};

export type RowFields = typeof rowFields;

export const f = {
  ...rowFields,
  // Row field names are keys inside the stored row object, not model columns, so the
  // children come from a callback holding the unnarrowed factory.
  repeater: (name: string, children: AnyBuilder[] | ((row: RowFields) => AnyBuilder[])) =>
    new RepeaterFieldBuilder(name, typeof children === 'function' ? children(rowFields) : children),
  section: (heading: string, children: AnyBuilder[]) => new SectionBuilder(heading, children),
  grid: (columns: number, children: AnyBuilder[]) => new GridBuilder(columns, children),
};
