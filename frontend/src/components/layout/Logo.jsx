import { Link } from 'react-router-dom';
import { cn } from '../../services/cn';

export function LogoMark({ className }) {
  return <img src="/logo.svg" alt="" className={cn('size-8', className)} width="32" height="32" />;
}

export default function Logo({ to = '/', className }) {
  return (
    <Link
      to={to}
      className={cn('flex items-center gap-2.5 rounded-lg font-semibold tracking-tight', className)}
    >
      <LogoMark />
      <span className="text-[17px]">
        TestPilot <span className="text-gradient">AI</span>
      </span>
    </Link>
  );
}
