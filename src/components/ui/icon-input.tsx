import { Eye, EyeOff, Lock, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useState, type InputHTMLAttributes, type KeyboardEvent, type Ref } from 'react';
import { cn } from '@/lib/cn';
import { Input } from './input';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };

/** Input with a leading icon (icons-everywhere rule). */
export function IconInput({ icon: Icon, className, ...props }: InputProps & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon
        className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input className={cn('pl-9', className)} {...props} />
    </div>
  );
}

/**
 * Password field with show/hide and a Caps Lock warning (Part 12 — robust sign-in forms).
 * `describedBy` keeps the field's own message linked; the caps warning is added to it.
 */
export function PasswordInput({
  id,
  describedBy,
  ...props
}: Omit<InputProps, 'type'> & { id: string; describedBy?: string }) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) =>
    setCaps(e.getModifierState?.('CapsLock') ?? false);
  return (
    <div>
      <div className="relative">
        <Lock
          className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          {...props}
          id={id}
          type={visible ? 'text' : 'password'}
          className="pr-10 pl-9"
          aria-describedby={
            [describedBy, caps ? `${id}-caps` : null].filter(Boolean).join(' ') || undefined
          }
          onKeyUp={checkCaps}
          onKeyDown={checkCaps}
          onBlur={(e) => {
            setCaps(false);
            props.onBlur?.(e);
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label="Show password"
          title={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={id}
          className="text-muted hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {caps && (
        <p id={`${id}-caps`} className="text-status-warning mt-1 flex items-center gap-1 text-xs">
          <TriangleAlert className="size-3.5" aria-hidden />
          Caps Lock is on
        </p>
      )}
    </div>
  );
}
