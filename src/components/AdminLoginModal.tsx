import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Mail, ArrowRight, X, Loader2 } from 'lucide-react';
import WandaLogo from './WandaLogo';

interface AdminLoginModalProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  error: string;
  onClose: () => void;
}

export default function AdminLoginModal({ onLogin, error, onClose }: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await onLogin(email.trim(), password);
    setIsSubmitting(false);
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

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-text-muted mb-1 flex items-center gap-1.5">
              <Mail size={13} className="text-brand-gold" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@wanda.cm"
              autoComplete="username"
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
              autoComplete="current-password"
              className="w-full bg-brand-input border border-brand-card focus:border-brand-gold rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none transition"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center">
              {error}
            </p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-gold hover:bg-brand-gold/90 disabled:opacity-60 disabled:cursor-not-allowed text-brand-midnight py-3 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-gold/20 transition hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <span>Connexion Admin</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
