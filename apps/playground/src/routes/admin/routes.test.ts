import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import path from 'node:path';

// Regression: naming the view route `$resource_.$id.tsx` made it the PARENT of
// `$resource_.$id.edit.tsx`, so /admin/posts/<id>/edit rendered the read-only view and
// the edit form became unreachable. A route file that is a prefix of another route file
// has to be an index leaf, otherwise it swallows its siblings unless it renders an Outlet.
describe('admin route files', () => {
  const files = readdirSync(path.resolve(__dirname)).filter(
    (name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'),
  );

  it('has both a record view and a record edit route', () => {
    expect(files).toContain('$resource_.$id.index.tsx');
    expect(files).toContain('$resource_.$id.edit.tsx');
  });

  it('never leaves a non-index route as the parent of another route', () => {
    const segments = files.map((name) => name.replace(/\.tsx$/, ''));
    const parents = segments.filter((candidate) =>
      segments.some((other) => other !== candidate && other.startsWith(`${candidate}.`)),
    );
    const offenders = parents.filter((parent) => !parent.endsWith('.index') && parent !== 'route');
    expect(offenders).toEqual([]);
  });
});
