import { createRoot } from 'react-dom/client';
import { supabaseConfigValid } from './lib/supabase';
import { AuthProvider } from './lib/auth';
import App from './App.tsx';
import './index.css';

function MissingConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] p-8">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">Configuration Required</h1>
        <p className="text-gray-400">
          Sundown HQ cannot start because required environment variables are missing.
        </p>
        <div className="bg-[#2a2a2a] rounded-lg p-4 text-left text-sm text-gray-300 font-mono space-y-1">
          <p>VITE_SUPABASE_URL=&quot;https://your-project.supabase.co&quot;</p>
          <p>VITE_SUPABASE_ANON_KEY=&quot;your-anon-key&quot;</p>
        </div>
        <p className="text-gray-500 text-sm">
          Copy <code className="text-gray-400">.env.example</code> to{' '}
          <code className="text-gray-400">.env.local</code> and fill in your Supabase credentials,
          then restart the dev server.
        </p>
      </div>
    </div>
  );
}

// StrictMode intentionally omitted — it double-mounts effects in dev,
// which deadlocks Supabase's auth state machine.
createRoot(document.getElementById('root')!).render(
  supabaseConfigValid ? (
    <AuthProvider>
      <App />
    </AuthProvider>
  ) : (
    <MissingConfig />
  ),
);
