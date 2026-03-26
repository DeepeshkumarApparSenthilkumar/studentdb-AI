import { useState, useRef, useEffect } from 'react'
import { runAgentQuery, getAgentStats } from '../api/client'

const EXAMPLES = [
  'Find all students named Sarah',
  'Show all active Computer Science students',
  'Show all students ordered by GPA descending',
  'Count students per graduation year',
  'Find top performer in each department',
  'Rank students within their department by GPA',
  'Show credit completion percentage per student',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-slide-up`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-cyan/20 border border-cyan/30 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className={`max-w-3xl ${isUser ? 'order-first' : ''}`}>
        {isUser ? (
          <div className="bg-blue/15 border border-blue/25 rounded-xl rounded-tr-sm px-4 py-2.5 text-sm text-text-primary">
            {msg.content}
          </div>
        ) : (
          <div className="space-y-2">
            {msg.sql && (
              <div className="bg-[#05070f] border border-[#1e2640] rounded p-4">
                <div className="flex items-center gap-1.5 text-xs text-text-dim font-mono mb-2">
                  <span className="badge-cyan text-[10px]">SQL</span>
                  Generated Query
                </div>
                <pre className="text-xs text-cyan font-mono whitespace-pre-wrap leading-relaxed">{msg.sql}</pre>
              </div>
            )}
            {msg.error ? (
              <div className="bg-red/10 border border-red/30 rounded-lg px-3 py-2 text-red text-xs font-mono">
                {msg.error}
              </div>
            ) : msg.results ? (
              <div className="bg-[#0c0f1e] border border-[#1e2640] rounded-lg overflow-hidden">
                {msg.results.length === 0 ? (
                  <p className="text-text-dim text-xs p-3 font-mono">No results</p>
                ) : (
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[#05070f] border-b border-[#1e2640] text-gray-400">
                          {Object.keys(msg.results[0]).map((k) => (
                            <th key={k} className="text-left px-3 py-2 font-medium whitespace-nowrap">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.results.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b border-[#1e2640] hover:bg-[#1a1f2e]">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-3 py-2 font-mono text-text-secondary whitespace-nowrap">
                                {v === null ? <span className="text-text-dim italic">null</span> : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {msg.results.length > 50 && (
                      <p className="text-text-dim text-xs p-2 font-mono border-t border-border">
                        … {msg.results.length - 50} more rows
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
            {msg.content && (
              <p className="text-sm text-text-secondary">{msg.content}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    getAgentStats().then((r) => setStats(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (query) => {
    const q = query || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await runAgentQuery(q)
      setMessages((m) => [...m, {
        role: 'assistant',
        sql: res.data.sql,
        results: res.data.results,
        content: res.data.message,
      }])
    } catch (err) {
      setMessages((m) => [...m, {
        role: 'assistant',
        error: err.response?.data?.message || 'Error occurred',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 border-b border-border bg-surface flex items-center px-6 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-semibold text-text-primary"> SQL Agent</span>
          <span className="badge-green text-[10px]">SQL Agent Ready</span>
        </div>
        {stats && (
          <div className="flex items-center gap-3 text-xs font-mono text-text-dim">
            <span>{stats.total_queries ?? 0} queries</span>
            <span>{stats.tables ?? 0} tables</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-blue/10 border border-blue/25 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-text-primary font-semibold mb-1">Ask anything about the student database</p>
            <p className="text-text-dim text-sm mb-6">Powered by AI Text-to-SQL</p>
            <div className="flex flex-wrap gap-2 max-w-2xl mx-auto justify-center">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => send(ex)}
                  className="card px-3 py-2 flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary hover:border-border-light transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="w-7 h-7 rounded-full bg-cyan/20 border border-cyan/30 flex items-center justify-center mr-2 flex-shrink-0">
                  <div className="w-3 h-3 border-2 border-t-cyan border-cyan/30 rounded-full animate-spin" />
                </div>
                <div className="card px-4 py-3 flex items-center gap-2 text-xs text-text-dim font-mono">
                  <span className="animate-pulse">Generating SQL…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-3 bg-surface flex-shrink-0">
        <div className="flex gap-2 items-end max-w-2xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              className="input resize-none py-2.5 pr-10 font-sans leading-relaxed"
              placeholder="Ask anything about the student database..."
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              disabled={loading}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="btn-primary flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[11px] text-text-dim font-mono mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
