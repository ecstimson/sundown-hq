import { Outlet, NavLink } from "react-router-dom";
import { Home, ClipboardList, Book, ScanLine, List } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmployeeLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-sundown-bg text-sundown-text">
      {/* Header removed as per design prompt (handled in individual pages or simplified) */}
      
      <main className="flex-1 overflow-y-auto pb-20 p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-sundown-card border-t border-sundown-border h-20 flex items-center justify-around z-20 pb-safe px-2">
        <NavLink
          to="/employee/dashboard"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full gap-1.5 transition-colors",
              isActive ? "text-sundown-gold" : "text-sundown-muted hover:text-sundown-text"
            )
          }
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium uppercase tracking-wide">Home</span>
        </NavLink>
        
        <NavLink
          to="/employee/animals"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full gap-1.5 transition-colors",
              isActive ? "text-sundown-gold" : "text-sundown-muted hover:text-sundown-text"
            )
          }
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-medium uppercase tracking-wide">Animals</span>
        </NavLink>

        <NavLink
          to="/employee/scan"
          className="flex flex-col items-center justify-center w-full h-full -mt-8"
        >
          <div className="w-14 h-14 rounded-full bg-sundown-gold flex items-center justify-center text-black shadow-lg shadow-sundown-gold/20 border-4 border-sundown-bg">
            <ScanLine className="w-7 h-7" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wide mt-1 text-sundown-gold">Scan</span>
        </NavLink>

        <NavLink
          to="/employee/checklists"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full gap-1.5 transition-colors",
              isActive ? "text-sundown-gold" : "text-sundown-muted hover:text-sundown-text"
            )
          }
        >
          <ClipboardList className="w-6 h-6" />
          <span className="text-[10px] font-medium uppercase tracking-wide">Checklists</span>
        </NavLink>

        <NavLink
          to="/employee/sops"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full gap-1.5 transition-colors",
              isActive ? "text-sundown-gold" : "text-sundown-muted hover:text-sundown-text"
            )
          }
        >
          <Book className="w-6 h-6" />
          <span className="text-[10px] font-medium uppercase tracking-wide">SOPs</span>
        </NavLink>
      </nav>
    </div>
  );
}
