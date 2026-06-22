import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { qualityTrend, topicData } from '../../constants'
import type { TopicData } from '../../types'

export function ChartsSection({ topics, quality }: { topics?: TopicData[]; quality?: number }) {
  return (
    <div className="analytics-grid">
      <div className="chart-panel wide">
        <div className="chart-heading"><div><h3>Response quality trend</h3><span>Quality score based on ratings and agent actions</span></div><strong>{quality ?? 0}/100</strong></div>
        <ResponsiveContainer width="100%" height={290}>
          <AreaChart data={qualityTrend} margin={{ top: 16, right: 8, left: -24, bottom: 0 }}>
            <defs><linearGradient id="tealFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d8176" stopOpacity={0.22} /><stop offset="100%" stopColor="#0d8176" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eceb" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#737b79' }} />
            <YAxis domain={[60, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#737b79' }} />
            <Tooltip />
            <Area type="monotone" dataKey="quality" stroke="#0d8176" strokeWidth={2.5} fill="url(#tealFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-panel">
        <div className="chart-heading"><div><h3>Top support topics</h3><span>Conversation volume</span></div></div>
        <ResponsiveContainer width="100%" height={290}>
          <BarChart data={topics?.length ? topics : topicData} layout="vertical" margin={{ top: 12, right: 12, left: 2, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9eceb" />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="topic" tickLine={false} axisLine={false} width={68} tick={{ fontSize: 12, fill: '#58615f' }} />
            <Tooltip />
            <Bar dataKey="conversations" fill="#165c56" radius={[0, 4, 4, 0]} barSize={17} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
