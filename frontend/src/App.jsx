import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { SolanaProviders } from './lib/solana'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <SolanaProviders>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'rgba(18, 21, 29, 0.96)',
                  color: '#e8ebf0',
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '10px 14px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.7)',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#0c0e14' } },
                error:   { iconTheme: { primary: '#ef4444', secondary: '#0c0e14' } },
              }}
            />
          </AppProvider>
        </AuthProvider>
      </SolanaProviders>
    </BrowserRouter>
  )
}
