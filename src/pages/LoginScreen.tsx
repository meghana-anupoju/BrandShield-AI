import { useState } from 'react';
import { Shield, Zap, ArrowRight } from 'lucide-react';
import { AuraLogo } from '@/components/shared/AuraLogo';
import { useApp } from '@/context/AppContext';

export function LoginScreen() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    login();
  }

  function handleDemoLogin() {
    login();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <AuraLogo size={80} className="drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">BrandShield AI</h1>
          <p className="text-cyan-400 text-sm mt-2 font-medium">Spot the Fake. Protect the Trust.</p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 tracking-wider">Powered by</span>
            <span className="text-xs font-bold text-cyan-400 tracking-wide">AURA_X</span>
          </div>
        </div>

        {/* Login card */}
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@brandshield.ai"
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            Sign In
            <ArrowRight size={16} />
          </button>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex-1 h-px bg-slate-800" />
            OR
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
          >
            <Zap size={16} className="text-cyan-400" />
            Enter Demo Mode
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          BrandShield AI · AURA_X · HacXLerate 2026
        </p>
      </div>
    </div>
  );
}
