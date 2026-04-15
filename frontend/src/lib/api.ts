import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token')
      window.location.href = '/auth'
    }
    return Promise.reject(err)
  }
)

export default api

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
}

export const jobsAPI = {
  list: () => api.get('/jobs'),
  get: (id: string) => api.get(`/jobs/${id}`),
  create: (data: any) => api.post('/jobs', data),
  update: (id: string, data: any) => api.put(`/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
  analyze: (id: string) => api.post(`/jobs/${id}/analyze`),
}

export const candidatesAPI = {
  list: (params?: any) => api.get('/candidates', { params }),
  get: (id: string) => api.get(`/candidates/${id}`),
  uploadCV: (file: File, jobId?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    if (jobId) fd.append('jobId', jobId)
    return api.post('/candidates/upload-cv', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadSpreadsheet: (file: File, jobId?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    if (jobId) fd.append('jobId', jobId)
    return api.post('/candidates/upload-spreadsheet', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  bulkUmurava: (profiles: any[]) => api.post('/candidates/umurava-bulk', profiles),
  delete: (id: string) => api.delete(`/candidates/${id}`),
}

export const screeningAPI = {
  run: (jobId: string, topN = 20) => api.post(`/screen/run/${jobId}`, { topN }),
  results: (jobId: string) => api.get(`/screen/results/${jobId}`),
  stats: (jobId: string) => api.get(`/screen/stats/${jobId}`),
  deepAnalysis: (resultId: string) => api.get(`/screen/candidate/${resultId}/deep-analysis`),
}
