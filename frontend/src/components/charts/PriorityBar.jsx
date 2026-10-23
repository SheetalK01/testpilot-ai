import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from './ChartCard';
import { PRIORITY_COLORS, TOOLTIP_STYLE, toLabel } from './palette';

export default function PriorityBar({ byPriority }) {
  const data = Object.entries(byPriority).map(([key, value]) => ({
    key,
    name: toLabel(key),
    value,
  }));
  const legend = data.map((item) => ({
    ...item,
    label: item.name,
    color: PRIORITY_COLORS[item.key],
  }));

  return (
    <ChartCard
      title="Test cases by priority"
      subtitle="Where to focus regression effort"
      legend={legend}
      data-testid="chart-priority"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          accessibilityLayer={false}
          margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        >
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} {...TOOLTIP_STYLE} />
          <Bar dataKey="value" name="Test cases" radius={[8, 8, 4, 4]} maxBarSize={56}>
            {data.map((item) => (
              <Cell key={item.key} fill={PRIORITY_COLORS[item.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
