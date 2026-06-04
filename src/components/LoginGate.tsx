import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import { KeyRound, User as UserIcon, Building2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginGateProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  lapakName: string;
}

export default function LoginGate({ users, onLoginSuccess, lapakName }: LoginGateProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const account = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password_hash === password
    );

    if (!account) {
      setError('Username atau Password salah!');
      return;
    }

    if (account.status === 'Nonaktif') {
      setError('Akun Anda dinonaktifkan oleh Administrator!');
      return;
    }

    onLoginSuccess(account);
  };

  return (
    <div className="min-h-screen bg-emerald-50/30 flex flex-col items-center justify-center p-4 relative overflow-hidden" id="login-container">
      {/* Background Decorative Circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-25%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-600/5 blur-3xl pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden relative z-10"
        id="login-card"
      >
        {/* Palm Header Decorator */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-750 px-6 py-8 text-center relative text-white border-b border-emerald-700/10">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Building2 size={80} />
          </div>
          <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-3 backdrop-blur-xs">
            <Building2 size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black font-sans tracking-tight leading-snug">
            {lapakName || 'Lapak Sawit'}
          </h2>
          <p className="text-emerald-100 text-xs mt-1 font-semibold">Sistem Informasi Timbangan & Kasir Lapak Sawit</p>
        </div>

        <div className="p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse"></span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-205 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs font-semibold transition-all placeholder-gray-300"
                  id="input-username"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <KeyRound size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-55/40 border border-gray-205 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs font-semibold transition-all placeholder-gray-300"
                  id="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-emerald-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs tracking-wider uppercase transition-all hover:shadow-lg hover:shadow-emerald-600/10 cursor-pointer text-center"
              id="btn-login-submit"
            >
              Sign In ke Aplikasi
            </button>
          </form>

          {/* Clean Guidance Note */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
              Gunakan kredensial yang terdaftar di Sistem Manajemen Karyawan untuk masuk. Hubungi pemilik lapak jika Anda lupa password Anda.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="text-center mt-6 text-[10px] text-gray-400 relative z-10 font-semibold tracking-wider uppercase">
        © 2026 {lapakName || 'Lapak Sawit Riau Makmur'}. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
}
