import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAuthInit } from './hooks/useAuth'
import { usePushSync } from './hooks/useRequestNotifications'
import AppLayout from './components/AppLayout'
import Onboarding from './pages/Onboarding/Onboarding'
import JoinNetwork from './pages/JoinNetwork'
import Feed from './pages/Feed/Feed'
import CreatePost from './pages/CreatePost/CreatePost'
import Inbox from './pages/Messages/Inbox'
import Thread from './pages/Messages/Thread'
import Networks from './pages/Networks/Networks'
import CreateNetwork from './pages/Networks/CreateNetwork'
import AdminPanel from './pages/Networks/AdminPanel'
import Profile from './pages/Profile/Profile'
import SeedTool from './pages/Admin/SeedTool'

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
  if (loading) return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (session && profile) return <Navigate to="/feed" replace />
  return children
}

export default function App() {
  useAuthInit()
  usePushSync()

  return (
    <Routes>
      <Route path="/onboarding" element={
        <PublicOnlyRoute><Onboarding /></PublicOnlyRoute>
      } />
      <Route path="/feed" element={
        <PrivateRoute><AppLayout><Feed /></AppLayout></PrivateRoute>
      } />
      <Route path="/join" element={<JoinNetwork />} />
      <Route path="/create" element={
        <PrivateRoute><CreatePost /></PrivateRoute>
      } />
      <Route path="/messages" element={
        <PrivateRoute><AppLayout><Inbox /></AppLayout></PrivateRoute>
      } />
      <Route path="/messages/:postId" element={
        <PrivateRoute><AppLayout><Thread /></AppLayout></PrivateRoute>
      } />
      <Route path="/networks" element={
        <PrivateRoute><AppLayout><Networks /></AppLayout></PrivateRoute>
      } />
      <Route path="/networks/new" element={
        <PrivateRoute><CreateNetwork /></PrivateRoute>
      } />
      <Route path="/networks/:networkId/admin" element={
        <PrivateRoute><AppLayout><AdminPanel /></AppLayout></PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute><AppLayout><Profile /></AppLayout></PrivateRoute>
      } />
      <Route path="/admin/seed" element={
        <PrivateRoute><SeedTool /></PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  )
}
