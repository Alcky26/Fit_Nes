import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface PeriodBarChartProps {
  data: { label: string; value: number }[]
  valueLabel?: string
}

export function PeriodBarChart({ data, valueLabel = 'Sets' }: PeriodBarChartProps) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="placeholder-note">No data to chart yet for this period.</p>
  }

  return (
    <div className="period-chart">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.06)' }}
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-text)' }}
          />
          <Bar dataKey="value" name={valueLabel} fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
