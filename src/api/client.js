import axios from 'axios'

// In production (Vercel), set VITE_API_URL to your Railway/Render backend URL.
// In development, the Vite proxy forwards /api → localhost:8000 automatically.
const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      // ProtectedRoute handles redirect; avoid hard reload that disrupts React state
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')

// Students
export const getStudents = (params) => api.get('/students', { params })
export const createStudent = (data) => api.post('/students', data)
export const updateStudent = (id, data) => api.put(`/students/${id}`, data)
export const deleteStudent = (id) => api.delete(`/students/${id}`)
export const getDepartments = () => api.get('/students/departments/list')

// Courses
export const getCourses = (params) => api.get('/courses', { params })
export const createCourse = (data) => api.post('/courses', data)
export const updateCourse = (id, data) => api.put(`/courses/${id}`, data)
export const deleteCourse = (id) => api.delete(`/courses/${id}`)

// SQL Agent
export const runAgentQuery = (query) => api.post('/agent/query', { query })
export const getQueryHistory = () => api.get('/agent/history')
export const getAgentStats = () => api.get('/agent/stats')
export const getSchema = () => api.get('/agent/schema')

// RAG / Doc Intel
export const uploadDoc = (formData) =>
  api.post('/rag/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const queryRag = (query) => api.post('/rag/query', { query })
export const getDocs = () => api.get('/rag/docs')

// Reports
export const getAnalytics = () => api.get('/reports/analytics')
export const getSummary = () => api.get('/reports/summary')
export const getDeptPerformance = () => api.get('/reports/department-performance')
export const exportCSV = () => api.get('/reports/export/csv', { responseType: 'blob' })
export const getHonorRoll = () => api.get('/reports/honor-roll')
export const getProbation = () => api.get('/reports/probation')
export const exportPDF = () => api.get('/reports/export/pdf', { responseType: 'blob' })

// Data Studio (BYO Data)
export const connectDataStudio = (data) => api.post('/datastudio/connect', data)
export const uploadDataStudioFile = (formData) => api.post('/datastudio/upload', formData, { 
  headers: { 'Content-Type': 'multipart/form-data' } 
})
export const queryDataStudio = (query, connection_id) => api.post('/datastudio/query', { query, connection_id })

export default api
