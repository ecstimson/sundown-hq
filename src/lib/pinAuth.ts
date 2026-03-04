export function pinToAuthPassword(pin: string): string {
  // Supabase Auth enforces a minimum password length (typically 6+ chars).
  // Keep employee/admin PIN UX short while deriving a longer auth password.
  return `sr-pin-${pin}`;
}

