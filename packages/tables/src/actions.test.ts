import { describe, it, expect } from 'vitest';
import { ActionBuilder } from './actions.js';

describe('ActionBuilder', () => {
  it('builds from a base node', () => {
    const node = new ActionBuilder({ type: 'edit', name: 'edit' }).label('Edit').icon('pencil').build();
    expect(node).toMatchObject({ type: 'edit', name: 'edit', label: 'Edit', icon: 'pencil' });
  });
  it('sets requiresConfirmation', () => {
    const node = new ActionBuilder({ type: 'delete', name: 'delete' }).requiresConfirmation().build();
    expect(node.requiresConfirmation).toBe(true);
  });
});
