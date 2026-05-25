import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const WS_URL = BASE_URL.replace('http', 'ws')
export const exportCSV   = () => `${BASE_URL}/transactions/export/csv`
export const exportExcel = () => `${BASE_URL}/transactions/export/excel`

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
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

// Users (admin only)
export const getUsers = () => api.get('/users')
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

// Products
export const getProducts = (params) => api.get('/products', { params })
export const getProduct = (id) => api.get(`/products/${id}`)
export const createProduct = (data) => api.post('/products', data)
export const updateProduct = (id, data) => api.put(`/products/${id}`, data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)
export const getCategories = () => api.get('/products/categories')
export const getAlerts = () => api.get('/products/alerts')
export const getUnits  = () => api.get('/units')

// Vouchers
export const getVouchers = (params) => api.get('/vouchers', { params })
export const getVoucher = (id) => api.get(`/vouchers/${id}`)
export const createVoucher = (data) => api.post('/vouchers', data)
export const updateVoucher = (id, data) => api.put(`/vouchers/${id}`, data)
export const submitVoucher = (id) => api.post(`/vouchers/${id}/submit`)
export const approveVoucher = (id) => api.post(`/vouchers/${id}/approve`)
export const rejectVoucher = (id, data) => api.post(`/vouchers/${id}/reject`, data)
export const cancelVoucher = (id, data) => api.post(`/vouchers/${id}/cancel`, data)
export const startVoucher = (id) => api.post(`/vouchers/${id}/start`)
export const confirmVoucher = (id, data) => api.post(`/vouchers/${id}/confirm`, data)
export const forceCompleteVoucher = (id, data) => api.post(`/vouchers/${id}/force-complete`, data)
export const getVoucherLogs = (id) => api.get(`/vouchers/${id}/logs`)
export const printVoucher = (id) => `${BASE_URL}/vouchers/${id}/print`

// Transactions (manager read-only)
export const getTransactions = (params) => api.get('/transactions', { params })
export const getTransactionSummary = (params) => api.get('/transactions/summary', { params })
export const exportTransactionsExcel = () => `${BASE_URL}/transactions/export/excel`

// Staff Entries
export const getStaffEntries = (params) => api.get('/staff-entries', { params })
export const createStaffEntry = (data) => api.post('/staff-entries', data)
export const exportComparison = (voucherId) => `${BASE_URL}/staff-entries/export/excel?voucher_id=${voucherId}`

// Approvals (alias của Vouchers - chứng từ phê duyệt)
export const getApprovals = (params) => api.get('/vouchers', { params })
export const createApproval = (data) => api.post('/vouchers', data)
export const printApproval = (id) => `${BASE_URL}/vouchers/${id}/print`

// Chat
export const getChatMessages = (limit) => api.get('/chat/messages', { params: { limit } })

export default api