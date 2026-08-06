import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Mail, Key, ArrowRight, Check, X, Sparkles, Copy } from 'lucide-react';
import WandaLogo from './WandaLogo';

interface AdminLoginModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AdminLoginModal({ onSuccess, onClose }: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const defaultEmail = 'admin@wandataxi.com';
  const defaultPassword = 'admin123';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (email.trim().toLowerCase() === defaultEmail || email.trim().toLowerCase() === 'admin') &&
      password.trim() === defaultPassword
    ) {
      setError('');
      onSuccess();
    } else {
      setError('Identifiants incorrects. Utilisez admin@wandataxi.com / admin123');
    }
  };

  const handleQuickFill = () => {
    setEmail(defaultEmail);
    setPassword(defaultPassword);
    setError('');
    setTimeout(() => {
      onSuccess();
    }, 200);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText('wandataxi.com/admin');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-brand-midnight/90 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-brand-deep border border-brand-gold/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-white shadow-2xl relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <WandaLogo className="w-10 h-10 drop-shadow-[0_0_8px_rgba(226,193,141,0.3)]" />
            <div>
              <h2 className="text-lg font-black text-brand-gold tracking-wider flex items-center gap-1.5">
                WANDA ADMIN <ShieldCheck size={18} className="text-emerald-400" />
              </h2>
              <p className="text-xs text-brand-text-muted font-medium">Console de Gestion Officielle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-brand-card hover:bg-brand-input text-brand-text-muted hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Direct Link Banner */}
        <div className="bg-brand-card/70 border border-brand-gold/25 rounded-2xl p-3.5 mb-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-brand-gold tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" /> Lien Accès Direct Admin
            </span>
            <button
              onClick={copyUrl}
              type="button"
              className="text-[10px] bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold px-2 py-0.5 rounded-lg border border-brand-gold/30 flex items-center gap-1 cursor-pointer font-bold transition"
            >
              {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
              {copied ? "Copié !" : "Copier URL"}
            </button>
          </div>
          <div className="font-mono text-xs text-emerald-300 font-extrabold bg-brand-midnight/60 px-3 py-1.5 rounded-xl border border-brand-input/40 flex items-center justify-between">
            <span>wandataxi.com/admin</span>
            <span className="text-[9px] text-brand-text-muted font-normal">(ou URL /admin)</span>
          </div>
        </div>

        {/* Demo Credentials Hint Box */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 mb-5 space-y-1">
          <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
            <Key size={12} /> Identifiants Administrateur
          </div>
          <div className="text-[11px] text-emerald-100/90 font-mono space-y-0.5 pl-4">
            <div>Email : <strong className="text-white">{defaultEmail}</strong></div>
            <div>Mot de passe : <strong className="text-white">{defaultPassword}</strong></div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-text-muted mb-1 flex items-center gap-1.5">
              <Mail size={13} className="text-brand-gold" /> Nom d'utilisateur ou Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wandataxi.com"
              className="w-full bg-brand-input border border-brand-card focus:border-brand-gold rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-text-muted mb-1 flex items-center gap-1.5">
              <Lock size={13} className="text-brand-gold" /> Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-brand-input border border-brand-card focus:border-brand-gold rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none transition"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center">
              {error}
            </p>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight py-3 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-gold/20 transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Connexion Admin</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={handleQuickFill}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow hover:scale-[1.01] active:scale-[0.99]"
            >
              <Sparkles size={13} />
              <span>Auto-Remplissage & Connexion Rapide (1-Clic)</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
