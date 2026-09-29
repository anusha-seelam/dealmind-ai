import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DealWorkspace from './pages/DealWorkspace'
import LearningCenter from './pages/LearningCenter'
import Login from './pages/Login'
import Register from './pages/Register'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-text-muted text-sm animate-pulse">Loading…</div>
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/deal" element={
        <ProtectedRoute>
          <Layout><DealWorkspace /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/learning" element={
        <ProtectedRoute>
          <Layout><LearningCenter /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
