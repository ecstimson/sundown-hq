import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ChevronDown, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPLOYEES = [
  { id: 1, name: "John Doe" },
  { id: 2, name: "Jane Smith" },
  { id: 3, name: "Mike Johnson" },
  { id: 99, name: "Admin User" }, // For demo purposes
];

export default function Login() {
  const navigate = useNavigate();
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleLogin = () => {
    if (selectedEmployee && pin.length === 4) {
      // Simple mock authentication
      if (selectedEmployee === 99) {
        navigate("/admin/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sundown-bg p-6 max-w-md mx-auto w-full">
      {/* Logo Area */}
      <div className="flex flex-col items-center space-y-4 mb-12">
        <div className="w-24 h-24 bg-sundown-gold rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(212,168,83,0.2)]">
          <span className="text-5xl font-bold text-black">S</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-sundown-text">Sundown HQ</h1>
      </div>

      {/* Employee Selector */}
      <div className="w-full mb-8 relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full h-14 bg-sundown-card border border-sundown-border rounded-xl px-4 flex items-center justify-between text-lg text-sundown-text focus:outline-none focus:border-sundown-gold transition-colors"
        >
          <span className={!selectedEmployee ? "text-sundown-muted" : ""}>
            {selectedEmployee
              ? EMPLOYEES.find((e) => e.id === selectedEmployee)?.name
              : "Select Employee"}
          </span>
          <ChevronDown className={cn("w-5 h-5 text-sundown-muted transition-transform", isDropdownOpen && "rotate-180")} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-sundown-card border border-sundown-border rounded-xl shadow-xl z-50 overflow-hidden">
            {EMPLOYEES.map((employee) => (
              <button
                key={employee.id}
                onClick={() => {
                  setSelectedEmployee(employee.id);
                  setIsDropdownOpen(false);
                  setPin("");
                }}
                className="w-full text-left px-4 py-3 hover:bg-sundown-border text-sundown-text transition-colors border-b border-sundown-border last:border-0"
              >
                {employee.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PIN Display */}
      <div className="flex gap-4 mb-8 justify-center h-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "w-4 h-4 rounded-full border border-sundown-muted transition-all duration-200",
              pin.length > i ? "bg-sundown-gold border-sundown-gold scale-110" : "bg-transparent"
            )}
          />
        ))}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-4 w-full mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="h-16 rounded-full bg-sundown-card/50 text-2xl font-medium text-sundown-text hover:bg-sundown-card active:bg-sundown-gold active:text-black transition-all touch-manipulation"
          >
            {num}
          </button>
        ))}
        <div /> {/* Empty slot */}
        <button
          onClick={() => handleNumberClick(0)}
          className="h-16 rounded-full bg-sundown-card/50 text-2xl font-medium text-sundown-text hover:bg-sundown-card active:bg-sundown-gold active:text-black transition-all touch-manipulation"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-16 rounded-full bg-transparent flex items-center justify-center text-sundown-muted hover:text-sundown-text active:text-sundown-red transition-colors"
        >
          <Delete className="w-8 h-8" />
        </button>
      </div>

      {/* Clock In Button */}
      <Button
        onClick={handleLogin}
        disabled={!selectedEmployee || pin.length !== 4}
        className="w-full h-14 text-lg font-bold rounded-xl shadow-[0_4px_14px_rgba(212,168,83,0.2)]"
      >
        Clock In
      </Button>
    </div>
  );
}
