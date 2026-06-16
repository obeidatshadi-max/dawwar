import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAuthInit } from './hooks/useAuth'
import Onboarding from './pages/Onboarding/Onboarding'

function PrivateRoute({ children }) {
  const { session, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!session) return <Navigate to="/onboarding" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { session, loading, profile } = useAuthStore()
  if (loading) return null
  if (session && profile) return <Navigate to="/feed" replace />
  return children
}

export default function App() {
  useAuthInit()

  return (
    <Routes>
      <Route path="/onboarding" element={
        <PublicOnlyRoute><Onboarding /></PublicOnlyRoute>
      } />
      <Route path="/feed" element={
        <PrivateRoute>
          <div className="min-h-screen bg-brand-bg flex items-center justify-center">
            <p className="text-brand-muted">الرئيسية — قادمة في Plan B</p>
          </div>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  )
}
