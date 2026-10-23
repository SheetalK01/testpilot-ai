import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard';
import { TOOLTIP_STYLE, TYPE_COLORS, toLabel } from './palette';

export default function TypeDonut({ byType }) {
  const data = Object.entries(byType).map(([key, value]) => ({ key, name: toLabel(key), value }));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const legend = data.map((item) => ({ ...item, label: item.name, color: TYPE_COLORS[item.key] }));

  return (
    <ChartCard
      title="Test cases by type"
      subtitle="Coverage of happy paths, failures and edges"
      legend={legend}
      data-testid="chart-type"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer={false}>
          {total === 0 ? (
            <Pie
              rootTabIndex={-1}
              data={[{ value: 1 }]}
              dataKey="value"
              innerRadius="68%"
              outerRadius="92%"
              fill="var(--surface-2)"
              stroke="none"
              isAnimationActive={false}
            />
          ) : (
            <Pie
              rootTabIndex={-1}
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={3}
              cornerRadius={6}
              stroke="none"
            >
              {data.map((item) => (
                <Cell key={item.key} fill={TYPE_COLORS[item.key]} />
              ))}
            </Pie>
          )}
          {total > 0 && <Tooltip {...TOOLTIP_STYLE} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-3xl font-semibold tabular-nums">{total}</div>
          <div className="text-xs text-muted">total</div>
        </div>
      </div>
    </ChartCard>
  );
}
