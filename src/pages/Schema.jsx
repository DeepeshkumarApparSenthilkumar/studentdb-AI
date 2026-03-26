import { useEffect, useState } from 'react'
import { getSchema } from '../api/client'

export default function Schema() {
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getSchema()
      .then((r) => setSchema(r.data))
      .catch(() => setError('Failed to load schema'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary"> Database Schema</h1>
          <p className="text-sm text-text-secondary mt-0.5">PostgreSQL table structure for StudentDB</p>
        </div>
        <span className="badge-blue font-mono">PostgreSQL</span>
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
      ) : schema ? (
        <div className="space-y-4">
          {/* SQL DDL */}
          {schema.ddl && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-cyan text-[10px]">DDL</span>
                <p className="text-sm font-semibold text-text-primary">CREATE TABLE Statement</p>
              </div>
              <pre className="font-mono text-xs text-cyan overflow-x-auto whitespace-pre scrollbar-thin leading-relaxed">
                {schema.ddl}
              </pre>
            </div>
          )}

          {/* Tables */}
          {schema.tables?.map((table) => (
            <div key={table.name} className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <span className="text-sm font-semibold text-text-primary font-mono">{table.name}</span>
                <span className="badge-blue text-[10px]">{table.columns?.length} cols</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-dim">
                      <th className="text-left pb-2 pr-4 font-medium">Column</th>
                      <th className="text-left pb-2 pr-4 font-medium">Type</th>
                      <th className="text-left pb-2 pr-4 font-medium">Nullable</th>
                      <th className="text-left pb-2 font-medium">Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns?.map((col) => (
                      <tr key={col.name} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-mono text-cyan">
                          {col.primary_key && <span className="badge-orange text-[10px] mr-1">PK</span>}
                          {col.name}
                        </td>
                        <td className="py-2 pr-4 font-mono text-blue">{col.type}</td>
                        <td className="py-2 pr-4">
                          {col.nullable ? (
                            <span className="text-text-dim">YES</span>
                          ) : (
                            <span className="text-green">NO</span>
                          )}
                        </td>
                        <td className="py-2 font-mono text-text-dim">{col.default ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Valid Values */}
          {schema.valid_values && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-text-primary mb-3">Valid Department Values</p>
              <div className="flex flex-wrap gap-2">
                {schema.valid_values.map((v) => (
                  <span key={v} className="badge-orange">{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Raw schema if no structured data */}
          {!schema.tables && !schema.ddl && (
            <div className="card p-5">
              <pre className="font-mono text-xs text-text-secondary overflow-x-auto whitespace-pre scrollbar-thin leading-relaxed">
                {JSON.stringify(schema, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-text-secondary text-sm">No schema data available</p>
          <p className="text-text-dim text-xs mt-1">
            Go to the SQL Agent to start querying
          </p>
        </div>
      )}
    </div>
  )
}
