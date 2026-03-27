import { useState } from 'react'
import { getAnalytics, getDeptPerformance, exportCSV, getHonorRoll, getProbation, exportPDF } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const COLORS = ['#3d7eff', '#00e5c8', '#39d98a', '#ff8c42', '#ff4d6a']

const reports = [
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    desc: 'Academic metrics by department',
    color: 'blue',
    icon: '📊',
  },
  {
    id: 'dept',
    title: 'Department Performance Report',
    desc: 'Avg GPA and student count per department',
    color: 'cyan',
    icon: '🏛',
  },
  {
    id: 'honor',
    title: 'Honor Roll Report',
    desc: 'Students with GPA ≥ 3.5',
    color: 'green',
    icon: '🎓',
  },
  {
    id: 'probation',
    title: 'Academic Probation Report',
    desc: 'Students with GPA < 2.0',
    color: 'red',
    icon: '⚠️',
  },
  {
    id: 'csv',
    title: 'Export All Students',
    desc: 'Download all student records as CSV',
    color: 'orange',
    icon: '📥',
  },
  {
    id: 'pdf',
    title: 'Generate PDF Report',
    desc: 'Create printable PDF report',
    color: 'blue',
    icon: '📄',
  },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scheduledReports, setScheduledReports] = useState([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ email: '', report: 'analytics', frequency: 'weekly' })

  const runReport = async (id) => {
    if (id === 'csv') {
      try {
        const res = await exportCSV()
        const url = URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = 'students.csv'
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        setError('CSV export failed')
      }
      return
    }
    if (id === 'pdf') {
      try {
        const res = await exportPDF()
        const url = URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = 'student_report.txt'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch {
        setError('PDF export failed')
      }
      return
    }
    setActiveReport(id)
    setLoading(true)
    setError('')
    setData(null)
    try {
      if (id === 'analytics') {
        const res = await getAnalytics()
        setData(res.data)
      } else if (id === 'dept') {
        const res = await getDeptPerformance()
        setData(res.data)
      } else if (id === 'honor') {
        const res = await getHonorRoll()
        setData(res.data)
      } else if (id === 'probation') {
        const res = await getProbation()
        setData(res.data)
      }
    } catch {
      setError('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
          <p className="text-sm text-text-secondary mt-0.5">Generate and download student data reports</p>
        </div>
      </div>

      {error && (
        <div className="bg-red/10 border border-red/30 text-red text-xs px-3 py-2 rounded-lg font-mono mb-4">
          {error}
        </div>
      )}

      {/* Report cards */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Available Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => runReport(r.id)}
              className={`card p-5 text-left transition-all hover:border-border-light group ${
                activeReport === r.id ? 'border-blue/50 bg-blue/5' : ''
              }`}
            >
              <div className="text-2xl mb-2">{r.icon}</div>
              <p className="text-sm font-semibold text-text-primary mb-1">{r.title}</p>
              <p className="text-xs text-text-dim">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Report Output */}
      {activeReport && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            {reports.find((r) => r.id === activeReport)?.title}
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-t-blue border-border rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              {activeReport === 'analytics' && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card p-4 border-blue/20 bg-blue/5">
                      <p className="text-xs text-text-secondary">Total Students</p>
                      <p className="text-2xl font-bold text-blue">{data.total_students}</p>
                    </div>
                    <div className="card p-4 border-green/25 bg-green/5">
                      <p className="text-xs text-text-secondary">Active</p>
                      <p className="text-2xl font-bold text-green">{data.active_students}</p>
                    </div>
                    <div className="card p-4 border-cyan/25 bg-cyan/10">
                      <p className="text-xs text-text-secondary">Avg GPA</p>
                      <p className="text-2xl font-bold text-cyan">{data.average_gpa?.toFixed(2)}</p>
                    </div>
                    <div className="card p-4 border-orange/25 bg-orange/10">
                      <p className="text-xs text-text-secondary">Departments</p>
                      <p className="text-2xl font-bold text-orange">{data.total_departments}</p>
                    </div>
                  </div>
                  {data.grad_year_distribution?.length > 0 && (
                    <div>
                      <p className="text-xs text-text-secondary mb-2">Students by Graduation Year</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={data.grad_year_distribution} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e2640" />
                          <XAxis dataKey="year" tick={{ fill: '#8892a4', fontSize: 11 }} />
                          <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" fill="#3d7eff" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
              {activeReport === 'dept' && (
                <div>
                  {data.department_breakdown?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.department_breakdown} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2640" />
                        <XAxis dataKey="name" tick={{ fill: '#8892a4', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Students" fill="#00e5c8" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="avg_gpa" name="Avg GPA" fill="#3d7eff" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-text-dim text-sm">No data</p>
                  )}
                </div>
              )}
              {activeReport === 'honor' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🎓</span>
                    <div>
                      <p className="text-sm font-semibold text-green">Honor Roll</p>
                      <p className="text-xs text-text-dim">{data.count} students with GPA ≥ {data.threshold}</p>
                    </div>
                  </div>
                  {data.students?.length === 0 ? (
                    <p className="text-text-dim text-sm">No students on honor roll</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-text-dim">
                          <th className="text-left py-2">Name</th>
                          <th className="text-left py-2">Department</th>
                          <th className="text-left py-2">GPA</th>
                          <th className="text-left py-2">Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.students.map((s) => (
                          <tr key={s.id} className="border-b border-border/50 hover:bg-surface2/30">
                            <td className="py-2 font-medium text-text-primary">{s.name}</td>
                            <td className="py-2 text-text-secondary">{s.department}</td>
                            <td className="py-2"><span className="badge-green">{s.gpa}</span></td>
                            <td className="py-2 font-mono text-text-secondary">{s.credits}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {activeReport === 'probation' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-red">Academic Probation</p>
                      <p className="text-xs text-text-dim">{data.count} students with GPA &lt; {data.threshold}</p>
                    </div>
                  </div>
                  {data.students?.length === 0 ? (
                    <p className="text-text-dim text-sm">No students on academic probation</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-text-dim">
                          <th className="text-left py-2">Name</th>
                          <th className="text-left py-2">Department</th>
                          <th className="text-left py-2">GPA</th>
                          <th className="text-left py-2">Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.students.map((s) => (
                          <tr key={s.id} className="border-b border-border/50 hover:bg-surface2/30">
                            <td className="py-2 font-medium text-text-primary">{s.name}</td>
                            <td className="py-2 text-text-secondary">{s.department}</td>
                            <td className="py-2"><span className="badge-red">{s.gpa}</span></td>
                            <td className="py-2 font-mono text-text-secondary">{s.credits}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Scheduled Reports */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Scheduled Reports</h2>
        <div className="card p-5">
          {scheduledReports.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-text-secondary text-sm">No scheduled reports yet</p>
              <p className="text-text-dim text-xs">Set up automated email reports</p>
              <button className="btn-primary text-xs" onClick={() => setShowScheduleModal(true)}>Schedule Email Report</button>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledReports.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-text-primary">{r.name}</p>
                    <p className="text-[10px] text-text-dim font-mono">{r.email} · {r.schedule}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-green text-[10px]">Active</span>
                    <button onClick={() => setScheduledReports(prev => prev.filter(x => x.id !== r.id))}
                      className="text-xs text-text-dim hover:text-red transition-colors">Remove</button>
                  </div>
                </div>
              ))}
              <div className="pt-3 flex justify-center">
                <button className="btn-primary text-xs" onClick={() => setShowScheduleModal(true)}>Schedule Another</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0c0f1e] border border-[#1e2640] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary">Schedule Email Report</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-text-dim hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Email Address</label>
                <input className="input w-full" type="email" placeholder="admin@iit.edu"
                  value={scheduleForm.email}
                  onChange={e => setScheduleForm({...scheduleForm, email: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Report Type</label>
                <select className="input w-full" value={scheduleForm.report}
                  onChange={e => setScheduleForm({...scheduleForm, report: e.target.value})}>
                  <option value="analytics">Analytics Dashboard</option>
                  <option value="dept">Department Performance</option>
                  <option value="honor">Honor Roll</option>
                  <option value="probation">Academic Probation</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Frequency</label>
                <select className="input w-full" value={scheduleForm.frequency}
                  onChange={e => setScheduleForm({...scheduleForm, frequency: e.target.value})}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowScheduleModal(false)}
                  className="flex-1 bg-[#1e2640] text-white px-3 py-2 rounded hover:bg-[#2e3650] text-sm">
                  Cancel
                </button>
                <button onClick={() => {
                  if (!scheduleForm.email) return
                  setScheduledReports(prev => [...prev, {
                    id: Date.now(),
                    name: reports.find(r => r.id === scheduleForm.report)?.title || scheduleForm.report,
                    email: scheduleForm.email,
                    schedule: scheduleForm.frequency.charAt(0).toUpperCase() + scheduleForm.frequency.slice(1),
                  }])
                  setShowScheduleModal(false)
                }} className="flex-1 bg-[#3d7eff] text-white px-4 py-2 rounded hover:bg-[#2d6eef] text-sm">
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
