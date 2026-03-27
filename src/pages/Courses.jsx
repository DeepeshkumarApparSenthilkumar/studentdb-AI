import { useEffect, useState } from 'react'
import { getCourses, createCourse, updateCourse, deleteCourse, getDepartments } from '../api/client'

const EMPTY = { name: '', credits: '', description: '', instructor: '', max_enrollment: '', department: '' }

// Fix 3: CourseModal now accepts departments prop and renders a <select> for department
function CourseModal({ course, departments, onClose, onSave }) {
  const [form, setForm] = useState(course || EMPTY)
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
            {course?.id ? 'Edit Course' : 'Create New Course'}
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
          <div>
            <label className="text-xs text-text-secondary block mb-1">Course Name</label>
            <input className="input" placeholder="Course Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Credits</label>
              <input className="input" placeholder="Credits" type="number" value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Max Enrollment</label>
              <input className="input" placeholder="Max Enrollment" type="number" value={form.max_enrollment}
                onChange={(e) => setForm({ ...form, max_enrollment: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Instructor</label>
            <input className="input" placeholder="Instructor" value={form.instructor}
              onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
          </div>
          {/* Fix 3: department is now a <select> dropdown */}
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
            <label className="text-xs text-text-secondary block mb-1">Description</label>
            <textarea className="input resize-none" placeholder="Description" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-[#1e2640] text-white px-3 py-2 rounded hover:bg-[#2e3650] text-sm">
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

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteId, setDeleteId] = useState(null) // stores whole course object
  const [error, setError] = useState('')

  // Fix 4: debounce search input by 400ms
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const load = () => {
    setLoading(true)
    // Fix 3: also load departments
    Promise.all([
      getCourses({ search: debouncedSearch }),
      getDepartments(),
    ])
      .then(([r, dRes]) => {
        // Fix 1: safety unwrap — backend returns plain array
        setCourses(Array.isArray(r.data) ? r.data : r.data.data || [])
        setDepartments(Array.isArray(dRes.data) ? dRes.data : dRes.data || [])
      })
      // Fix 2: structured error handling
      .catch((err) => {
        console.error(err)
        setError('Failed to load courses. Is the backend running?')
      })
      .finally(() => setLoading(false))
  }

  // Fix 4: trigger load on debouncedSearch, not raw search
  useEffect(() => { load() }, [debouncedSearch])

  const handleSave = async (form) => {
    if (form.id) await updateCourse(form.id, form)
    else await createCourse(form)
    load()
  }

  // Fix 5: try/catch on handleDelete; deleteId is now the full course object
  const handleDelete = async () => {
    try {
      await deleteCourse(deleteId.id)
      setDeleteId(null)
      load()
    } catch (err) {
      console.error(err)
      setError('Failed to delete course. Please try again.')
      setDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 border-b border-border bg-surface flex items-center px-6 flex-shrink-0">
        <h1 className="text-sm font-semibold text-text-primary flex-1">Course Management</h1>
        <div className="flex items-center gap-2">
          <input
            className="input w-56 text-xs py-1.5"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-primary text-xs py-1.5" onClick={() => setModal('new')}>
            + Create New Course
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="px-6 py-3 border-b border-border bg-surface flex-shrink-0">
        <p className="text-xs text-text-secondary">Manage academic courses and enrollment</p>
      </div>

      {/* Fix 2: error banner */}
      {error && (
        <div className="bg-red/10 border border-red/30 text-red text-xs px-3 py-2 rounded-lg font-mono mx-6 mt-2">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-t-blue border-border rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-text-secondary text-sm">No courses found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#05070f] border-b border-[#1e2640] text-gray-400">
                <th className="text-left px-4 py-3 text-xs font-medium">Course Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Department</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Instructor</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Credits</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Max Enrollment</th>
                <th className="text-right px-4 py-3 text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b border-[#1e2640] hover:bg-[#1a1f2e] transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {c.name}
                    {c.description && (
                      <p className="text-xs text-text-dim mt-0.5 line-clamp-2">{c.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-orange">{c.department || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{c.instructor || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-cyan">{c.credits ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{c.max_enrollment ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModal(c)} className="btn-ghost text-xs py-1 mr-1">Edit</button>
                    {/* Fix 3/5: store whole course object */}
                    <button onClick={() => setDeleteId(c)}
                      className="text-xs px-2 py-1 rounded text-red hover:bg-red/10 transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Fix 3: pass departments to CourseModal */}
      {modal && (
        <CourseModal
          course={modal === 'new' ? null : modal}
          departments={departments}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Fix 3/5: deleteId is full course object; show course name */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#0c0f1e] border border-[#1e2640] rounded-lg p-6 w-full max-w-xs">
            <h3 className="text-base font-semibold text-text-primary mb-2">Delete Course</h3>
            <p className="text-sm text-text-secondary mb-1">
              Are you sure you want to delete <span className="text-text-primary font-medium">{deleteId.name}</span>?
            </p>
            <p className="text-xs text-text-dim mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 bg-[#1e2640] text-white px-3 py-2 rounded hover:bg-[#2e3650] text-sm">
                Cancel
              </button>
              <button onClick={handleDelete}
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
