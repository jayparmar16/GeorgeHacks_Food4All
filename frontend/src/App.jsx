import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { SolanaProviders } from './lib/solana'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <SolanaProviders>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#1e2330', color: '#e2e8f0', border: '1px solid #334155' },
                success: { iconTheme: { primary: '#10b981', secondary: '#1e2330' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#1e2330' } },
              }}
            />
          </AppProvider>
        </AuthProvider>
      </SolanaProviders>
    </BrowserRouter>
  )
}
