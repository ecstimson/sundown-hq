import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ScanLine, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Scan() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);

  // Simulate scanning process
  useEffect(() => {
    const timer = setTimeout(() => {
      // In a real app, this would handle the scan result
      // For demo, we just keep scanning
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1 bg-gray-900 overflow-hidden">
        {/* Camera Mock */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-sundown-gold rounded-lg relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-sundown-gold -mt-1 -ml-1"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-sundown-gold -mt-1 -mr-1"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-sundown-gold -mb-1 -ml-1"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-sundown-gold -mb-1 -mr-1"></div>
            
            {/* Scanning Line Animation */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-sundown-gold shadow-[0_0_10px_rgba(212,168,83,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>
          <p className="absolute mt-80 text-white/80 text-sm font-medium animate-pulse">
            Align QR code within frame
          </p>
        </div>

        {/* Close Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full w-12 h-12"
          onClick={() => navigate(-1)}
        >
          <X className="w-8 h-8" />
        </Button>
      </div>

      <div className="bg-sundown-card p-6 pb-10 rounded-t-2xl -mt-6 relative z-10">
        <div className="w-12 h-1 bg-sundown-border rounded-full mx-auto mb-6"></div>
        <h3 className="text-lg font-semibold text-center mb-2">Scan Animal or Bin</h3>
        <p className="text-sundown-muted text-center text-sm mb-6">
          Point your camera at a QR code to view animal details, log feeding, or update status.
        </p>
        <Button className="w-full h-12" variant="secondary">
          Enter ID Manually
        </Button>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
