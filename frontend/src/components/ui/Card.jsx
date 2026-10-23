import { cn } from '../../services/cn';

export default function Card({ as: Component = 'div', className, children, ...props }) {
  return (
    <Component
      className={cn('rounded-2xl border border-line bg-surface shadow-card', className)}
      {...props}
    >
      {children}
    </Component>
  );
}
