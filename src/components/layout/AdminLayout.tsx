import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, List, Calendar, ClipboardList, Book, Users, Plug, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-sundown-bg text-sundown-text overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-sundown-border bg-sundown-card shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-sundown-border">
          <div className="w-8 h-8 rounded bg-sundown-gold flex items-center justify-center text-black font-bold">
            S
          </div>
          <span className="font-bold text-lg tracking-tight">Sundown HQ</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/admin/animals" icon={List} label="Animals" />
          <NavItem to="/admin/drops" icon={Calendar} label="Drop Planner" />
          <NavItem to="/admin/checklists" icon={ClipboardList} label="Checklists" />
          <NavItem to="/admin/sops" icon={Book} label="SOPs" />
          <NavItem to="/admin/staff" icon={Users} label="Employees" />
          <NavItem to="/admin/integrations" icon={Plug} label="Integrations" />
          <NavItem to="/admin/settings" icon={Settings} label="Settings" />
        </nav>

        <div className="p-4 border-t border-sundown-border">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-sundown-muted hover:text-sundown-red transition-colors rounded-md hover:bg-sundown-bg/50">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-sundown-bg">
        <header className="h-16 border-b border-sundown-border flex items-center justify-between px-8 bg-sundown-bg sticky top-0 z-10">
          <h2 className="text-xl font-semibold">Admin Dashboard</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-sundown-muted">Bryan</div>
            <div className="w-8 h-8 rounded-full bg-sundown-border flex items-center justify-center text-xs font-bold">B</div>
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
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive
            ? "bg-sundown-gold/10 text-sundown-gold"
            : "text-sundown-muted hover:bg-sundown-border/50 hover:text-sundown-text"
        )
      }
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </NavLink>
  );
}
