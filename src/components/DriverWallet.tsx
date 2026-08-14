import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Landmark, ArrowDownLeft, Smartphone, History, CheckCircle, Clock, AlertTriangle, Heart, Sparkles, TrendingUp, MessageSquare, Gift, Eye, EyeOff, WifiOff } from 'lucide-react';
import { PaymentMethod, HistoryItem } from '../types';

interface DriverWalletProps {
  balance: number;
  onWithdrawRequested: (amount: number, method: 'momo_mtn' | 'orange_money', phoneNumber: string) => void;
  transactions: any[];
  minimumWithdrawal: number;
  driverPhone: string;
  rideHistory?: HistoryItem[];
  slangMode?: boolean;
  isOffline?: boolean;
}

export default function DriverWallet({
  balance,
  onWithdrawRequested,
  transactions,
  minimumWithdrawal,
  driverPhone,
  rideHistory = [],
  slangMode = true,
  isOffline = false
}: DriverWalletProps) {
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('5000');
  const [provider, setProvider] = useState<'momo_mtn' | 'orange_money'>('momo_mtn');
  const [phone, setPhone] = useState(driverPhone || '');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tipSort, setTipSort] = useState<'date' | 'amount'>('date');

  // Extract completed rides with tips from actual rideHistory
  const actualTips = rideHistory
    .filter(item => item.status === 'completed' && item.tipAmount && item.tipAmount > 0)
    .map(item => ({
      id: item.id,
      date: item.date,
      pickupName: item.pickupName,
      destName: item.destName,
      passengerName: item.driverName === 'Passenger Client' || !item.driverName ? (slangMode ? 'Passager Client' : 'Passenger Client') : item.driverName,
      tipAmount: item.tipAmount || 0,
      feedback: (item.tipAmount || 0) >= 2000 
        ? (slangMode ? 'Client très généreux ! Service VIP d\'exception.' : 'Extremely generous passenger! Outstanding VIP ride.')
        : (slangMode ? 'Super cool, merci beaucoup pour le geste !' : 'Very friendly passenger, highly appreciated!')
    }));

  // Vrais pourboires uniquement (issus de l'historique backend).
  const allTips = actualTips;

  // Calculate tip statistics
  const totalTipsAmount = allTips.reduce((sum, item) => sum + item.tipAmount, 0);

  // Sort tips based on selection
  const sortedTips = [...allTips].sort((a, b) => {
    if (tipSort === 'amount') {
      return b.tipAmount - a.tipAmount;
    }
    return 0; // maintain default (newest first)
  });

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const numAmt = parseInt(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Please enter a valid numeric amount.');
      return;
    }

    if (numAmt < minimumWithdrawal) {
      setError(`Minimum withdrawal amount is ${minimumWithdrawal.toLocaleString('fr-FR')} FCFA.`);
      return;
    }

    if (numAmt > balance) {
      setError('Insufficient wallet balance. Earn more rides to top up!');
      return;
    }

    // Cameroon phone check
    const normalizedPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^(?:\+?237|6)[256789]\d{7}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      setError('Please enter a valid Cameroon mobile money number (e.g., 677 12 34 56).');
      return;
    }

    onWithdrawRequested(numAmt, provider, normalizedPhone);
    setSuccessMsg(`Withdrawal request of ${numAmt.toLocaleString('fr-FR')} FCFA sent! Standing by for admin settlement.`);
    setAmount('');
  };

  return (
    <div className="bg-brand-card/40 border border-brand-card rounded-2xl p-4 space-y-4 shadow-md text-white font-sans" id="driver-wallet-component">
      
      {/* Offline Service Worker Cache Badge */}
      {isOffline && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 flex items-center gap-2 text-amber-200 text-[10px] font-bold shadow-sm animate-fade-in">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
            <WifiOff size={13} />
          </div>
          <div className="flex-1 leading-tight">
            <span className="block font-black uppercase text-[9px] text-amber-400 tracking-wider">
              {slangMode ? "Mode Hors Ligne (Service Worker)" : "Offline Mode (Service Worker)"}
            </span>
            <span className="text-[9.5px] font-semibold opacity-90">
              {slangMode
                ? "Solde chauffeur accessible via le cache hors ligne local."
                : "Driver wallet balance served from local Service Worker offline cache."}
            </span>
          </div>
          <span className="bg-amber-500/20 text-amber-300 text-[8px] font-mono font-black px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
            CACHED
          </span>
        </div>
      )}

      {/* Driver Cash Only Settlement Banner */}
      <div className="bg-emerald-950/60 border-2 border-emerald-500/50 rounded-2xl p-3.5 space-y-1 text-emerald-200 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-sm">💵</span>
          <h4 className="font-black text-emerald-300 uppercase text-[11px] tracking-wider">
            {slangMode ? "MODE CHAUFFEUR : RÈGLEMENT CASH UNIQUEMENT" : "DRIVER PAYMENT MODE: CASH ONLY"}
          </h4>
        </div>
        <p className="text-[10.5px] leading-relaxed text-emerald-100/90 font-medium">
          {slangMode
            ? "Pour le moment, tous les chauffeurs sont payés exclusivement en Cash par les passagers lors des déposes. Les encaissements et retraits de solde se font directement au guichet Wanda Cash."
            : "Currently, all drivers are paid directly in Cash by passengers upon trip completion. Wallet settlements and cashouts are collected directly at Wanda Cash desks."}
        </p>
      </div>

      {/* Earnings Summary Card */}
      <div 
        onClick={() => setShowBalance(!showBalance)}
        className="bg-gradient-to-br from-brand-card to-brand-midnight border border-brand-input p-4.5 rounded-2xl relative overflow-hidden shadow-inner cursor-pointer select-none hover:border-brand-gold/40 transition-colors group"
        title={slangMode ? "Tapez pour afficher/masquer le solde" : "Tap to show/hide balance"}
      >
        {/* Glow ambient decoration */}
        <div className="absolute right-[-20px] bottom-[-20px] w-28 h-28 rounded-full bg-brand-gold/5 blur-xl pointer-events-none"></div>

        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] text-brand-text-muted font-black tracking-wider uppercase block">
              {slangMode ? "Mon Solde Chauffeur" : "Driver Net Balance"}
            </span>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white tracking-tight mt-1 min-h-[1.75rem] flex items-center">
                {showBalance ? (
                  `${balance.toLocaleString('fr-FR')} FCFA`
                ) : (
                  <span className="text-brand-text-muted/60 tracking-widest">•••••• FCFA</span>
                )}
              </h3>
              <div className="text-brand-text-muted group-hover:text-brand-gold transition-colors mt-1 shrink-0 p-1 rounded-md bg-brand-input/30">
                {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
              </div>
            </div>
            {!showBalance && (
              <span className="text-[8px] text-brand-gold font-bold block mt-0.5 animate-pulse">
                {slangMode ? "👉 Tapez pour voir votre argent" : "👉 Tap to view your money"}
              </span>
            )}
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[8px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
            Settled Net
          </span>
        </div>

        <p className="text-[10px] text-brand-text-muted mt-4 font-semibold leading-normal">
          *Earnings are automatically credited to your balance (minus the 15% platform commission) after you complete passenger dropoffs.
        </p>
      </div>

      {/* Passenger Appreciation & Tips Breakdown */}
      <div className="bg-brand-card/40 border border-brand-card rounded-2xl p-4.5 space-y-3.5 shadow-md" id="driver-tips-breakdown-card">
        <div className="flex justify-between items-center border-b border-brand-input pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-gold/15 text-brand-gold">
              <Sparkles size={14} className="animate-pulse" />
            </span>
            <div>
              <span className="text-[10px] text-brand-text-muted font-black tracking-wider uppercase block">
                {slangMode ? "APPRÉCIATION & POURBOIRES" : "PASSENGER APPRECIATION"}
              </span>
              <h4 className="text-xs font-black text-white">
                {slangMode ? "Cagnotte des Pourboires (Tips)" : "Earned Tips Breakdown"}
              </h4>
            </div>
          </div>
          <div className="flex bg-brand-input/40 p-1 rounded-lg border border-brand-card/50">
            <button
              type="button"
              onClick={() => setTipSort('date')}
              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition cursor-pointer ${tipSort === 'date' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:text-white'}`}
            >
              {slangMode ? "Récent" : "Recent"}
            </button>
            <button
              type="button"
              onClick={() => setTipSort('amount')}
              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition cursor-pointer ${tipSort === 'amount' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:text-white'}`}
            >
              {slangMode ? "Montant" : "Amount"}
            </button>
          </div>
        </div>

        {/* Tip Stat Summary Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-brand-input/30 border border-brand-card/60 p-2 rounded-xl">
            <span className="text-[8px] text-brand-text-muted block uppercase font-bold">{slangMode ? "Cumul Tips" : "Total Tips"}</span>
            <span className="text-xs font-black text-brand-gold">
              {totalTipsAmount.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="bg-brand-input/30 border border-brand-card/60 p-2 rounded-xl">
            <span className="text-[8px] text-brand-text-muted block uppercase font-bold">{slangMode ? "Courses Tip" : "Tipped Trips"}</span>
            <span className="text-xs font-black text-white">{sortedTips.length}</span>
          </div>
          <div className="bg-brand-input/30 border border-brand-card/60 p-2 rounded-xl">
            <span className="text-[8px] text-brand-text-muted block uppercase font-bold">{slangMode ? "Moyenne" : "Average Tip"}</span>
            <span className="text-xs font-black text-emerald-400">
              {Math.round(totalTipsAmount / (sortedTips.length || 1)).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Tips List */}
        {sortedTips.length === 0 ? (
          <p className="text-[10px] text-brand-text-muted/60 italic text-center py-4 font-medium">
            {slangMode ? "Aucun pourboire encaissé pour le moment." : "No tips earned yet."}
          </p>
        ) : (
          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin" id="driver-tips-list">
            {sortedTips.map((tipItem, idx) => (
              <div key={tipItem.id + '-' + idx} className="bg-brand-input/40 border border-brand-card/60 p-2.5 rounded-xl space-y-1.5 transition-all hover:border-brand-input/60 relative overflow-hidden">
                <div className="absolute right-0 top-0 bg-brand-gold/15 px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                  <Gift size={9} className="text-brand-gold" />
                  <span className="text-[9px] font-black text-brand-gold">+{tipItem.tipAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center pr-16">
                    <span className="text-[9.5px] font-black text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0"></span>
                      {tipItem.passengerName}
                    </span>
                    <span className="text-[8px] text-brand-text-muted font-mono">{tipItem.date}</span>
                  </div>
                  <p className="text-[8.5px] text-brand-text-muted font-semibold truncate">
                    {tipItem.pickupName} ➔ {tipItem.destName}
                  </p>
                </div>

                {tipItem.feedback && (
                  <div className="bg-brand-midnight/40 p-1.5 rounded-lg border border-brand-input/20 flex items-start gap-1.5">
                    <MessageSquare size={10} className="text-brand-gold shrink-0 mt-0.5" />
                    <p className="text-[8.5px] text-brand-text-muted italic leading-normal font-medium">
                      "{tipItem.feedback}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal Form */}
      <form onSubmit={handleWithdrawSubmit} className="space-y-3">
        <span className="text-[10px] text-brand-text-muted font-black tracking-wider uppercase block">Cash Out Earnings</span>

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

        {/* Withdrawal destination number */}
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-wider text-brand-text-muted block">Carrier Phone Number</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-text-muted text-[11px] font-semibold border-r border-brand-input pr-2 my-2.5">
              🇨🇲 +237
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="677 12 34 56"
              className="w-full bg-brand-input border border-brand-card/80 rounded-xl py-2 pl-20 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-brand-gold focus:bg-brand-input transition"
              required
            />
          </div>
        </div>

        {/* Withdrawal Amount */}
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-wider text-brand-text-muted block">Cashout Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${minimumWithdrawal} FCFA`}
              className="w-full bg-brand-input border border-brand-card/80 rounded-xl py-2 px-3 pr-14 text-xs font-semibold text-white focus:outline-none focus:border-brand-gold focus:bg-brand-input transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
            <span className="absolute right-3 top-2.5 text-[10px] font-black text-brand-text-muted">XAF</span>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/25 border border-rose-900/50 text-rose-400 p-2.5 rounded-xl text-[10px] font-semibold flex items-start gap-1.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/25 border border-emerald-900/50 text-emerald-400 p-2.5 rounded-xl text-[10px] font-semibold">
            ✓ {successMsg}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition"
          id="withdraw-submit-btn"
        >
          <Landmark size={14} />
          <span>Request MoMo Cash Out</span>
        </button>
      </form>

      {/* Cashout History Subledger */}
      <div className="space-y-2 pt-2 border-t border-brand-input/40">
        <span className="text-[10px] text-brand-text-muted font-black tracking-wider uppercase flex items-center gap-1.5">
          <History size={11} />
          <span>Cashout Ledger</span>
        </span>

        {transactions.length === 0 ? (
          <p className="text-[10px] text-brand-text-muted/60 italic text-center py-2 font-medium">No previous cashouts.</p>
        ) : (
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {transactions.map((tx, idx) => {
              const isPending = tx.status === 'pending';
              return (
                <div key={`${tx.id}-${idx}`} className="flex justify-between items-center text-[10px] bg-brand-input/30 p-2 rounded-lg border border-brand-card/50">
                  <div>
                    <span className="font-bold text-white block">Carrier Withdrawal</span>
                    <span className="text-brand-text-muted font-mono">{tx.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-amber-500">-{tx.amount.toLocaleString('fr-FR')} XAF</span>
                    <span className="text-[9px] flex items-center gap-1 justify-end font-semibold mt-0.5">
                      {isPending ? (
                        <span className="text-amber-500 flex items-center gap-0.5"><Clock size={10} /> Pending</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle size={10} /> Cleared</span>
                      )}
                    </span>
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
