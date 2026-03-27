import { useState, useRef, useEffect } from 'react'
import { connectDataStudio, uploadDataStudioFile, queryDataStudio } from '../api/client'

const SOURCES = [
  {
    id: 'sql',
    name: 'SQL Database',
    desc: 'Connect to PostgreSQL, MySQL, or SQL Server',
    icon: (
      <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    color: 'from-purple-500/20 to-indigo-500/20',
    border: 'border-purple-500/30'
  },
  {
    id: 'databricks',
    name: 'Databricks',
    desc: 'Connect to Azure or AWS Databricks clusters',
    icon: (
      <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    color: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/30'
  },
  {
    id: 'excel',
    name: 'Excel / CSV',
    desc: 'Upload flat files or custom datasets directly',
    icon: (
      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30'
  }
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-slide-up group`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5 shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-shadow duration-300">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
        {isUser ? (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-500/20 border border-purple-500/40 rounded-2xl rounded-tr-sm px-5 py-3 text-sm font-medium tracking-wide">
            {msg.content}
          </div>
        ) : (
          <div className="space-y-3">
             {msg.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-xs font-mono shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                <div className="flex items-center gap-2 mb-1 font-bold text-sm">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   Query Error
                </div>
                {msg.error}
              </div>
            )}
            {msg.sql && (
              <div className="bg-[#05070f]/80 backdrop-blur-sm border border-border/60 hover:border-purple-500/30 transition-colors rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-text-dim font-mono mb-3">
                  <span className="badge border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[10px] uppercase tracking-wider font-bold">Code Executed</span>
                </div>
                <pre className="text-xs text-purple-300 font-mono whitespace-pre-wrap leading-relaxed">{msg.sql}</pre>
              </div>
            )}
            {msg.results && msg.results.length > 0 ? (
              <div className="bg-surface/90 backdrop-blur-md border border-border hover:border-purple-500/30 transition-colors rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-bg/50 border-b border-border/50 text-text-dim text-[11px] uppercase tracking-wider">
                        {Object.keys(msg.results[0] || {}).map((k) => (
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
              </div>
            ) : msg.results && msg.results.length === 0 ? (
                 <p className="text-text-dim text-xs p-4 font-mono text-center border border-border rounded-xl bg-surface2/30">No results found.</p>
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

export default function DataStudio() {
  const [stage, setStage] = useState('select') // 'select', 'form', 'chat'
  const [selectedSource, setSelectedSource] = useState(null)
  
  // Connection Form State
  const [host, setHost] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [connectionId, setConnectionId] = useState(null)
  const [connectionError, setConnectionError] = useState('')
  const fileRef = useRef(null)
  
  // Chat state
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // --- CONNECT LOGIC (Real API Integration) ---
  const handleConnect = async (e) => {
    e.preventDefault()
    setLoading(true)
    setConnectionError('')
    
    try {
      const res = await connectDataStudio({
        type: selectedSource.id,
        host,
        username,
        password
      })
      setConnectionId(res.data.connection_id)
      setStage('chat')
    } catch (err) {
      setConnectionError(err.response?.data?.message || 'Failed to connect. Make sure your API is running and details are correct.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setConnectionError('')
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await uploadDataStudioFile(formData)
      setConnectionId(res.data.connection_id)
      setStage('chat')
    } catch (err) {
       setConnectionError(err.response?.data?.message || 'File upload failed. Ensure the API supports this endpoint.')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const disconnect = () => {
    setStage('select')
    setConnectionId(null)
    setMessages([])
    setHost('')
    setUsername('')
    setPassword('')
  }

  // --- CHAT LOGIC (Real API Integration) ---
  const send = async (explicitQuery = null) => {
    const q = explicitQuery || input.trim()
    if (!q || loading) return
    
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    setLoading(true)
    
    try {
      const res = await queryDataStudio(q, connectionId)
      setMessages((m) => [...m, {
        role: 'assistant',
        sql: res.data.sql || res.data.code_executed,
        results: res.data.results,
        content: res.data.message || res.data.content,
      }])
    } catch (err) {
      setMessages((m) => [...m, {
        role: 'assistant',
        error: err.response?.data?.message || 'The backend failed to process the request. Is the endpoint running?'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface/20 via-bg to-bg relative overflow-hidden">
      {/* Background glow base on stage */}
      <div className={`absolute top-[-20%] right-[10%] w-[60%] h-[60%] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000 ${stage === 'chat' ? 'bg-purple-500/5' : 'bg-indigo-500/5'}`} />

      {/* Header */}
      <div className="h-16 border-b border-border/50 bg-surface/40 backdrop-blur-xl flex items-center px-6 flex-shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-white tracking-wide">Data Studio AI</span>
          {stage === 'chat' && (
            <span className="px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[10px] font-mono shadow-[0_0_8px_rgba(168,85,247,0.2)] animate-pulse hidden sm:flex items-center gap-1.5">
              Connected to {selectedSource?.name}
            </span>
          )}
        </div>
        {stage === 'chat' && (
          <button onClick={disconnect} className="text-xs text-text-dim hover:text-white transition-colors flex items-center gap-1 bg-surface2 px-3 py-1.5 rounded-lg border border-border hover:border-border-light">
             Disconnect
          </button>
        )}
      </div>

      {stage === 'select' && (
        <div className="flex-1 overflow-y-auto px-6 py-10 z-10">
          <div className="max-w-4xl mx-auto animate-slide-up">
            <h1 className="text-3xl font-bold text-white mb-2">Connect Your Data</h1>
            <p className="text-text-secondary mb-10 w-full max-w-2xl">
              Bring your own data into the AI workspace. Connect an external database cluster, Databricks, or upload static sheets to start querying immediately using natural language.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSource(s); setStage('form'); setConnectionError(''); }}
                  className="group relative bg-surface2/40 backdrop-blur-sm border border-border hover:border-purple-500/50 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-[0_8px_30px_rgba(168,85,247,0.1)] hover:-translate-y-1"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} border ${s.border} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    {s.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{s.name}</h3>
                  <p className="text-sm text-text-dim leading-relaxed">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {stage === 'form' && selectedSource && (
        <div className="flex-1 overflow-y-auto px-6 py-10 z-10 flex items-center justify-center">
          <div className="w-full max-w-md animate-slide-up relative group">
            <div className={`absolute -inset-1 bg-gradient-to-r ${selectedSource.color.replace('/20', '/50')} rounded-3xl blur-xl opacity-20 transition duration-500`}></div>
            <div className="bg-surface2 border border-border rounded-2xl p-8 relative shadow-2xl">
              <button onClick={() => setStage('select')} className="absolute top-4 right-4 text-text-dim hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              
              <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${selectedSource.color} border ${selectedSource.border} flex items-center justify-center mb-6`}>
                {selectedSource.icon}
              </div>
              <h2 className="text-xl font-bold text-white text-center mb-1">Connect to {selectedSource.name}</h2>
              <p className="text-xs text-text-dim text-center mb-6">Enter your credentials or upload your dataset.</p>

              {connectionError && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                   <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <span>{connectionError}</span>
                </div>
              )}

              {selectedSource.id === 'excel' ? (
                <div>
                   <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
                   <div onClick={() => fileRef.current?.click()} className={`border border-dashed border-border rounded-xl p-8 text-center hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {loading ? (
                         <div className="w-8 h-8 mx-auto mb-2 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-8 h-8 text-text-dim mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      )}
                      <span className="block text-sm font-medium text-white mb-1">
                        {loading ? 'Uploading Data...' : 'Click to upload spreadsheet'}
                      </span>
                      <span className="block text-xs text-text-dim">.xlsx, .xls, .csv up to 50MB</span>
                   </div>
                </div>
              ) : (
                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">Host / Connection String</label>
                    <input type="text" value={host} onChange={e => setHost(e.target.value)} required placeholder="e.g., db.production.com:5432" className="input bg-[#05070f]" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">Username</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="admin_user" className="input bg-[#05070f]" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">Password / Token</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="input bg-[#05070f]" disabled={loading} />
                  </div>
                  
                  <button type="submit" disabled={loading} className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting...</>
                    ) : "Connect & Sync Data"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {stage === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin z-10 relative">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto w-full animate-slide-up">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.15)] relative group cursor-default">
                  <div className="absolute inset-0 rounded-3xl bg-purple-500/10 blur-xl group-hover:bg-purple-500/20 transition-colors duration-500"></div>
                   {selectedSource?.icon}
                </div>
                <h2 className="text-2xl text-white font-bold mb-2 tracking-tight">Query Your {selectedSource?.name} Data</h2>
                <p className="text-text-secondary text-base mb-8 text-center max-w-lg">
                  Connection established (ID: {connectionId?.substring(0,8) || 'Mock'}). Write a natural language prompt, and the AI will generate the required SQL/Python commands to search your custom data!
                </p>
                <div className="flex flex-wrap justify-center gap-3 w-full">
                  <span className="px-4 py-2 bg-surface2 border border-border rounded-lg text-xs text-text-secondary hover:text-white transition-colors cursor-pointer hover:border-purple-500/40" onClick={() => { send("Give me a summary of total records") }}>Summary of records</span>
                  <span className="px-4 py-2 bg-surface2 border border-border rounded-lg text-xs text-text-secondary hover:text-white transition-colors cursor-pointer hover:border-purple-500/40" onClick={() => { send("Show me the top 10 rows by highest value") }}>Top 10 rows</span>
                  <span className="px-4 py-2 bg-surface2 border border-border rounded-lg text-xs text-text-secondary hover:text-white transition-colors cursor-pointer hover:border-purple-500/40" onClick={() => { send("Are there any null values?") }}>Find missing data</span>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto pb-4">
                {messages.map((m, i) => <Message key={i} msg={m} />)}
                {loading && (
                  <div className="flex justify-start mb-6 animate-slide-up">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center mr-3 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                      <div className="w-3.5 h-3.5 border-2 border-t-purple-400 border-purple-400/30 rounded-full animate-spin" />
                    </div>
                    <div className="bg-surface2/60 backdrop-blur-md rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-3 border border-border/50 text-sm text-text-dim">
                       <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                      Synthesizing data query based on '{input || 'your request'}'...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} className="h-4" />
              </div>
            )}
          </div>

          <div className="p-4 bg-surface/60 backdrop-blur-xl border-t border-border/40 flex-shrink-0 relative z-10 w-full">
            <div className="max-w-4xl mx-auto relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-30 group-focus-within:opacity-80 transition duration-500"></div>
              <div className="relative flex items-end bg-surface2 border border-border group-focus-within:border-purple-500/50 rounded-xl overflow-hidden shadow-lg transition-colors">
                <textarea
                  className="w-full bg-transparent resize-none py-3.5 pl-4 pr-14 font-sans text-sm text-white placeholder-text-dim focus:outline-none leading-relaxed"
                  placeholder="Ask anything about your connected data..."
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
                  className="absolute right-2 bottom-2 p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md disabled:opacity-30 disabled:grayscale transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:shadow-none hover:-translate-y-0.5"
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
        </>
      )}
    </div>
  )
}
