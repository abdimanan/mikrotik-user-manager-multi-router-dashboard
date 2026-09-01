import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6faff] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-[#c2c6d3] rounded-xl shadow-xs p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="material-symbols-outlined text-[#003d7c] text-[28px]">router</span>
          <span className="text-xl font-bold text-[#003d7c] tracking-tight">MT Manager</span>
        </div>

        <h1 className="text-lg font-bold text-[#141d23] text-center mb-1">Sign in</h1>
        <p className="text-xs text-[#727783] text-center mb-6">
          MikroTik Multi-Router Dashboard
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              className="w-full px-3 py-2 text-sm border border-[#c2c6d3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054a6]"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#727783] uppercase tracking-wider block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-[#c2c6d3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054a6]"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-[#ba1a1a] bg-[#fdecea] border border-[#f3c2bd] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#003d7c] hover:bg-[#0054a6] disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};
