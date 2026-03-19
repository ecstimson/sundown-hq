import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ChevronDown, Delete, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase, supabaseConfigValid } from "@/lib/supabase";
import { pinToAuthPassword } from "@/lib/pinAuth";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface EmployeeOption {
  name: string;
}

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 6;
const PIN_REGEX = /^\d{4,6}$/;

function isAuthLockError(message: string) {
  const text = message.toLowerCase();
  return text.includes("lock broken") || (text.includes("lock") && text.includes("state"));
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get("mode") === "admin";
  const { user, employee, signIn, signInWithPin, signOut, loading: authLoading } = useAuth();

  // Employee PIN state
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Admin email/password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Shared state
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isSignedIn = Boolean(user && employee);

  function getSignedInDestination() {
    if (!employee) return "/employee/dashboard";
    const isPrivilegedRole = ["admin", "super_admin"].includes(employee.role);
    if (isAdminMode && isPrivilegedRole) return "/admin/dashboard";
    return "/employee/dashboard";
  }

  // Fetch active employee names via secure RPC (no direct table access needed)
  async function loadEmployeeNames(attempt = 0) {
    if (!supabaseConfigValid) {
      setEmployeesError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.");
      return;
    }
    setEmployeesLoading(true);
    setEmployeesError(null);

    const response: { data: unknown; error: { message: string } | null } =
      await supabase.rpc("get_active_employee_names");

    // Retry once on transient auth-lock / network errors (up to 2 attempts, 300ms backoff)
    if (response.error && (isAuthLockError(response.error.message) || attempt === 0) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      return loadEmployeeNames(attempt + 1);
    }

    setEmployeesLoading(false);

    if (response.error) {
      console.error("Failed to load employee names:", response.error.message);
      setEmployeesError("Could not load employee list. Tap to retry.");
      return;
    }
    if (response.data) setEmployees(response.data as EmployeeOption[]);
  }

  useEffect(() => {
    if (!isAdminMode) loadEmployeeNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminMode]);

  const handleNumberClick = (num: number) => {
    if (pin.length < MAX_PIN_LENGTH) {
      const newPin = pin + num;
      setPin(newPin);
      setError("");
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  async function handlePinLogin(name: string, pinCode: string) {
    setIsLoading(true);
    setError("");
    try {
      await signInWithPin(name, pinCode);
      navigate("/employee/dashboard", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid PIN. Try again.";
      setError(message);
      setPin("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePinSubmit() {
    if (!selectedEmployee) {
      setError("Select an employee first.");
      return;
    }
    if (pin.length < MIN_PIN_LENGTH) {
      setError(`PIN must be at least ${MIN_PIN_LENGTH} digits.`);
      return;
    }
    await handlePinLogin(selectedEmployee, pin);
  }

  async function handleAdminLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      try {
        await signIn(email, password);
      } catch (firstErr) {
        // Compatibility fallback: if admin enters a numeric PIN in the password field,
        // retry with the derived auth password format.
        if (!PIN_REGEX.test(password)) throw firstErr;
        await signIn(email, pinToAuthPassword(password));
      }
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid email or password.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  // Wait for auth to finish initializing before rendering any form or redirect.
  // Without this guard the login form renders briefly then jumps to "already signed in"
  // the moment the stored session resolves — interrupting mid-entry for the user.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sundown-bg">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-sundown-bg p-6 max-w-md mx-auto w-full">
        <div className="w-full rounded-xl border border-sundown-border bg-sundown-card p-6 space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-sundown-text">You are already signed in</h1>
            <p className="text-sm text-sundown-muted">
              Signed in as <span className="text-sundown-text font-medium">{user?.email || employee?.name}</span>.
            </p>
            <p className="text-xs text-sundown-muted">
              If this is not you, sign out before logging in with another account.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => navigate(getSignedInDestination(), { replace: true })}>
              Continue
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                setIsLoading(true);
                setError("");
                try {
                  await signOut();
                  navigate("/login", { replace: true });
                } catch (err) {
                  const message = err instanceof Error ? err.message : "Sign out failed.";
                  setError(message);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Not you? Sign out"}
            </Button>
          </div>
          {error && (
            <div className="bg-sundown-card border border-sundown-red rounded-lg p-3">
              <p className="text-sundown-red text-sm text-center font-bold">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin email/password login
  if (isAdminMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-sundown-bg p-6 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center space-y-6 mb-12 w-full">
          <BrandLogo variant="icon" className="h-24 w-auto drop-shadow-[0_0_15px_rgba(212,168,83,0.4)]" />
          <h1 className="text-2xl font-bold tracking-tight text-sundown-text">Admin Login</h1>
        </div>

        <form onSubmit={handleAdminLogin} className="w-full space-y-6">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full h-14 bg-sundown-card border border-sundown-border rounded-xl px-4 text-lg text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold transition-colors"
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="w-full h-14 bg-sundown-card border border-sundown-border rounded-xl px-4 text-lg text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold transition-colors"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-sundown-card border border-sundown-red rounded-lg p-3">
              <p className="text-sundown-red text-sm text-center font-bold">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={!email || !password || isLoading}
            className="w-full h-14 text-lg font-bold rounded-xl shadow-[0_4px_14px_rgba(212,168,83,0.2)] bg-sundown-gold text-black hover:bg-sundown-gold-hover"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </Button>
        </form>

        <button
          onClick={() => navigate("/login")}
          className="mt-8 flex items-center gap-2 text-sundown-muted hover:text-sundown-text transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Employee Login
        </button>
      </div>
    );
  }

  // Employee PIN login
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sundown-bg p-6 max-w-md mx-auto w-full">
      {/* Logo Area */}
      <div className="flex flex-col items-center space-y-6 mb-12 w-full">
        <BrandLogo variant="stacked" className="h-32 w-auto drop-shadow-[0_0_15px_rgba(212,168,83,0.4)]" />
      </div>

      {/* Employee Selector */}
      <div className="w-full mb-8 relative z-10">
        <button
          onClick={() => {
            if (employeesError) {
              loadEmployeeNames();
              return;
            }
            if (!employeesLoading) setIsDropdownOpen(!isDropdownOpen);
          }}
          className="w-full h-14 bg-sundown-card border border-sundown-border rounded-xl px-4 flex items-center justify-between text-lg text-sundown-text focus:outline-none focus:border-sundown-gold transition-colors hover:border-sundown-gold"
        >
          {employeesLoading ? (
            <span className="flex items-center gap-2 text-sundown-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading employees…
            </span>
          ) : employeesError ? (
            <span className="text-sundown-red text-base font-medium">{employeesError}</span>
          ) : (
            <span className={!selectedEmployee ? "text-sundown-muted" : "text-sundown-text font-bold"}>
              {selectedEmployee || "Select Employee"}
            </span>
          )}
          <ChevronDown className={cn("w-5 h-5 text-sundown-muted transition-transform shrink-0", isDropdownOpen && "rotate-180")} />
        </button>

        {isDropdownOpen && !employeesLoading && !employeesError && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-sundown-card border border-sundown-border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto ring-1 ring-black/5">
            {employees.length === 0 ? (
              <div className="px-4 py-3 text-sundown-muted text-center">No employees found</div>
            ) : (
              employees.map((emp) => (
                <button
                  key={emp.name}
                  onClick={() => {
                    setSelectedEmployee(emp.name);
                    setIsDropdownOpen(false);
                    setPin("");
                    setError("");
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-sundown-border text-sundown-text transition-colors border-b border-sundown-border last:border-0 font-medium"
                >
                  {emp.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* PIN Display */}
      <div className="flex gap-4 mb-8 justify-center h-4">
        {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-200",
              pin.length > i 
                ? "bg-sundown-gold scale-110 shadow-[0_0_8px_rgba(212,168,83,0.5)]" 
                : "bg-sundown-border"
            )}
          />
        ))}
      </div>

      {/* Error message */}
      <div className="h-6 mb-4 w-full flex justify-center">
        {error && (
          <p className="text-sundown-red text-sm font-bold animate-in fade-in slide-in-from-top-1">{error}</p>
        )}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-4 w-full mb-8 max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            disabled={isLoading}
            className="h-16 w-16 rounded-full bg-sundown-card text-2xl font-bold text-sundown-text hover:bg-sundown-border active:bg-sundown-gold active:text-black transition-all touch-manipulation disabled:opacity-50 mx-auto flex items-center justify-center border border-transparent hover:border-sundown-gold"
          >
            {num}
          </button>
        ))}
        <div /> {/* Empty slot */}
        <button
          onClick={() => handleNumberClick(0)}
          disabled={isLoading}
          className="h-16 w-16 rounded-full bg-sundown-card text-2xl font-bold text-sundown-text hover:bg-sundown-border active:bg-sundown-gold active:text-black transition-all touch-manipulation disabled:opacity-50 mx-auto flex items-center justify-center border border-transparent hover:border-sundown-gold"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="h-16 w-16 rounded-full bg-transparent flex items-center justify-center text-sundown-muted hover:text-sundown-text active:text-sundown-red transition-colors mx-auto"
        >
          <Delete className="w-8 h-8" />
        </button>
      </div>

      <Button
        onClick={handlePinSubmit}
        disabled={isLoading || !selectedEmployee || pin.length < MIN_PIN_LENGTH}
        className="w-full h-12 max-w-[280px] mb-6"
      >
        Sign In
      </Button>

      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-sundown-gold animate-spin" />
        </div>
      )}

      {/* Admin login link */}
      <button
        onClick={() => navigate("/login?mode=admin")}
        className="text-sundown-muted hover:text-sundown-text transition-colors text-sm font-medium"
      >
        Admin Login
      </button>
    </div>
  );
}
