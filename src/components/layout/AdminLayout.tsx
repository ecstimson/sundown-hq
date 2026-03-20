import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, List, Calendar, Book, Users, Plug, Settings,
  LogOut, MessageSquare, CalendarDays, Plus, Menu, X, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/ui/BrandLogo";

const navItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/quick-add", icon: Plus, label: "Quick Add" },
  { to: "/admin/animals", icon: List, label: "Animals" },
  { to: "/admin/schedule", icon: CalendarDays, label: "Schedule" },
  { to: "/admin/checklists", icon: ClipboardList, label: "Checklists" },
  { to: "/admin/drops", icon: Calendar, label: "Drop Planner" },
  { to: "/admin/sops", icon: Book, label: "SOPs" },
  { to: "/admin/staff", icon: Users, label: "Employees" },
  { to: "/admin/messages", icon: MessageSquare, label: "Messages" },
  { to: "/admin/integrations", icon: Plug, label: "Integrations" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

const quickNavItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/admin/animals", icon: List, label: "Animals" },
  { to: "/admin/quick-add", icon: Plus, label: "Add", raised: true as const },
  { to: "/admin/schedule", icon: CalendarDays, label: "Schedule" },
  { to: "/admin/messages", icon: MessageSquare, label: "Chat" },
];

function renderSidebarNav() {
  return navItems.map((item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-bold transition-all duration-200",
            isActive
              ? "bg-sundown-gold text-black shadow-md"
              : "text-sundown-muted hover:bg-sundown-bg hover:text-sundown-text border border-transparent"
          )
        }
      >
        <Icon className="w-4 h-4" />
        <span>{item.label}</span>
      </NavLink>
    );
  });
}

export default function AdminLayout() {
  const { employee, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
    navigate("/login");
  };

  const displayName = employee?.name || "Admin";

  const routeTitle = (() => {
    if (location.pathname.includes("/admin/quick-add")) return "Quick Add";
    if (location.pathname.match(/\/admin\/animals\/.+/)) return "Animal Detail";
    if (location.pathname.includes("/admin/animals")) return "Animals";
    if (location.pathname.includes("/admin/drops")) return "Drop Planner";
    if (location.pathname.includes("/admin/sops")) return "SOP Manager";
    if (location.pathname.includes("/admin/staff")) return "Staff Management";
    if (location.pathname.includes("/admin/schedule")) return "Operations Schedule";
    if (location.pathname.includes("/admin/messages")) return "Group Chat";
    if (location.pathname.includes("/admin/integrations")) return "Integrations";
    if (location.pathname.includes("/admin/settings")) return "Settings";
    return "Admin Dashboard";
  })();

  return (
    <div className="flex h-screen bg-sundown-bg text-sundown-text overflow-hidden">
      {/* Desktop sidebar — hidden below lg */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-sundown-border bg-sundown-card shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sundown-border bg-sundown-card">
          <BrandLogo variant="icon" className="h-8 w-8" />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {renderSidebarNav()}
        </nav>

        <div className="p-4 border-t border-sundown-border bg-sundown-card">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-sundown-muted hover:text-sundown-red transition-colors rounded-md hover:bg-sundown-bg"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile drawer backdrop + panel */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            ref={drawerRef}
            className="relative z-50 w-64 h-full flex flex-col bg-sundown-card border-r border-sundown-border shadow-xl animate-in slide-in-from-left duration-200"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-sundown-border">
              <BrandLogo variant="icon" className="h-8 w-8" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-sundown-muted hover:text-sundown-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {renderSidebarNav()}
            </nav>

            <div className="p-4 border-t border-sundown-border">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-sundown-muted hover:text-sundown-red transition-colors rounded-md hover:bg-sundown-bg"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-sundown-border flex items-center justify-between px-4 lg:px-8 bg-sundown-bg/95 backdrop-blur sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 -ml-2 text-sundown-muted hover:text-sundown-text transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg lg:text-xl font-bold tracking-tight text-sundown-text truncate">{routeTitle}</h2>
          </div>
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="text-sm font-bold text-sundown-text hidden sm:block">{displayName}</div>
            <div className="w-9 h-9 rounded-full bg-sundown-card border border-sundown-gold flex items-center justify-center shadow-sm p-1">
              <BrandLogo variant="icon" className="h-6 w-6" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom quick nav — hidden at lg+ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-sundown-card/95 backdrop-blur border-t border-sundown-border h-20 flex items-center justify-around z-30 pb-safe px-2 lg:hidden">
        {quickNavItems.map((item) => {
          const Icon = item.icon;
          if ("raised" in item && item.raised) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center justify-center w-full h-full -mt-10"
              >
                <div className="w-16 h-16 rounded-full bg-sundown-gold flex items-center justify-center text-black shadow-lg shadow-sundown-gold/30">
                  <Icon className="w-8 h-8" strokeWidth={2.6} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide mt-1 text-sundown-gold">{item.label}</span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                  isActive ? "text-sundown-gold" : "text-sundown-muted hover:text-sundown-text"
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium uppercase tracking-wide">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
