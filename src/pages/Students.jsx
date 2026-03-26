import { useEffect, useState } from 'react'
import { getStudents, createStudent, updateStudent, deleteStudent, getDepartments } from '../api/client'

const EMPTY = { name: '', email: '', gpa: '', grad_year: '', department: '', credits: '' }

function GpaBadge({ gpa }) {
  const v = parseFloat(gpa)
  if (v >= 3.5) return <span className="badge-green">{gpa}</span>
  if (v >= 3.0) return <span className="badge-blue">{gpa}</span>
  if (v >= 2.0) return <span className="badge-orange">{gpa}</span>
  return <span className="badge-red">{gpa}</span>
}

function StudentModal({ student, departments, onClose, onSave }) {
  const [form, setForm] = useState(student || EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#0c0f1e] border border-[#1e2640] rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">
            {student?.id ? 'Edit Student' : 'New Student'}
          </h2>
          <button onClick={onClose} className="text-text-dim hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red/10 border border-red/30 text-red text-xs px-3 py-2 rounded-lg font-mono mb-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Name</label>
              <input className="input" placeholder="Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Email</label>
              <input className="input" placeholder="Email" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">GPA</label>
              <input className="input" placeholder="GPA" type="number" step="0.01" min="0" max="4"
                value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Grad Year</label>
              <input className="input" placeholder="Grad Year" type="number" value={form.grad_year}
                onChange={(e) => setForm({ ...form, grad_year: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Department</label>
              <select className="input" value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Credits</label>
              <input className="input" placeholder="Credits" type="number" value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-[#1e2640] text-white px-3 py-2 rounded disabled:opacity-50 hover:bg-[#2e3650] text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#3d7eff] text-white px-4 py-2 rounded hover:bg-[#2d6eef] transition text-sm disabled:opacity-50">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Students() {
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | student obj
  const [deleteId, setDeleteId] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      getStudents({ search, department: filterDept }),
      getDepartments(),
    ])
      .then(([sRes, dRes]) => {
        setStudents(sRes.data)
        setDepartments(dRes.data || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterDept])

  const handleSave = async (form) => {
    if (form.id) {
      await updateStudent(form.id, form)
    } else {
      await createStudent(form)
    }
    load()
  }

  const handleDelete = async (id) => {
    await deleteStudent(id)
    setDeleteId(null)
    load()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 border-b border-border bg-surface flex items-center px-6 flex-shrink-0">
        <h1 className="text-sm font-semibold text-text-primary flex-1">Student Management</h1>
        <div className="flex items-center gap-2">
          <input
            className="input w-56 text-xs py-1.5"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input w-40 text-xs py-1.5"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="btn-primary text-xs py-1.5" onClick={() => setModal('new')}>
            + New Student
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-t-blue border-border rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-text-secondary text-sm">No students found</p>
            <p className="text-text-dim text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#05070f] border-b border-[#1e2640] text-gray-400">
                <th className="text-left px-4 py-3 text-xs font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Department</th>
                <th className="text-left px-4 py-3 text-xs font-medium">GPA</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Grad Year</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Credits</th>
                <th className="text-right px-4 py-3 text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-[#1e2640] hover:bg-[#1a1f2e] transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{s.name}</td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-xs">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className="badge-blue">{s.department || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.gpa ? <GpaBadge gpa={s.gpa} /> : <span className="text-text-dim">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{s.grad_year || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{s.credits ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModal(s)} className="btn-ghost text-xs py-1 mr-1">Edit</button>
                    <button onClick={() => setDeleteId(s.id)}
                      className="text-xs px-2 py-1 rounded text-red hover:bg-red/10 transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <StudentModal
          student={modal === 'new' ? null : modal}
          departments={departments}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#0c0f1e] border border-[#1e2640] rounded-lg p-6 w-full max-w-xs">
            <h3 className="text-base font-semibold text-text-primary mb-2">Delete Student</h3>
            <p className="text-sm text-text-secondary mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 bg-[#1e2640] text-white px-3 py-2 rounded hover:bg-[#2e3650] text-sm">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red text-white px-3 py-2 rounded hover:bg-[#ff7d8a] text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
