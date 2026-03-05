import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, List, Calendar, Book, Users, Plug, Settings, LogOut, MessageSquare, CalendarDays, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function AdminLayout() {
  const { employee, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
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
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-sundown-border bg-sundown-card shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sundown-border bg-sundown-card">
          <BrandLogo variant="icon" className="h-8 w-8" />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/admin/quick-add" icon={Plus} label="Quick Add" />
          <NavItem to="/admin/animals" icon={List} label="Animals" />
          <NavItem to="/admin/schedule" icon={CalendarDays} label="Schedule" />
          <NavItem to="/admin/drops" icon={Calendar} label="Drop Planner" />
          <NavItem to="/admin/sops" icon={Book} label="SOPs" />
          <NavItem to="/admin/staff" icon={Users} label="Employees" />
          <NavItem to="/admin/messages" icon={MessageSquare} label="Messages" />
          <NavItem to="/admin/integrations" icon={Plug} label="Integrations" />
          <NavItem to="/admin/settings" icon={Settings} label="Settings" />
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-sundown-bg">
        <header className="h-16 border-b border-sundown-border flex items-center justify-between px-8 bg-sundown-bg sticky top-0 z-10">
          <h2 className="text-xl font-bold tracking-tight text-sundown-text">{routeTitle}</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-sundown-text">{displayName}</div>
            <div className="w-9 h-9 rounded-full bg-sundown-card border border-sundown-gold flex items-center justify-center shadow-sm p-1">
              <BrandLogo variant="icon" className="h-6 w-6" />
            </div>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink
      to={to}
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
      <span>{label}</span>
    </NavLink>
  );
}
