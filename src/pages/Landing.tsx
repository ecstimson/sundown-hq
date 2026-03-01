import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";
import { Smartphone, Monitor } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sundown-bg text-sundown-text p-6 space-y-12">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-sundown-gold rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sundown-gold/20">
          <span className="text-4xl font-bold text-black">S</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Sundown HQ</h1>
        <p className="text-sundown-muted max-w-md mx-auto">
          Premium reptile breeding management system. Select your interface to continue.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link to="/login" className="group">
          <div className="h-full p-8 rounded-2xl border border-sundown-border bg-sundown-card hover:border-sundown-gold transition-colors flex flex-col items-center text-center space-y-4 group-hover:bg-sundown-card/80">
            <div className="w-16 h-16 rounded-full bg-sundown-bg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone className="w-8 h-8 text-sundown-gold" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-sundown-text">Employee App</h3>
              <p className="text-sm text-sundown-muted mt-2">
                Mobile-optimized interface for warehouse tasks, scanning, and logs.
              </p>
            </div>
            <Button variant="outline" className="w-full mt-4 group-hover:bg-sundown-gold group-hover:text-black group-hover:border-sundown-gold">
              Login
            </Button>
          </div>
        </Link>

        <Link to="/login" className="group">
          <div className="h-full p-8 rounded-2xl border border-sundown-border bg-sundown-card hover:border-sundown-gold transition-colors flex flex-col items-center text-center space-y-4 group-hover:bg-sundown-card/80">
            <div className="w-16 h-16 rounded-full bg-sundown-bg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Monitor className="w-8 h-8 text-sundown-gold" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-sundown-text">Admin Dashboard</h3>
              <p className="text-sm text-sundown-muted mt-2">
                Desktop interface for analytics, inventory, staff, and system control.
              </p>
            </div>
            <Button variant="outline" className="w-full mt-4 group-hover:bg-sundown-gold group-hover:text-black group-hover:border-sundown-gold">
              Login
            </Button>
          </div>
        </Link>
      </div>
      
      <footer className="text-xs text-sundown-muted fixed bottom-6">
        © 2026 Sundown Reptiles. Authorized Personnel Only.
      </footer>
    </div>
  );
}
