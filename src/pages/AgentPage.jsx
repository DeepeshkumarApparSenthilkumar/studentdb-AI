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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-slide-up group`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan/20 to-blue/20 border border-cyan/30 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5 shadow-[0_0_15px_rgba(0,229,200,0.15)] group-hover:shadow-[0_0_20px_rgba(0,229,200,0.3)] transition-shadow duration-300">
          <svg className="w-4 h-4 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
        {isUser ? (
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue/20 border border-blue/40 rounded-2xl rounded-tr-sm px-5 py-3 text-sm font-medium tracking-wide">
            {msg.content}
          </div>
        ) : (
          <div className="space-y-3">
            {msg.sql && (
              <div className="bg-[#05070f]/80 backdrop-blur-sm border border-border/60 hover:border-cyan/30 transition-colors rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-text-dim font-mono mb-3">
                  <span className="badge-cyan text-[10px] uppercase tracking-wider font-bold">SQL</span>
                  Generated Query
                </div>
                <pre className="text-xs text-cyan font-mono whitespace-pre-wrap leading-relaxed">{msg.sql}</pre>
              </div>
            )}
            {msg.error ? (
              <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3 text-red text-xs font-mono shadow-[0_0_10px_rgba(255,77,106,0.1)]">
                <div className="flex items-center gap-2 mb-1 font-bold text-sm">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   Error
                </div>
                {msg.error}
              </div>
            ) : msg.results ? (
              <div className="bg-surface/90 backdrop-blur-md border border-border hover:border-blue/30 transition-colors rounded-xl overflow-hidden shadow-lg">
                {msg.results.length === 0 ? (
                  <p className="text-text-dim text-xs p-4 font-mono text-center">No results found for this query</p>
                ) : (
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-bg/50 border-b border-border/50 text-text-dim text-[11px] uppercase tracking-wider">
                          {Object.keys(msg.results[0]).map((k) => (
                            <th key={k} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.results.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-4 py-2.5 font-mono text-text-secondary whitespace-nowrap">
                                {v === null ? <span className="text-text-dim italic opacity-50">null</span> : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {msg.results.length > 50 && (
                      <div className="bg-surface/50 border-t border-border px-4 py-2.5 flex items-center justify-center">
                        <span className="badge text-[10px] text-text-dim border-border bg-surface2">
                          + {msg.results.length - 50} more rows
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
            {msg.content && (
              <div className="px-1 text-sm text-text-secondary leading-relaxed font-light">
                {msg.content}
              </div>
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
        error: err.response?.data?.message || 'Error occurred while querying DB.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface/20 via-bg to-bg relative overflow-hidden">
      {/* Background glowing orb */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan/5 blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <div className="h-16 border-b border-border/50 bg-surface/40 backdrop-blur-xl flex items-center px-6 flex-shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan/20 to-blue/20 border border-cyan/30 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,200,0.2)]">
            <svg className="w-4 h-4 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-white tracking-wide">SQL Agent</span>
          <span className="px-2 py-0.5 rounded-full border border-green/30 bg-green/10 text-green text-[10px] font-mono animate-pulse shadow-[0_0_8px_rgba(57,217,138,0.4)]">Online</span>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-xs font-mono text-text-dim bg-surface2/50 px-3 py-1.5 rounded-full border border-border/50">
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse"></span> {stats.total_queries ?? 0} queries</div>
            <div className="w-px h-3 bg-border"></div>
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan"></span> {stats.tables ?? 0} tables</div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin z-10 relative">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto w-full animate-slide-up">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue/20 to-cyan/20 border border-cyan/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,229,200,0.15)] relative group cursor-default">
              <div className="absolute inset-0 rounded-3xl bg-cyan/10 blur-xl group-hover:bg-cyan/20 transition-colors duration-500"></div>
              <svg className="w-10 h-10 text-cyan relative z-10 transition-transform duration-500 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl text-white font-bold mb-2 tracking-tight">Query Your Database with AI</h2>
            <p className="text-text-secondary text-base mb-8 text-center max-w-lg">
              No SQL required! Just type what you want to know about your students or courses, and the AI will generate and execute the query securely.
            </p>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXAMPLES.map((ex, idx) => (
                <button key={ex} onClick={() => send(ex)}
                  className="card p-3.5 flex items-center gap-3 text-sm text-text-secondary hover:text-white hover:border-cyan/40 hover:bg-surface2/80 hover:shadow-[0_4px_20px_rgba(0,229,200,0.1)] transition-all duration-300 text-left group">
                  <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center group-hover:border-cyan/50 group-hover:bg-cyan/10 transition-colors">
                    <svg className="w-3 h-3 text-text-dim group-hover:text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
           <div className="max-w-4xl mx-auto pb-4">
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {loading && (
              <div className="flex justify-start mb-6 animate-slide-up">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan/20 to-blue/20 border border-cyan/30 flex items-center justify-center mr-3 flex-shrink-0 shadow-[0_0_15px_rgba(0,229,200,0.15)]">
                  <div className="w-3.5 h-3.5 border-2 border-t-cyan border-cyan/30 rounded-full animate-spin" />
                </div>
                <div className="bg-surface2/60 backdrop-blur-md rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-3 border border-border/50 text-sm text-text-dim">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan/50 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan/50 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan/50 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                  Processing natural language & executing SQL...
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 bg-surface/60 backdrop-blur-xl border-t border-border/40 flex-shrink-0 relative z-10 w-full">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue/20 to-cyan/20 rounded-2xl blur opacity-30 group-focus-within:opacity-80 transition duration-500"></div>
          <div className="relative flex items-end bg-surface2 border border-border group-focus-within:border-cyan/50 rounded-xl overflow-hidden shadow-lg transition-colors">
            <textarea
              className="w-full bg-transparent resize-none py-3.5 pl-4 pr-14 font-sans text-sm text-white placeholder-text-dim focus:outline-none leading-relaxed"
              placeholder="Ask anything about the student database... (e.g., 'Show top 5 students by GPA')"
              rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 5) : 1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              disabled={loading}
              style={{ minHeight: '52px' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-gradient-to-r from-blue to-cyan text-white shadow-md disabled:opacity-30 disabled:grayscale transition-all hover:shadow-[0_0_15px_rgba(0,229,200,0.4)] disabled:shadow-none hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex justify-center mt-2">
          <p className="text-[10px] uppercase tracking-wider text-text-dim/70 font-mono">
            <strong>Enter</strong> to send &middot; <strong>Shift+Enter</strong> for newline
          </p>
        </div>
      </div>
    </div>
  )
}
