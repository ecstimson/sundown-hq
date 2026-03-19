import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requireRole?: 'admin' | 'super_admin'
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, employee, loading, employeeError, employeeNotFound, signOut, retryFetchEmployee } =
    useAuth()
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
      const isConfirmedMissing = employeeNotFound
      const title = isConfirmedMissing ? 'Account Setup Incomplete' : 'Unable to Load Profile'
      const body = isConfirmedMissing
        ? 'Your employee profile could not be loaded. Contact an administrator to ensure your account is properly configured.'
        : (employeeError ?? 'There was a problem loading your profile. This may be a temporary issue.')

      return (
        <div className="min-h-screen flex items-center justify-center bg-sundown-bg p-8">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl font-semibold text-sundown-text">{title}</h2>
            <p className="text-sundown-muted">{body}</p>
            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                onClick={() => retryFetchEmployee()}
                className="px-4 py-2 bg-sundown-gold text-sundown-bg rounded font-medium hover:opacity-90 transition-opacity text-sm"
              >
                Retry
              </button>
              <button
                onClick={() => signOut()}
                className="text-sundown-muted hover:text-sundown-text hover:underline text-sm"
              >
                Return to Login
              </button>
            </div>
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
