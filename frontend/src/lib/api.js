import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rfs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rfs_token')
      localStorage.removeItem('rfs_user')
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateWallet: (walletAddress) => api.patch('/auth/me/wallet', { walletAddress }),
}

// NGOs
export const ngoAPI = {
  list: (params) => api.get('/ngos', { params }),
  get: (id) => api.get(`/ngos/${id}`),
}

// Vendors
export const vendorAPI = {
  register: (data) => api.post('/vendors/register', data),
  list: (params) => api.get('/vendors', { params }),
  get: (id) => api.get(`/vendors/${id}`),
  vouch: (id, action) => api.post(`/vendors/${id}/vouch`, { action }),
}

// Farmers
export const farmerAPI = {
  enroll: (data) => api.post('/farmers/enroll', data),
  list: (params) => api.get('/farmers', { params }),
  pledges: (params) => api.get('/farmers/pledges', { params }),
}

// Donations
export const donationAPI = {
  create: (data) => api.post('/donations', data),
  mine: () => api.get('/donations'),
  forNgo: (id) => api.get(`/donations/ngo/${id}`),
}

// Tickets
export const ticketAPI = {
  create: (data) => api.post('/tickets', data),
  list: (params) => api.get('/tickets', { params }),
  verify: (code) => api.get(`/tickets/verify/${code}`),
  redeem: (data) => api.post('/tickets/redeem', data),
}

// Market Pulse
export const pulseAPI = {
  postMessage: (data) => api.post('/market-pulse/message', data),
  messages: (region, params) => api.get(`/market-pulse/messages/${region}`, { params }),
  summarize: (region, params) => api.post(`/market-pulse/summarize/${region}`, null, { params }),
  summary: (region, params) => api.get(`/market-pulse/summary/${region}`, { params }),
  regions: (params) => api.get('/market-pulse/regions', { params }),
}

// Routing
export const routingAPI = {
  route: (data) => api.post('/routing/route', data),
  flaggedPlaces: (params) => api.get('/routing/flagged-places', { params }),
  markets: (params) => api.get('/routing/markets', { params }),
}

// Activations
export const activationAPI = {
  check: (country) => api.post('/activations/check', null, { params: { country } }),
  trigger: (data) => api.post('/activations/trigger', data),
  active: (country) => api.get('/activations/active', { params: { country } }),
  hotspots: (params) => api.get('/activations/hotspots', { params }),
}

// Admin
export const adminAPI = {
  seedDemo: () => api.post('/admin/seed-demo'),
  ingestNgos: (country) => api.post('/admin/ingest-ngos', null, { params: { country } }),
  culturalDefaults: () => api.get('/cultural-defaults'),
}
