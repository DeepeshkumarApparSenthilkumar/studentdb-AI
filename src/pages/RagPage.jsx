import { useState, useEffect, useRef } from 'react'
import { uploadDoc, queryRag, getDocs } from '../api/client'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-slide-up`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-green/20 border border-green/30 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}
      <div className={`max-w-3xl ${isUser ? 'order-first' : ''}`}>
        {isUser ? (
          <div className="bg-green/10 border border-green/25 rounded-xl rounded-tr-sm px-4 py-2.5 text-sm text-text-primary">
            {msg.content}
          </div>
        ) : (
          <div className="card p-4">
            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            {msg.sources?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-text-dim font-mono mb-1.5">Sources</p>
                <div className="flex flex-wrap gap-1">
                  {msg.sources.map((s, i) => (
                    <span key={i} className="badge-green text-[10px]">{s}</span>
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
        content: err.response?.data?.message || 'Error occurred',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — docs */}
      <div className="w-64 border-r border-border flex flex-col bg-surface flex-shrink-0">
        <div className="h-12 border-b border-border flex items-center px-4 gap-2 flex-shrink-0">
          <span className="text-sm font-semibold text-text-primary flex-1">Documents</span>
          <span className="badge-green text-[10px]">{docs.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          {docs.length === 0 ? (
            <p className="text-text-dim text-xs text-center mt-4">No documents uploaded yet</p>
          ) : (
            <div className="space-y-1.5">
              {docs.map((doc) => (
                <div key={doc.id || doc.name} className="card px-3 py-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs text-text-primary truncate">{doc.name || doc.filename}</p>
                    {doc.size && <p className="text-[10px] text-text-dim">{doc.size}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload */}
        <div className="p-3 border-t border-border flex-shrink-0">
          {uploadError && (
            <p className="text-red text-[10px] font-mono mb-2">{uploadError}</p>
          )}
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
            accept=".pdf,.txt,.md,.docx,.csv" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border border-dashed border-border rounded-xl p-4 text-center text-xs text-text-dim hover:border-border-light hover:text-text-secondary transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="animate-pulse">Uploading…</span>
            ) : (
              <>
                <svg className="w-5 h-5 mx-auto mb-1 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Document
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 border-b border-border bg-surface flex items-center px-6 flex-shrink-0">
          <span className="text-sm font-semibold text-text-primary">Doc Intel</span>
          <span className="badge-cyan text-[10px] ml-2">RAG</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/25 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-text-primary font-semibold mb-1">Ask questions about uploaded documents</p>
              <p className="text-text-dim text-sm">Upload a document on the left, then ask anything</p>
            </div>
          ) : (
            <>
              {messages.map((m, i) => <Message key={i} msg={m} />)}
              {loading && (
                <div className="flex justify-start mb-4">
                  <div className="w-7 h-7 rounded-full bg-green/20 border border-green/30 flex items-center justify-center mr-2 flex-shrink-0">
                    <div className="w-3 h-3 border-2 border-t-green border-green/30 rounded-full animate-spin" />
                  </div>
                  <div className="card px-4 py-3 text-xs text-text-dim font-mono animate-pulse">
                    Searching documents…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="border-t border-border px-6 py-3 bg-surface flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              className="input flex-1 resize-none py-2.5 pr-12 font-sans"
              placeholder="Ask about your documents..."
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              disabled={loading}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              className="btn-primary flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
