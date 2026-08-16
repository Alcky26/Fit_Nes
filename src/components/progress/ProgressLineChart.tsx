import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from '../../analytics/exerciseProgress'

interface ProgressLineChartProps {
  data: ChartPoint[]
}

export function ProgressLineChart({ data }: ProgressLineChartProps) {
  if (data.length === 0) {
    return <p className="placeholder-note">Not enough data to chart yet.</p>
  }

  return (
    <div className="period-chart">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-text)' }}
          />
          <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
