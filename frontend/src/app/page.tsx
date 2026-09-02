'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginSample() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('secret');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        
        try {
          const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/me`, {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            setMessage(`✓ Login Successful! Redirecting...`);
            setTimeout(() => {
              if (meData.role === 'Super Admin') {
                router.push('/superadmin');
              } else if (meData.role === 'Admin') {
                router.push('/admin');
              } else if (meData.role === 'Reception') {
                router.push('/reception');
              } else {
                router.push('/dashboard');
              }
            }, 700);
            return;
          }
        } catch {
          // Fallback
        }

        setMessage(`✓ Login Successful! Redirecting...`);
        setTimeout(() => {
          router.push('/dashboard');
        }, 900);
      } else {
        setMessage('✗ Login failed. Invalid credentials.');
      }
    } catch (error) {
      setMessage('✗ Error connecting to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 font-sans text-slate-800 antialiased">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-md shadow-blue-500/20">
            <Building2 size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Smart Front Desk
          </h2>
          <p className="text-xs text-slate-500">
            Enterprise Visitor Management & Operations Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 text-sm text-slate-900 pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 text-sm text-slate-900 pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Sign In to Portal'}
              {!isLoading && <ArrowRight size={14} />}
            </button>
          </form>

          {message && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              message.includes('✓') 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {message.includes('✓') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{message}</span>
            </div>
          )}
        </div>

        {/* Helper Footer */}
        <div className="text-center text-[11px] text-slate-400">
          Smart Front Desk System • Role Based Access Control
        </div>
      </div>
    </div>
  );
}