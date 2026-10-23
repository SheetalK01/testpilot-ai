import { forwardRef } from 'react';
import { cn } from '../../services/cn';
import Spinner from './Spinner';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-accent to-accent-2 text-white shadow-card hover:brightness-110 hover:shadow-pop active:brightness-95',
  secondary:
    'border border-line bg-surface text-fg shadow-card hover:border-accent/40 hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white shadow-card hover:brightness-110 dark:text-slate-950',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
};

const SIZES = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-6 text-base',
  icon: 'size-9 rounded-lg',
};

const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const isButton = Component === 'button';
  return (
    <Component
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition duration-200 select-none',
        'disabled:pointer-events-none disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={isButton ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      {...(isButton && !props.type ? { type: 'button' } : {})}
      {...props}
    >
      {loading ? <Spinner /> : Icon && <Icon className="size-4" aria-hidden="true" />}
      {children}
    </Component>
  );
});

export default Button;
