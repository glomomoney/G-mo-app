import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Smartphone, Plus, CreditCard, ArrowUpRight, History, Shield, Info, Sparkles, Award } from 'lucide-react';
import { PaymentMethod } from '../types';

interface WalletCardProps {
  balance: number;
  onTopUpRequested: (amount: number, method: 'momo_mtn' | 'orange_money') => void;
  transactions: any[];
  topupPromoActive?: boolean;
  topupPromoRate?: number;
  slangMode?: boolean;
}

export default function WalletCard({ 
  balance, 
  onTopUpRequested, 
  transactions,
  topupPromoActive = false,
  topupPromoRate = 0,
  slangMode = false
}: WalletCardProps) {
  const [amount, setAmount] = useState<string>('5000');
  const [provider, setProvider] = useState<'momo_mtn' | 'orange_money'>('momo_mtn');

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseInt(amount);
    if (isNaN(numAmt) || numAmt <= 0) return;
    onTopUpRequested(numAmt, provider);
  };

  return (
    <div className="bg-brand-card/40 border border-brand-card rounded-2xl p-4 space-y-4 shadow-md text-white font-sans" id="passenger-wallet-component">
      
      {/* Mini Wallet Header Card */}
      <div className="bg-gradient-to-br from-brand-card to-brand-midnight border border-brand-input p-4.5 rounded-2xl relative overflow-hidden shadow-inner">
        {/* Glow ambient decoration */}
        <div className="absolute right-[-20px] top-[-20px] w-28 h-28 rounded-full bg-brand-gold/10 blur-xl pointer-events-none"></div>
        
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] text-brand-text-muted font-black tracking-wider uppercase block">Integrated Wallet</span>
            <h3 className="text-xl font-black text-brand-gold tracking-tight mt-1">{balance.toLocaleString('fr-FR')} FCFA</h3>
          </div>
          <span className="bg-brand-gold/10 text-brand-gold border border-brand-gold/25 text-[8px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
            Active
          </span>
        </div>

        <div className="flex gap-2.5 mt-5 text-[10px] text-brand-text-muted font-bold leading-normal">
          <div className="flex items-center gap-1">
            <Shield size={12} className="text-emerald-400" />
            <span>Encrypted Ledger</span>
          </div>
          <div className="flex items-center gap-1">
            <span>•</span>
            <span>Instant MoMo Handshake</span>
          </div>
        </div>
      </div>

      {/* Info Notice about Discount */}
      <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-xl p-2.5 flex gap-2 text-[11px] leading-relaxed text-brand-text-muted font-medium">
        <Info size={14} className="text-brand-gold shrink-0 mt-0.5" />
        <span>
          💡 **Alerte Promo !** Bénéficiez de tarifs réduits sur vos courses à Douala si vous payez par **Wallet** ! Choisissez simplement le prix "Wallet Pay".
        </span>
      </div>

      {/* Dynamic Wallet Top-up Promo Banner */}
      {topupPromoActive && topupPromoRate > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-brand-gold/10 border border-brand-gold/40 p-3 rounded-xl space-y-1 text-white relative overflow-hidden shadow">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none rotate-12">
            <Sparkles size={60} className="text-brand-gold" />
          </div>
          <div className="flex items-center gap-2">
            <span className="p-1 h-fit bg-brand-gold/10 text-brand-gold rounded-lg border border-brand-gold/20">
              <Sparkles size={12} className="text-brand-gold" />
            </span>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-brand-gold">
                {slangMode ? "PROMO BONUS DISPONIBLE !" : "TOP-UP BONUS ACTIVE !"}
              </h4>
              <p className="text-[10px] text-brand-text-muted leading-tight">
                {slangMode 
                  ? `Gagnez +${topupPromoRate}% de crédit bonus supplémentaire sur chaque recharge.`
                  : `Get an extra +${topupPromoRate}% bonus balance automatically on all deposits.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Up Form */}
      <form onSubmit={handleRecharge} className="space-y-3">
        <span className="text-[10px] text-brand-text-muted font-black tracking-wider uppercase block">Recharge My Wallet</span>

        {/* Carrier selection */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProvider('momo_mtn')}
            className={`p-2 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${provider === 'momo_mtn' ? 'bg-amber-400/10 border-brand-gold text-brand-gold font-bold shadow' : 'bg-brand-input/40 border-brand-card text-brand-text-muted'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span className="text-[10px] font-black uppercase tracking-wide">MTN MoMo</span>
          </button>
          <button
            type="button"
            onClick={() => setProvider('orange_money')}
            className={`p-2 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${provider === 'orange_money' ? 'bg-orange-500/10 border-orange-500 text-orange-500 font-bold shadow' : 'bg-brand-input/40 border-brand-card text-brand-text-muted'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            <span className="text-[10px] font-black uppercase tracking-wide">Orange Money</span>
          </button>
        </div>

        {/* Quick amounts */}
        <div className="flex justify-between gap-1.5">
          {[2000, 5000, 10000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleQuickAmount(amt)}
              className={`flex-1 py-1 rounded-lg text-[10px] border font-black transition cursor-pointer ${amount === amt.toString() ? 'bg-brand-gold text-brand-midnight border-brand-gold' : 'bg-brand-input/40 border-brand-card text-brand-text-muted hover:text-white hover:border-brand-input'}`}
            >
              +{amt.toLocaleString('fr-FR')}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter custom amount..."
            className="w-full bg-brand-input border border-brand-card/80 rounded-xl py-2.5 px-3 pr-14 text-xs font-semibold text-white focus:outline-none focus:border-brand-gold focus:bg-brand-input transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required
            id="topup-amount-input"
          />
          <span className="absolute right-3 top-2.5 text-[10px] font-black text-brand-text-muted">XAF</span>
        </div>

        {/* Live Promo Bonus Estimator */}
        {(() => {
          const numAmt = parseInt(amount) || 0;
          const bonusAmt = topupPromoActive ? Math.round(numAmt * topupPromoRate / 100) : 0;
          const totalAmt = numAmt + bonusAmt;
          if (topupPromoActive && topupPromoRate > 0 && numAmt > 0) {
            return (
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-[10px] font-bold text-emerald-400 flex justify-between items-center animate-pulse-subtle">
                <span className="flex items-center gap-1">
                  <Award size={11} />
                  <span>{slangMode ? "Bonus offert :" : "Free Bonus :"} <strong className="text-white">+{bonusAmt.toLocaleString('fr-FR')} FCFA</strong></span>
                </span>
                <span>
                  {slangMode ? "Tu reçois :" : "Credited :"} <strong className="text-brand-gold">={totalAmt.toLocaleString('fr-FR')} FCFA</strong>
                </span>
              </div>
            );
          }
          return null;
        })()}

        <button
          type="submit"
          className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition"
          id="topup-submit-btn"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Top Up Wallet</span>
        </button>
      </form>

      {/* Transaction History Subledger */}
      <div className="space-y-2 pt-2 border-t border-brand-input/40">
        <span className="text-[10px] text-brand-text-muted font-black tracking-wider uppercase flex items-center gap-1.5">
          <History size={11} />
          <span>Recent Top-ups</span>
        </span>

        {transactions.length === 0 ? (
          <p className="text-[10px] text-brand-text-muted/60 italic text-center py-2 font-medium">No recent deposits.</p>
        ) : (
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {transactions.map((tx) => {
              const hasBonus = tx.bonusAmount && tx.bonusAmount > 0;
              return (
                <div key={tx.id} className="flex justify-between items-center text-[10px] bg-brand-input/30 p-2 rounded-lg border border-brand-card/50">
                  <div>
                    <span className="font-bold text-white flex items-center gap-1">
                      <span>Wallet Top-up</span>
                      {hasBonus && <span className="bg-brand-gold/20 text-brand-gold text-[8px] font-black px-1 rounded scale-90">PROMO</span>}
                    </span>
                    <span className="text-brand-text-muted font-mono block text-[9px]">{tx.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-400">
                      +{(tx.amount + (tx.bonusAmount || 0)).toLocaleString('fr-FR')} XAF
                    </span>
                    {hasBonus && (
                      <span className="text-[9px] text-brand-gold block font-medium">
                        (Incl. +{tx.bonusAmount.toLocaleString('fr-FR')} bonus)
                      </span>
                    )}
                    <span className="text-[8px] text-brand-text-muted font-mono block uppercase">{tx.carrier.replace('_', ' ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
