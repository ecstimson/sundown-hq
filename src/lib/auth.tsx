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
  signIn: (email: string, password: string) => Promise<void>
  signInWithPin: (name: string, pin: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [employeeError, setEmployeeError] = useState<string | null>(null)

  const initialized = useRef(false)

  useEffect(() => {
    // Guard against double-init (React StrictMode or fast remounts)
    if (initialized.current) return
    initialized.current = true

    withTimeout(
      supabase.auth.getSession(),
      10000,
      'Session check timed out. Refresh and try again.'
    )
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchEmployee(session.user)
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
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchEmployee(session.user)
        } else {
          setEmployee(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  function buildFallbackAdminProfile(authUser: User): Employee | null {
    const email = authUser.email?.toLowerCase()
    // Employee PIN accounts use the local alias domain; keep these strict.
    if (!email || email.endsWith('@sundown-hq.local')) return null

    const rawName = authUser.user_metadata?.full_name
      ?? authUser.user_metadata?.name
      ?? email.split('@')[0]

    return {
      id: authUser.id,
      name: String(rawName),
      pin: '',
      assigned_buildings: ['A', 'B'],
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
    }
  }

  async function fetchEmployee(authUser: User) {
    setEmployeeError(null)
    let data: Employee | null = null
    let error: { message: string } | null = null
    try {
      const response = await withTimeout(
        supabase
          .from('employees')
          .select('*')
          .eq('id', authUser.id)
          .single() as unknown as Promise<{ data: Employee | null; error: { message: string } | null }>,
        10000,
        'Profile lookup timed out. Please try logging in again.'
      )
      data = response.data
      error = response.error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile lookup failed'
      setEmployeeError(message)
      setEmployee(null)
      setLoading(false)
      return
    }

    if (!error && data) {
      setEmployee(data)
      setLoading(false)
      return
    }

    const fallbackAdmin = buildFallbackAdminProfile(authUser)
    if (fallbackAdmin) {
      setEmployee(fallbackAdmin)
      setEmployeeError(
        'Employee profile missing. Using temporary admin fallback for this account.'
      )
      setLoading(false)
      return
    }

    if (error) {
      console.error('Failed to load employee profile:', error.message)
      setEmployeeError(error.message)
      setEmployee(null)
    } else {
      setEmployeeError('No employee profile found for this account.')
      setEmployee(null)
    }
    setLoading(false)
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
    const { error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      15000,
      'Login took too long. Close extra tabs and try again.'
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
    const { error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: authEmail,
        password: derivedPassword,
      }),
      15000,
      'Login took too long. Close extra tabs and try again.'
    )

    // Backward-compatibility for legacy users created before derived PIN password.
    if (error) {
      const { error: legacyError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: authEmail,
          password: pin,
        }),
        15000,
        'Login took too long. Close extra tabs and try again.'
      )
      if (legacyError) throw legacyError
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setEmployee(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, employee, loading, employeeError, signIn, signInWithPin, signOut }}>
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
