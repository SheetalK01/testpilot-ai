import { forwardRef, useId } from 'react';
import { cn } from '../../services/cn';

const CONTROL =
  'w-full rounded-xl border bg-surface px-3.5 text-sm text-fg shadow-xs transition placeholder:text-subtle ' +
  'focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none disabled:opacity-60';

/** Label, control, hint and error wired together with ids and aria attributes. */
function FieldShell({ id, label, hint, error, required, children, className, labelAction }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {labelAction}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function controlProps(id, error, hint, required) {
  return {
    id,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  };
}

export const Input = forwardRef(function Input(
  { label, hint, error, required, className, inputClassName, labelAction, trailing, ...props },
  ref,
) {
  const id = useId();
  return (
    <FieldShell {...{ id, label, hint, error, required, className, labelAction }}>
      <div className="relative">
        <input
          ref={ref}
          className={cn(
            CONTROL,
            'h-11',
            trailing && 'pr-11',
            error ? 'border-danger' : 'border-line',
            inputClassName,
          )}
          {...controlProps(id, error, hint, required)}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, required, className, rows = 4, ...props },
  ref,
) {
  const id = useId();
  return (
    <FieldShell {...{ id, label, hint, error, required, className }}>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          CONTROL,
          'resize-y py-2.5 leading-relaxed',
          error ? 'border-danger' : 'border-line',
        )}
        {...controlProps(id, error, hint, required)}
        {...props}
      />
    </FieldShell>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, required, className, options, ...props },
  ref,
) {
  const id = useId();
  return (
    <FieldShell {...{ id, label, hint, error, required, className }}>
      <select
        ref={ref}
        className={cn(CONTROL, 'h-11 cursor-pointer', error ? 'border-danger' : 'border-line')}
        {...controlProps(id, error, hint, required)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});
