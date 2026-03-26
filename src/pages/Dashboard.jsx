import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnalytics } from '../api/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const StatCard = ({ label, value, sub, color = 'blue' }) => {
  const colorMap = {
    blue: 'text-blue border-blue/20 bg-blue/5',
    cyan: 'text-cyan border-cyan/25 bg-cyan/10',
    green: 'text-green border-green/25 bg-green/10',
    orange: 'text-orange border-orange/25 bg-orange/10',
  }
  return (
    <div className={`card p-5 border ${colorMap[color]}`}>
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorMap[color].split(' ')[0]}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-text-dim mt-1">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAnalytics()
      .then((r) => setData(r.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-t-blue border-border rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics Dashboard</h1>
          <p className="text-sm text-text-secondary mt-0.5">Academic metrics overview</p>
        </div>
        <span className="badge-cyan font-mono">LIVE</span>
      </div>

      {error && (
        <div className="bg-red/10 border border-red/30 text-red text-xs px-3 py-2 rounded-lg font-mono mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={data?.total_students} color="blue" />
        <StatCard label="Active Students" value={data?.active_students} color="green" />
        <StatCard label="Average GPA" value={data?.average_gpa?.toFixed(2)} color="cyan" sub="Across all departments" />
        <StatCard label="Departments" value={data?.total_departments} color="orange" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* GPA Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">GPA Distribution</h3>
          {data?.gpa_distribution?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.gpa_distribution} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2640" />
                <XAxis dataKey="range" tick={{ fill: '#8892a4', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3d7eff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-dim text-sm">
              No data available
            </div>
          )}
        </div>

        {/* Students by Graduation Year */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Students by Graduation Year</h3>
          {data?.grad_year_distribution?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.grad_year_distribution} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2640" />
                <XAxis dataKey="year" tick={{ fill: '#8892a4', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#00e5c8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-text-dim text-sm">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Department Breakdown</h3>
        {data?.department_breakdown?.length ? (
          <div className="space-y-3">
            {data.department_breakdown.map((dept) => (
              <div key={dept.name}>
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span>{dept.name}</span>
                  <span className="font-mono">{dept.count} students · avg GPA {dept.avg_gpa?.toFixed(2)}</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="bg-blue h-1 rounded-full transition-all"
                    style={{ width: `${Math.min((dept.count / (data.total_students || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-dim text-sm text-center py-4">No department data</p>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[
          { label: 'SQL Agent', desc: 'Ask anything about the student database', path: '/agent', color: 'blue' },
          { label: 'Doc Intel', desc: 'Ask questions about uploaded documents', path: '/rag', color: 'cyan' },
          { label: 'Reports', desc: 'Generate and download student data reports', path: '/reports', color: 'green' },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`card p-4 border hover:border-border-light transition-colors group`}
          >
            <p className={`text-sm font-medium text-text-primary mb-1 group-hover:text-${item.color} transition-colors`}>
              {item.label}
            </p>
            <p className="text-xs text-text-dim">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
