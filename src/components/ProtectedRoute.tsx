import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requireRole?: 'admin' | 'super_admin'
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, employee, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sundown-bg">
        <div className="w-8 h-8 border-2 border-sundown-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireRole) {
    // Default-deny: if employee profile is missing, block access to role-gated routes
    if (!employee) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sundown-bg p-8">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl font-semibold text-sundown-text">
              Account Setup Incomplete
            </h2>
            <p className="text-sundown-muted">
              Your employee profile could not be loaded. Contact an administrator
              to ensure your account is properly configured.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="text-sundown-gold hover:underline text-sm"
            >
              Return to Login
            </button>
          </div>
        </div>
      )
    }

    const hasAccess = requireRole === 'admin'
      ? ['admin', 'super_admin'].includes(employee.role)
      : employee.role === 'super_admin'

    if (!hasAccess) {
      return <Navigate to="/employee/dashboard" replace />
    }
  }

  return <>{children}</>
}
