import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { pinToAuthPassword } from './pinAuth'
import type { User, Session } from '@supabase/supabase-js'
import type { Employee } from '@/types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  employee: Employee | null
  loading: boolean
  employeeError: string | null
  employeeNotFound: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithPin: (name: string, pin: string) => Promise<void>
  signOut: () => Promise<void>
  retryFetchEmployee: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [employeeError, setEmployeeError] = useState<string | null>(null)
  const [employeeNotFound, setEmployeeNotFound] = useState(false)

  const initialized = useRef(false)
  // Keep a ref to the current user so retryFetchEmployee always sees the latest value
  const userRef = useRef<User | null>(null)
  userRef.current = user

  useEffect(() => {
    // Guard against double-init (React StrictMode or fast remounts)
    if (initialized.current) return
    initialized.current = true

    withAuthLockRetry(() =>
      withTimeout(
        supabase.auth.getSession(),
        10000,
        'Session check timed out. Refresh and try again.'
      )
    )
      .then(async ({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchEmployee(session.user)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to initialize auth session:', err)
        setEmployeeError(err instanceof Error ? err.message : 'Failed to initialize auth')
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setSession(session)
          setUser(session?.user ?? null)
          if (session?.user) {
            if (event === 'TOKEN_REFRESHED') {
              // Background re-fetch — don't flip loading state to avoid a spinner flash
              fetchEmployee(session.user, true).catch((err) =>
                console.error('Background employee refresh on TOKEN_REFRESHED failed:', err)
              )
            } else {
              await fetchEmployee(session.user)
            }
          } else {
            setEmployee(null)
            setEmployeeNotFound(false)
            setEmployeeError(null)
            setLoading(false)
          }
        } catch (err) {
          console.error('Auth state change error:', err)
          setEmployeeError(err instanceof Error ? err.message : 'Auth state update failed')
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  function isAuthLockError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const message = error.message.toLowerCase()
    return (
      error.name === 'AbortError' ||
      message.includes('lock broken') ||
      (message.includes('lock') && message.includes('state'))
    )
  }

  async function withAuthLockRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (!isAuthLockError(error)) throw error
      // Browser lock contention can happen across tabs/windows; brief backoff stabilizes auth reads.
      await new Promise((resolve) => setTimeout(resolve, 200))
      return operation()
    }
  }

  /**
   * Fetches the employee profile for the given auth user with retry logic.
   *
   * silent=true: skips loading-state changes so TOKEN_REFRESHED re-fetches
   * happen transparently in the background.
   *
   * Sign-out only occurs when the employee record is confirmed missing (PGRST116).
   * Transient failures (network errors, timeouts, other RLS hiccups) are retried
   * and surfaced as errors without terminating the session.
   */
  async function fetchEmployee(authUser: User, silent = false) {
    if (!silent) {
      setEmployeeError(null)
      setEmployeeNotFound(false)
    }

    const MAX_RETRIES = 3
    const RETRY_DELAY_MS = 1000

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }

      let data: Employee | null = null
      let error: { message: string; code?: string } | null = null

      try {
        const response = await withAuthLockRetry(() =>
          withTimeout(
            supabase
              .from('employees')
              .select('*')
              .eq('id', authUser.id)
              .single() as unknown as Promise<{
                data: Employee | null
                error: { message: string; code?: string } | null
              }>,
            10000,
            'Profile lookup timed out. Please try logging in again.'
          )
        )
        data = response.data
        error = response.error
      } catch (err) {
        // Network error or timeout — retry if attempts remain
        if (attempt < MAX_RETRIES - 1) continue
        // All retries exhausted — surface the error without signing out
        const message = err instanceof Error ? err.message : 'Profile lookup failed'
        console.error('Employee profile fetch failed after retries (network/timeout):', message)
        setEmployeeError(message)
        setEmployee(null)
        if (!silent) setLoading(false)
        return
      }

      if (!error && data) {
        setEmployee(data)
        setEmployeeNotFound(false)
        setEmployeeError(null)
        if (!silent) setLoading(false)
        return
      }

      if (error?.code === 'PGRST116') {
        // No rows found — the employee record genuinely doesn't exist
        console.error('No employee profile found for user:', authUser.id)
        setEmployeeError(
          'No employee profile found for this account. Ask an admin to finish account setup.'
        )
        setEmployeeNotFound(true)
        setEmployee(null)
        if (!silent) setLoading(false)
        return
      }

      if (error) {
        // Other Supabase error (RLS hiccup, unexpected failure) — retry if attempts remain
        if (attempt < MAX_RETRIES - 1) continue
        // All retries exhausted
        console.error('Failed to load employee profile after retries:', error.message)
        setEmployeeError(error.message)
        setEmployee(null)
        if (!silent) setLoading(false)
        return
      }

      // !error && !data — .single() should always give one or the other, but handle defensively
      setEmployeeError('Employee profile unexpectedly empty.')
      setEmployee(null)
      if (!silent) setLoading(false)
      return
    }
  }

  async function retryFetchEmployee() {
    const currentUser = userRef.current
    if (!currentUser) return
    setLoading(true)
    await fetchEmployee(currentUser)
  }

  async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms)
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await withAuthLockRetry(() =>
      withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        'Login took too long. Close extra tabs and try again.'
      )
    )
    if (error) throw error
  }

  async function signInWithPin(name: string, pin: string) {
    // Verify PIN server-side via RPC — never queries PIN column from client
    const { data, error: rpcError } = await (supabase
      .rpc as any)('verify_employee_pin', { p_name: name, p_pin: pin })

    if (rpcError) {
      throw new Error('Login service unavailable. Please try again.')
    }

    const result = data as { auth_email: string }[] | null
    if (!result || result.length === 0) {
      throw new Error('Invalid name or PIN')
    }

    const authEmail = result[0].auth_email
    const derivedPassword = pinToAuthPassword(pin)
    const { error } = await withAuthLockRetry(() =>
      withTimeout(
        supabase.auth.signInWithPassword({
          email: authEmail,
          password: derivedPassword,
        }),
        15000,
        'Login took too long. Close extra tabs and try again.'
      )
    )

    // Backward-compatibility for legacy users created before derived PIN password.
    if (error) {
      console.error('Primary PIN signInWithPassword failed (trying legacy format):', error)
      const { error: legacyError } = await withAuthLockRetry(() =>
        withTimeout(
          supabase.auth.signInWithPassword({
            email: authEmail,
            password: pin,
          }),
          15000,
          'Login took too long. Close extra tabs and try again.'
        )
      )
      if (legacyError) {
        console.error('Legacy PIN signInWithPassword also failed:', legacyError)
        throw legacyError
      }
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    setEmployee(null)
    setEmployeeNotFound(false)
    setEmployeeError(null)
    setSession(null)
    setUser(null)
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        employee,
        loading,
        employeeError,
        employeeNotFound,
        signIn,
        signInWithPin,
        signOut,
        retryFetchEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
