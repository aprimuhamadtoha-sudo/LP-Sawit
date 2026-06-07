import React, { useState } from 'react';
import { UserAccount } from '../types';
import { KeyRound, User as UserIcon, Eye, EyeOff, AlertTriangle, RefreshCw, ChevronRight, Sprout, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginGateProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  lapakName: string;
  syncError?: string | null;
}

export default function LoginGate({ users, onLoginSuccess, lapakName, syncError }: LoginGateProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isFirebaseRulesOpen, setIsFirebaseRulesOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Dynamic delay for realistic authorization experience
    setTimeout(() => {
      const account = users.find(
        u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password_hash === password
      );

      if (!account) {
        setError('Username atau Password yang Anda masukkan tidak terdaftar!');
        setIsSubmitting(false);
        return;
      }

      if (account.status === 'Nonaktif') {
        setError('Akses ditangguhkan! Akun ini telah dinonaktifkan oleh administrator.');
        setIsSubmitting(false);
        return;
      }

      onLoginSuccess(account);
      setIsSubmitting(false);
    }, 450);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none bg-gradient-to-br from-[#0c5c49] via-[#1c846b] to-[#c7b233]" id="login-container">
      
      {/* Immersive organic flow-shapes overlay in the background to match reference image structure */}
      <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-overlay">
        <svg viewBox="0 0 1000 1000" className="w-full h-full object-cover" preserveAspectRatio="none">
          <path d="M-100,500 C150,300 350,700 600,500 C850,300 950,600 1100,450 L1100,1100 L-100,1100 Z" fill="#064939" />
          <path d="M-100,650 C100,550 250,850 500,700 C750,550 850,900 1100,750 L1100,1100 L-100,1100 Z" fill="#dec446" opacity="0.3" />
        </svg>
      </div>

      {/* Floating subtle ambient light blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#1e8970]/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#dec84b]/15 blur-3xl pointer-events-none" />

      {/* Main Container matching the precise layout in user's image */}
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.3)] border border-white/10 relative z-10 flex flex-col">
        
        {/* UPPER PANEL: MAGICAL SCENIC GRADIENT LANDSCAPE */}
        <div className="h-64 relative overflow-hidden flex flex-col justify-between p-6 text-white text-center">
          
          {/* Custom Vector Scenic Backdrop */}
          <svg viewBox="0 0 400 260" className="w-full h-full absolute inset-0" preserveAspectRatio="none">
            <defs>
              {/* Main Vivid Background Gradient */}
              <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0d866a" />
                <stop offset="45%" stopColor="#2a9c7d" />
                <stop offset="85%" stopColor="#dec84b" />
                <stop offset="100%" stopColor="#ecd556" />
              </linearGradient>
              
              {/* Mountain Grad - Left Back */}
              <linearGradient id="mountGradLeft" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0a6b54" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#1e8970" stopOpacity="0.95" />
              </linearGradient>

              {/* Mountain Grad - Center Front */}
              <linearGradient id="mountGradRight" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#045642" />
                <stop offset="100%" stopColor="#126a54" />
              </linearGradient>
            </defs>

            {/* Sky Background */}
            <rect width="400" height="260" fill="url(#bgGrad)" />

            {/* Glowing Sun/Moon shape in top left corner */}
            <circle cx="80" cy="75" r="30" fill="#ffffff" opacity="0.15" />
            <circle cx="80" cy="75" r="22" fill="#ffffff" opacity="0.08" />

            {/* Dynamic clouds lines / organic curves */}
            <path d="M -10,140 C 30,130 65,135 90,145 C 110,130 140,135 160,150" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.12" />
            <path d="M 270,70 C 300,58 320,63 340,73 C 360,63 380,66 400,78" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.12" />

            {/* Stylized birds chevrons gliding overhead */}
            <path d="M 184,95 Q 189,90 194,93 Q 199,90 204,95" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
            <path d="M 324,120 Q 332,112 340,118 Q 348,112 356,120" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />

            {/* Mountains/peaks matching the illustration shape */}
            {/* Left Peak */}
            <path d="M 110,260 L 175,195 L 240,260 Z" fill="url(#mountGradLeft)" />
            {/* Center Main Peak */}
            <path d="M 170,260 L 268,162 L 366,260 Z" fill="url(#mountGradRight)" />
            {/* Low Ambient Left Peak */}
            <path d="M -20,260 L 45,225 L 110,260 Z" fill="#065d48" opacity="0.3" />
          </svg>

          {/* Title Header text layer */}
          <div className="relative z-10 pt-2 flex flex-col items-center">
            <h1 className="text-xl sm:text-2xl font-black font-sans tracking-wide text-white drop-shadow-sm">
              Welcome to SINTAD
            </h1>
            <p className="text-[10px] text-white/90 font-medium px-4 mt-2 max-w-xs leading-relaxed drop-shadow-xs">
              Sistem Informasi Timbangan Digital, Pencatatan Harga Harian, dan Jurnal Kas Hasil Bumi Terintegrasi.
            </p>
          </div>

          {/* Create Account/Help link centered directly below */}
          <div className="relative z-10 pb-1">
            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(!isForgotPasswordOpen)}
              className="text-xs font-bold text-white/90 hover:text-white hover:underline transition-all bg-transparent border-none cursor-pointer"
            >
              Hubungi Admin Lapak
            </button>
          </div>
        </div>

        {/* LOWER PANEL: USER LOGIN INTERFACE (Pill shape inputs matching design mockup) */}
        <div className="bg-white p-6 sm:p-8 flex flex-col justify-between rounded-t-[2.5rem] -mt-10 relative z-20 shadow-[0_-12px_32px_rgba(0,0,0,0.06)]">
          <div>
            <h2 className="text-center text-sm font-black text-[#007064] tracking-widest uppercase mb-6 flex items-center justify-center gap-1.5">
              <span>USER LOGIN</span>
            </h2>

            {/* ERROR HANDLING PANEL */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-xs text-rose-700 flex items-start gap-2.5 mb-5 font-bold"
                >
                  <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* COLLAPSIBLE SPECIAL INFO / HELP DETAILS */}
            <AnimatePresence>
              {isForgotPasswordOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl text-[11px] text-emerald-800 space-y-1.5 mb-4 leading-relaxed font-bold"
                >
                  <p className="font-extrabold text-[#007064]">Akses Kredensial Lapak</p>
                  <p className="text-emerald-700/90 font-medium">
                    Untuk menjamin keamanan timbangan & kas hasil bumi, pembuatan akun dan perubahan kata sandi hanya bisa dilakukan secara internal oleh Owner.
                  </p>
                  <p className="text-[#007064] underline">
                    Hubungi Pemilik Lapak Sawit di Kantor Pusat.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* DYNAMIC FIREBASE RULES AMENDMENT CONTAINER */}
            {syncError && (
              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-3.5 text-[11.5px] text-amber-900 space-y-2 mb-5">
                <div 
                  onClick={() => setIsFirebaseRulesOpen(!isFirebaseRulesOpen)} 
                  className="flex items-center justify-between cursor-pointer font-bold group"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping"></span>
                    <span>Firebase Rules Memerlukan Setup</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100 group-hover:bg-amber-200/80 px-2 py-0.5 rounded-md transition-all">
                    {isFirebaseRulesOpen ? 'Tutup' : 'Setup Rules'}
                  </span>
                </div>
                
                {isFirebaseRulesOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2 pt-2 border-t border-amber-200/50 text-[10.5px] font-medium"
                  >
                    <p className="text-amber-800 leading-relaxed">
                      Koneksi Cloud Firestore ditolak sistem. Silakan login ke <a href="https://console.firebase.google.com/project/lapaksawit-arafat/firestore/rules" target="_blank" rel="noopener noreferrer" className="font-bold underline text-emerald-700">Firebase Console Rules</a> lalu publikasikan kode rule ini agar sinkronisasi kembali bekerja:
                    </p>
                    <pre className="bg-neutral-800 p-2.5 rounded-xl font-mono text-[9px] text-amber-100 border border-neutral-900 overflow-x-auto max-h-24 block shadow-inner">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                    </pre>
                  </motion.div>
                )}
              </div>
            )}

            {/* FORM FORM */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* USERNAME PILL shape as mockup */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/90">
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full pl-11 pr-5 py-3 bg-[#007064] border-0 rounded-full focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-[#005e54] text-xs font-bold text-white placeholder-emerald-100/60 transition-all shadow-md shadow-[#007064]/5"
                  id="input-username"
                />
              </div>

              {/* PASSWORD PILL shape as mockup */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/90">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-11 pr-11 py-3 bg-[#007064] border-0 rounded-full focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-[#005e54] text-xs font-bold text-white placeholder-emerald-100/60 transition-all shadow-md shadow-[#007064]/5"
                  id="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-200/80 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* SUBMIT BUTTON AS PILL AS WELL */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-[#007064] to-[#018879] hover:brightness-110 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-extrabold rounded-full text-xs tracking-wider uppercase transition-all shadow-md shadow-[#007064]/20 cursor-pointer flex items-center justify-center gap-2 mt-6"
                id="btn-login-submit"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-white" />
                    <span>Mengautentikasi...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          </div>

          {/* TROUBLESHOOT FLUSH LOCAL CACHE LINK */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm('Apakah Anda ingin mengosongkan cache login browser lokal untuk memulihkan akun default Lapak Sawit? Semua konfigurasi lokal akan di-reset.');
                if (confirmed) {
                  localStorage.removeItem('LAPAK_SAWIT_APP_STATE');
                  window.location.reload();
                }
              }}
              className="group text-[9px] text-slate-400 hover:text-slate-600 font-bold transition-all cursor-pointer bg-transparent border-none py-1 flex items-center justify-center gap-1.5 mx-auto"
            >
              <RefreshCw size={10} className="group-hover:rotate-180 transition-transform duration-500 text-slate-400" />
              <span>Reset Cache Browser & Akun Default</span>
            </button>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center mt-6 text-[10px] text-emerald-100/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] relative z-10 font-black tracking-widest uppercase">
        © 2026 {lapakName || 'LAPAK SAWIT RIAU'}. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
}
