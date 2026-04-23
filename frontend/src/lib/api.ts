import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 90000,
})

api.interceptors.request.use(cfg => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token')
    if (t) cfg.headers.Authorization = `Bearer ${t}`
  }
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token')
      window.location.href = '/auth'
    }
    return Promise.reject(err)
  }
)

export default api

export const authAPI = {
  login:    (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/auth/register', { name, email, password }),
  me:       () => api.get('/auth/me'),
   // ↓ Add these two — they need backend routes to be added too
  updateProfile:  (data: { name: string }) => api.put('/auth/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/password', data),
}

export const jobsAPI = {
  list:    ()                      => api.get('/jobs'),
  get:     (id: string)            => api.get(`/jobs/${id}`),
  create:  (data: any)             => api.post('/jobs', data),
  update:  (id: string, d: any)    => api.put(`/jobs/${id}`, d),
  delete:  (id: string)            => api.delete(`/jobs/${id}`),
  analyze: (id: string)            => api.post(`/jobs/${id}/analyze`),
}

export const candidatesAPI = {
  list:       (params?: any) => api.get('/candidates', { params }),
  get:        (id: string)   => api.get(`/candidates/${id}`),
  countByJob: ()             => api.get('/candidates/count-by-job'),
  delete:     (id: string)   => api.delete(`/candidates/${id}`),

  // Multi-file upload — sends all files in one request
  uploadFiles: (files: File[], jobId?: string) => {
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    if (jobId) fd.append('jobId', jobId)
    return api.post('/candidates/upload-cv', fd)
  },

  uploadSpreadsheet: (files: File[], jobId?: string) => {
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    if (jobId) fd.append('jobId', jobId)
    return api.post('/candidates/upload-spreadsheet', fd)
  },

  bulkUmurava: (profiles: any[], jobId?: string) =>
    api.post(`/candidates/umurava-bulk${jobId ? `?jobId=${jobId}` : ''}`, profiles),
}

export const screeningAPI = {
  run:         (jobId: string, topN = 10) => api.post(`/screen/run/${jobId}`, { topN }),
  results:     (jobId: string)            => api.get(`/screen/results/${jobId}`),
  stats:       (jobId: string)            => api.get(`/screen/stats/${jobId}`),
  deepAnalysis:(resultId: string)         => api.get(`/screen/candidate/${resultId}/deep-analysis`),
}

