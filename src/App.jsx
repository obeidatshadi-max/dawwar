import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAuthInit } from './hooks/useAuth'
import { usePushSync } from './hooks/useRequestNotifications'
import Spinner from './components/Spinner'
import AppLayout from './components/AppLayout'

const Onboarding = lazy(() => import('./pages/Onboarding/Onboarding'))
const JoinNetwork = lazy(() => import('./pages/JoinNetwork'))
const Feed = lazy(() => import('./pages/Feed/Feed'))
const CreatePost = lazy(() => import('./pages/CreatePost/CreatePost'))
const Inbox = lazy(() => import('./pages/Messages/Inbox'))
const Thread = lazy(() => import('./pages/Messages/Thread'))
const Networks = lazy(() => import('./pages/Networks/Networks'))
const CreateNetwork = lazy(() => import('./pages/Networks/CreateNetwork'))
const AdminPanel = lazy(() => import('./pages/Networks/AdminPanel'))
const Profile = lazy(() => import('./pages/Profile/Profile'))
const SeedTool = lazy(() => import('./pages/Admin/SeedTool'))

function PrivateRoute({ children }) {
  const { session, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/onboarding" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { session, loading, profile } = useAuthStore()
  if (loading) return <Spinner />
  if (session && profile) return <Navigate to="/feed" replace />
  return children
}

export default function App() {
  useAuthInit()
  usePushSync()

  return (
    <Suspense fallback={<Spinner />}>
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
    </Suspense>
  )
}
