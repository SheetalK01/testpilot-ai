import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../services/cn';
import { PriorityBadge, SourceTag, TypeBadge } from '../ui/Badge';

function Details({ testCase, id }) {
  return (
    <div id={id} className="grid gap-4 text-sm sm:grid-cols-[1fr_1.4fr_1fr]">
      <section>
        <h4 className="text-xs font-semibold tracking-wider text-subtle uppercase">
          Preconditions
        </h4>
        <p className="mt-1 text-muted">{testCase.preconditions || 'None'}</p>
      </section>
      <section>
        <h4 className="text-xs font-semibold tracking-wider text-subtle uppercase">Steps</h4>
        <ol className="mt-1 space-y-1.5">
          {testCase.steps.map((step, index) => (
            <li key={index} className="flex gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-fg">
                {index + 1}
              </span>
              <span className="text-fg">{step}</span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h4 className="text-xs font-semibold tracking-wider text-subtle uppercase">
          Expected result
        </h4>
        <p className="mt-1 text-fg">{testCase.expectedResult}</p>
      </section>
    </div>
  );
}

function RowActions({ testCase, onEdit, onDelete }) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(testCase)}
        className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
        aria-label={`Edit "${testCase.title}"`}
        data-testid="test-case-edit"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(testCase)}
        className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger-soft hover:text-danger"
        aria-label={`Delete "${testCase.title}"`}
        data-testid="test-case-delete"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ExpandButton({ expanded, controls, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      className="group flex min-w-0 items-start gap-2 rounded-md text-left"
    >
      <ChevronRight
        className={cn(
          'mt-0.5 size-4 shrink-0 text-subtle transition-transform',
          expanded && 'rotate-90',
        )}
        aria-hidden="true"
      />
      <span
        className="font-medium text-fg group-hover:text-accent-fg"
        data-testid="test-case-title"
      >
        {title}
      </span>
    </button>
  );
}

function stagger(index, animate) {
  return animate ? { animationDelay: `${Math.min(index, 14) * 70}ms` } : undefined;
}

function DesktopRow({ testCase, index, animate, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  return (
    <>
      <tr
        data-testid="test-case-row"
        data-type={testCase.type}
        className={cn(
          'border-t border-line align-top transition hover:bg-surface-2/50',
          animate && 'animate-rise',
        )}
        style={stagger(index, animate)}
      >
        <td className="py-3.5 pr-3 pl-5">
          <div className="flex flex-wrap items-center gap-2">
            <ExpandButton
              expanded={expanded}
              controls={detailsId}
              onClick={() => setExpanded((v) => !v)}
              title={testCase.title}
            />
            <SourceTag source={testCase.source} />
          </div>
        </td>
        <td className="px-3 py-3.5">
          <TypeBadge type={testCase.type} data-testid="test-case-type" />
        </td>
        <td className="px-3 py-3.5">
          <PriorityBadge priority={testCase.priority} data-testid="test-case-priority" />
        </td>
        <td className="py-2.5 pr-4 pl-3">
          <RowActions testCase={testCase} onEdit={onEdit} onDelete={onDelete} />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-2/40">
          <td colSpan={4} className="px-5 pt-1 pb-5 pl-11">
            <Details testCase={testCase} id={detailsId} />
          </td>
        </tr>
      )}
    </>
  );
}

function MobileCard({ testCase, index, animate, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  return (
    <li
      data-testid="test-case-row"
      data-type={testCase.type}
      className={cn('rounded-xl border border-line bg-surface p-4', animate && 'animate-rise')}
      style={stagger(index, animate)}
    >
      <div className="flex items-start justify-between gap-2">
        <ExpandButton
          expanded={expanded}
          controls={detailsId}
          onClick={() => setExpanded((v) => !v)}
          title={testCase.title}
        />
        <RowActions testCase={testCase} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
        <TypeBadge type={testCase.type} data-testid="test-case-type" />
        <PriorityBadge priority={testCase.priority} data-testid="test-case-priority" />
        <SourceTag source={testCase.source} />
      </div>
      {expanded && (
        <div className="mt-4 border-t border-line pt-4">
          <Details testCase={testCase} id={detailsId} />
        </div>
      )}
    </li>
  );
}

/** Table on desktop, stacked cards on small screens (only one is rendered at a time). */
export default function TestCaseTable({ testCases, animate = false, onEdit, onDelete }) {
  const desktop = useMediaQuery('(min-width: 768px)');
  const rowProps = { animate, onEdit, onDelete };

  if (!desktop) {
    return (
      <ul className="space-y-3" aria-label="Test cases">
        {testCases.map((testCase, index) => (
          <MobileCard key={testCase.id} testCase={testCase} index={index} {...rowProps} />
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Test cases. Select a title to show its steps.</caption>
        <thead className="bg-surface-2/60 text-left text-xs font-semibold tracking-wider text-subtle uppercase">
          <tr>
            <th scope="col" className="py-3 pr-3 pl-5">
              Test case
            </th>
            <th scope="col" className="w-32 px-3 py-3">
              Type
            </th>
            <th scope="col" className="w-32 px-3 py-3">
              Priority
            </th>
            <th scope="col" className="w-28 py-3 pr-5 pl-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {testCases.map((testCase, index) => (
            <DesktopRow key={testCase.id} testCase={testCase} index={index} {...rowProps} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
