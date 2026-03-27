import { useEffect, useState } from 'react'
import { getQueryHistory } from '../api/client'

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getQueryHistory()
      .then((r) => setHistory(r.data || []))
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleString()
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary"> Query History</h1>
          <p className="text-sm text-text-secondary mt-0.5">Previous SQL Agent queries</p>
        </div>
        {!loading && (
          <span className="badge-blue font-mono">{history.length} queries</span>
        )}
      </div>

      {error && (
        <div className="bg-red/10 border border-red/30 text-red text-xs px-3 py-2 rounded-lg font-mono mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-t-blue border-border rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-text-secondary text-sm">No query history yet</p>
          <p className="text-text-dim text-xs mt-1">Queries from the SQL Agent will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item, i) => (
            <div
              key={item.id || i}
              className="card p-4 cursor-pointer hover:border-border-light transition-colors"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm text-text-primary font-medium flex-1">{item.query}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.result_count != null && (
                    <span className="badge-blue text-[10px]">{item.result_count} rows</span>
                  )}
                  {item.error ? (
                    <span className="badge-red text-[10px]">ERROR</span>
                  ) : (
                    <span className="badge-green text-[10px]">OK</span>
                  )}
                  <svg
                    className={`w-4 h-4 text-text-dim transition-transform ${expanded === i ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-dim font-mono">
                <span>{formatDate(item.created_at || item.timestamp)}</span>
              </div>

              {expanded === i && item.sql && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-text-dim font-mono mb-1.5">Generated SQL</p>
                  <pre className="font-mono text-xs text-cyan whitespace-pre-wrap leading-relaxed bg-[#05070f] border border-[#1e2640] rounded p-3">
                    {item.sql}
                  </pre>
                </div>
              )}
              {expanded === i && item.error && (
                <div className="mt-3 bg-red/10 border border-red/30 rounded-lg px-3 py-2 text-red text-xs font-mono">
                  {item.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
