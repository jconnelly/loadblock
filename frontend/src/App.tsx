import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import theme from './theme'
import { AuthProvider } from './hooks/useAuth'
// import { NotificationProvider } from './hooks/useNotifications'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import BoLListPage from './pages/BoLListPage'
import CreateBoLPage from './pages/CreateBoLPage'
import BoLDetailPage from './pages/BoLDetailPage'
// import NotificationTest from './components/notifications/NotificationTest'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        {/* <NotificationProvider> */}
          <Router>
            <Routes>
              {/* Public routes (redirect to dashboard if already authenticated) */}
              <Route
                path="/login"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <LoginPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <RegisterPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requireAuth={true}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/bol"
                element={
                  <ProtectedRoute requireAuth={true}>
                    <BoLListPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/bol/create"
                element={
                  <ProtectedRoute requireAuth={true}>
                    <CreateBoLPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/bol/:id"
                element={
                  <ProtectedRoute requireAuth={true}>
                    <BoLDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Test route for notifications */}
              {/* <Route path="/test-notifications" element={<NotificationTest />} /> */}

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        {/* </NotificationProvider> */}
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App