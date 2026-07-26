import type { ResolvedNode } from '@filamentjs/forms';
import { FormRenderer } from '~/filament/form-renderer';
import { Button } from '~/components/ui/button';

interface ActionModalProps {
  label: string;
  spec: ResolvedNode[];
  running: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
}

export function ActionModal({ label, spec, running, onCancel, onSubmit }: ActionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{label}</h2>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={running}>
            Cancel
          </Button>
        </div>
        <FormRenderer spec={spec} initialValues={{}} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
