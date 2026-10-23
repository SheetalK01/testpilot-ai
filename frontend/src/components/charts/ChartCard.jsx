import Card from '../ui/Card';

/** A chart with a heading and a text legend that doubles as the accessible description. */
export default function ChartCard({ title, subtitle, legend, children, ...props }) {
  return (
    <Card as="figure" className="flex flex-col p-5 sm:p-6" {...props}>
      <figcaption>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </figcaption>
      <div className="relative mt-4 h-52" aria-hidden="true">
        {children}
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {legend.map((item) => (
          <li key={item.key} className="rounded-xl bg-surface-2 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <span
                className="size-2 rounded-full"
                style={{ background: item.color }}
                aria-hidden="true"
              />
              {item.label}
            </div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums" data-key={item.key}>
              {item.value}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
