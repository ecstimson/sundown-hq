import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, ClipboardList, Book, Plus, List, CalendarDays, MessageSquare, ChevronDown, Settings, Clock3, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { supabase } from "@/lib/supabase";
import type { EmployeeTimeEntry } from "@/types/database";

export default function EmployeeLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { employee, signOut } = useAuth();
  const [showLogoMenu, setShowLogoMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeClockEntryId, setActiveClockEntryId] = useState<string | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const logoMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const routeTitle = (() => {
    if (location.pathname.includes("/employee/animals/")) return "Animal Detail";
    if (location.pathname.includes("/employee/animals")) return "Animals";
    if (location.pathname.includes("/employee/checklists")) return "Checklists";
    if (location.pathname.includes("/employee/schedule")) return "Schedule";
    if (location.pathname.includes("/employee/sops")) return "SOP Library";
    if (location.pathname.includes("/employee/messages")) return "Team Chat";
    if (location.pathname.includes("/employee/observe")) return "Log Observation";
    if (location.pathname.includes("/employee/scan")) return "Quick Add";
    if (location.pathname.includes("/employee/tasks")) return "Tasks";
    return "Dashboard";
  })();

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (logoMenuRef.current && !logoMenuRef.current.contains(event.target as Node)) {
        setShowLogoMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    async function loadClockStatus() {
      if (!employee) return;
      const { data } = await (supabase
        .from("employee_time_entries") as any)
        .select("id")
        .eq("employee_id", employee.id)
        .is("clock_out_at", null)
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveClockEntryId((data as EmployeeTimeEntry | null)?.id || null);
    }
    void loadClockStatus();
  }, [employee]);

  async function handleClockIn() {
    if (!employee) return;
    setClockLoading(true);
    const { error } = await (supabase
      .from("employee_time_entries") as any)
      .insert({ employee_id: employee.id });
    setClockLoading(false);
    if (error) {
      alert(`Clock in failed: ${error.message}`);
      return;
    }
    const { data } = await (supabase
      .from("employee_time_entries") as any)
      .select("id")
      .eq("employee_id", employee.id)
      .is("clock_out_at", null)
      .order("clock_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveClockEntryId((data as EmployeeTimeEntry | null)?.id || null);
    setShowUserMenu(false);
  }

  async function handleClockOut() {
    if (!activeClockEntryId) return;
    setClockLoading(true);
    const { error } = await (supabase
      .from("employee_time_entries") as any)
      .update({ clock_out_at: new Date().toISOString() })
      .eq("id", activeClockEntryId);
    setClockLoading(false);
    if (error) {
      alert(`Clock out failed: ${error.message}`);
      return;
    }
    setActiveClockEntryId(null);
    setShowUserMenu(false);
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
    navigate("/login");
  }

  return (
    <div className="flex flex-col min-h-screen bg-sundown-bg text-sundown-text">
      <header className="h-16 border-b border-sundown-border flex items-center justify-between px-4 bg-sundown-bg/95 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0 relative" ref={logoMenuRef}>
          <button
            onClick={() => setShowLogoMenu((prev) => !prev)}
            className="h-8 px-2 bg-sundown-card border border-sundown-border flex items-center gap-1 shrink-0 hover:border-sundown-gold/40 transition-colors"
            aria-haspopup="menu"
            aria-expanded={showLogoMenu}
          >
            <BrandLogo variant="icon" className="h-4 w-4" />
            <ChevronDown className={cn("w-3 h-3 text-sundown-muted transition-transform", showLogoMenu && "rotate-180")} />
          </button>
          {showLogoMenu && (
            <div className="absolute top-10 left-0 w-44 border border-sundown-border bg-sundown-card shadow-lg overflow-hidden z-40">
              <NavLink
                to="/employee/checklists"
                onClick={() => setShowLogoMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-sundown-text hover:bg-sundown-bg border-b border-sundown-border"
              >
                <ClipboardList className="w-4 h-4 text-sundown-gold" />
                Checklists
              </NavLink>
              <NavLink
                to="/employee/sops"
                onClick={() => setShowLogoMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-sundown-text hover:bg-sundown-bg"
              >
                <Book className="w-4 h-4 text-sundown-gold" />
                SOPs
              </NavLink>
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-sundown-text truncate">{routeTitle}</h2>
          </div>
        </div>
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2 py-1 border border-sundown-border bg-sundown-card hover:border-sundown-gold/40 transition-colors"
          >
            <span className="text-sm font-bold text-sundown-text truncate max-w-[32vw]">
              {employee?.name || "Employee"}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-sundown-muted transition-transform", showUserMenu && "rotate-180")} />
          </button>
          {showUserMenu && (
            <div className="absolute top-10 right-0 w-44 border border-sundown-border bg-sundown-card shadow-lg z-40 overflow-hidden">
              <button
                onClick={() => {
                  navigate("/employee/settings");
                  setShowUserMenu(false);
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-sundown-text hover:bg-sundown-bg border-b border-sundown-border"
              >
                <Settings className="w-4 h-4 text-sundown-gold" />
                Settings
              </button>
              <button
                onClick={() => (activeClockEntryId ? handleClockOut() : handleClockIn())}
                disabled={clockLoading}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-sundown-text hover:bg-sundown-bg border-b border-sundown-border disabled:opacity-60"
              >
                <Clock3 className="w-4 h-4 text-sundown-gold" />
                {clockLoading ? "Working..." : activeClockEntryId ? "Clock Out" : "Clock In"}
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-sundown-text hover:bg-sundown-bg"
              >
                <LogOut className="w-4 h-4 text-sundown-red" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-sundown-card/95 backdrop-blur border-t border-sundown-border h-20 flex items-center justify-around z-30 pb-safe px-2">
        <NavLink
          to="/employee/dashboard"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              isActive ? "text-sundown-gold" : "text-sundown-muted hover:text-sundown-text"
            )
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wide">Home</span>
        </NavLink>
        
        <NavLink
          to="/employee/animals"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              isActive ? "text-sundown-gold" : "text-sundown-muted hover:text-sundown-text"
            )
          }
        >
          <List className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wide">Animals</span>
        </NavLink>

        <NavLink
          to="/employee/scan"
          className="flex flex-col items-center justify-center w-full h-full -mt-10"
        >
          <div className="allow-circle w-16 h-16 rounded-full bg-sundown-gold flex items-center justify-center text-black shadow-lg shadow-sundown-gold/30">
            <Plus className="w-8 h-8" strokeWidth={2.6} />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wide mt-1 text-sundown-gold">Add</span>
        </NavLink>

        <NavLink
          to="/employee/schedule"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              isActive ? "text-sundown-gold" : "text-sundown-muted hover:text-sundown-text"
            )
          }
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wide">Schedule</span>
        </NavLink>

        <NavLink
          to="/employee/messages"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              isActive ? "text-sundown-gold" : "text-sundown-muted hover:text-sundown-text"
            )
          }
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wide">Chat</span>
        </NavLink>
      </nav>
    </div>
  );
}
