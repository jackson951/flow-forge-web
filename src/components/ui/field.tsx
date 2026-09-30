import type { ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** Label + control + message. Pass `aria-describedby={`${id}-msg`}` to the control. */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {(error ?? hint) && (
        <p
          id={`${id}-msg`}
          className={error ? 'text-status-failed text-sm' : 'text-muted text-sm'}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
