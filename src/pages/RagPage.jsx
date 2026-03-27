import { useState, useEffect, useRef } from 'react'
import { uploadDoc, queryRag, getDocs } from '../api/client'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-slide-up group`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green/20 to-emerald-500/20 border border-green/30 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5 shadow-[0_0_15px_rgba(57,217,138,0.15)] group-hover:shadow-[0_0_20px_rgba(57,217,138,0.3)] transition-shadow duration-300">
          <svg className="w-4 h-4 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
        {isUser ? (
          <div className="bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-lg shadow-green/20 border border-green/40 rounded-2xl rounded-tr-sm px-5 py-3 text-sm font-medium tracking-wide">
            {msg.content}
          </div>
        ) : (
          <div className="bg-surface/90 backdrop-blur-md border border-border hover:border-green/30 transition-colors rounded-xl p-5 shadow-lg">
            <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed font-light">
              {msg.content}
            </div>
            {msg.sources?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg className="w-3.5 h-3.5 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-[10px] text-text-dim uppercase tracking-wider font-semibold">Sources</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {msg.sources.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 rounded bg-surface2/50 border border-border text-[10px] text-green font-mono flex items-center gap-1.5 hover:border-green/50 hover:bg-green/10 transition-colors cursor-default">
                      <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RagPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)
  const bottomRef = useRef(null)

  const loadDocs = () => {
    getDocs().then((r) => setDocs(r.data || [])).catch(() => {})
  }

  useEffect(() => {
    loadDocs()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      await uploadDoc(fd)
      loadDocs()
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await queryRag(q)
      setMessages((m) => [...m, {
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources,
      }])
    } catch (err) {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: err.response?.data?.message || 'Error occurred during generation.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface/20 via-bg to-bg relative overflow-hidden">
      {/* Background glowing orb */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-green/5 blur-[120px] pointer-events-none" />

      {/* Sidebar — docs */}
      <div className="w-72 border-r border-border/50 bg-surface/40 backdrop-blur-xl flex flex-col flex-shrink-0 z-10 relative">
        <div className="h-16 border-b border-border/50 flex items-center px-5 gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green/20 to-emerald-500/20 border border-green/30 flex items-center justify-center shadow-[0_0_10px_rgba(57,217,138,0.2)]">
            <svg className="w-4 h-4 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-base font-semibold text-white flex-1 tracking-wide">Knowledge Base</span>
          <span className="px-2 py-0.5 rounded-full border border-green/30 bg-green/10 text-green text-[10px] font-mono shadow-[0_0_8px_rgba(57,217,138,0.2)]">{docs.length} docs</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {docs.length === 0 ? (
            <div className="mt-8 text-center px-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-surface2 border border-border flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">No Documents Found</p>
              <p className="text-xs text-text-dim">Upload your first document to start chatting with it.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id || doc.name} className="group relative bg-surface2/50 hover:bg-surface2 border border-border hover:border-green/30 rounded-xl px-4 py-3 flex items-start gap-3 transition-all duration-300 hover:shadow-[0_4px_15px_rgba(57,217,138,0.05)] hover:-translate-y-0.5">
                  <div className="mt-0.5 p-1.5 rounded-md bg-surface border border-border group-hover:border-green/40 group-hover:bg-green/10 transition-colors">
                     <svg className="w-4 h-4 text-text-secondary group-hover:text-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary font-medium truncate group-hover:text-white transition-colors">{doc.name || doc.filename}</p>
                    {doc.size && <p className="text-[10px] text-text-dim mt-0.5 font-mono">{doc.size}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload */}
        <div className="p-4 border-t border-border/50 bg-surface/60 flex-shrink-0">
          {uploadError && (
            <div className="mb-3 p-2 rounded-lg bg-red/10 border border-red/20 text-red text-xs flex items-start gap-2">
               <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               {uploadError}
            </div>
          )}
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
            accept=".pdf,.txt,.md,.docx,.csv" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group relative w-full rounded-xl p-4 text-center disabled:opacity-50 transition-all duration-300 overflow-hidden border border-dashed border-border hover:border-green/50 hover:bg-green/5 hover:shadow-[0_0_20px_rgba(57,217,138,0.1)]"
          >
            <div className="relative z-10 flex flex-col items-center gap-2">
              {uploading ? (
                <>
                  <div className="w-6 h-6 border-2 border-t-green border-green/30 rounded-full animate-spin" />
                  <span className="text-xs font-medium text-green animate-pulse">Uploading Document…</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center group-hover:bg-green/10 group-hover:border-green/40 group-hover:scale-110 transition-all duration-300">
                    <svg className="w-5 h-5 text-text-dim group-hover:text-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-text-primary group-hover:text-white transition-colors">Upload Document</span>
                    <span className="block text-[10px] text-text-dim mt-0.5">PDF, TXT, MD, CSV</span>
                  </div>
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="h-16 border-b border-border/50 bg-surface/40 backdrop-blur-xl flex items-center px-6 gap-3 flex-shrink-0">
          <span className="text-base font-semibold text-white tracking-wide">Document Intelligence</span>
          <span className="badge-cyan text-[10px] shadow-[0_0_8px_rgba(0,229,200,0.2)]">Generative RAG</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto animate-slide-up">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-green/20 to-emerald-500/20 border border-green/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(57,217,138,0.15)] relative group">
                <div className="absolute inset-0 rounded-3xl bg-green/10 blur-xl group-hover:bg-green/20 transition-colors duration-500"></div>
                <svg className="w-10 h-10 text-green relative z-10 transition-transform duration-500 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl text-white font-bold mb-3 tracking-tight">Chat with your Documents</h2>
              <p className="text-text-secondary text-base mb-6">
                Upload course syllabuses, guidelines, policies, or other documents on the left. Once uploaded, you can ask anything about them.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1.5 rounded-full bg-surface2 border border-border text-xs text-text-dim">Summarize rules</span>
                <span className="px-3 py-1.5 rounded-full bg-surface2 border border-border text-xs text-text-dim">Extract deadlines</span>
                <span className="px-3 py-1.5 rounded-full bg-surface2 border border-border text-xs text-text-dim">Compare grading policies</span>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto pb-4">
              {messages.map((m, i) => <Message key={i} msg={m} />)}
              {loading && (
                <div className="flex justify-start mb-6 animate-slide-up">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green/20 to-emerald-500/20 border border-green/30 flex items-center justify-center mr-3 flex-shrink-0 shadow-[0_0_15px_rgba(57,217,138,0.15)]">
                    <div className="w-3.5 h-3.5 border-2 border-t-green border-green/30 rounded-full animate-spin" />
                  </div>
                  <div className="bg-surface2/60 backdrop-blur-md rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-3 border border-border/50 text-sm text-text-dim">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green/50 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-green/50 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-green/50 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                    Searching knowledge base & generating answer...
                  </div>
                </div>
              )}
              <div ref={bottomRef} className="h-4" />
            </div>
          )}
        </div>

        <div className="p-4 bg-surface/60 backdrop-blur-xl border-t border-border/40 flex-shrink-0">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green/20 to-emerald-500/20 rounded-2xl blur opacity-30 group-focus-within:opacity-80 transition duration-500"></div>
            <div className="relative flex items-end bg-surface2 border border-border group-focus-within:border-green/50 rounded-xl overflow-hidden shadow-lg transition-colors">
              <textarea
                className="w-full bg-transparent resize-none py-3.5 pl-4 pr-14 font-sans text-sm text-white placeholder-text-dim focus:outline-none leading-relaxed"
                placeholder="Ask about your documents... (e.g., 'What are the grading criteria?')"
                rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 5) : 1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                }}
                disabled={loading}
                style={{ minHeight: '52px' }}
              />
              <button onClick={send} disabled={!input.trim() || loading}
                className="absolute right-2 bottom-2 p-2 rounded-lg bg-gradient-to-r from-green to-emerald-500 text-white shadow-md disabled:opacity-30 disabled:grayscale transition-all hover:shadow-[0_0_15px_rgba(57,217,138,0.4)] disabled:shadow-none hover:-translate-y-0.5"
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
    </div>
  )
}
