export const TYPE_COLORS = { POSITIVE: '#10b981', NEGATIVE: '#ef4444', EDGE: '#f59e0b' };
export const PRIORITY_COLORS = { HIGH: '#8b5cf6', MEDIUM: '#0ea5e9', LOW: '#94a3b8' };

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    color: 'var(--fg)',
    fontSize: 13,
  },
  itemStyle: { color: 'var(--fg)' },
  labelStyle: { color: 'var(--muted)' },
};

export function toLabel(key) {
  return key.charAt(0) + key.slice(1).toLowerCase();
}
