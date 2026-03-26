import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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
      window.location.href = '/login'
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
export const getReportsSummary = () => api.get('/reports/summary')

export default api
