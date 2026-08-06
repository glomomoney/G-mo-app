import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  ShieldAlert, 
  Settings, 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Clock, 
  Grid, 
  Smartphone, 
  Award,
  Sliders,
  RefreshCw,
  Search,
  Bell,
  Save,
  Database,
  Cloud,
  Check,
  AlertCircle,
  Percent
} from 'lucide-react';
import WandaLogo from './WandaLogo';
import { PaymentMethod } from '../types';
import { saveSettingsToFirestore, subscribeToSettings } from '../lib/firebaseService';

interface AdminDashboardProps {
  onClose: () => void;
  driversList: any[];
  onApproveDriver: (id: string) => void;
  onRejectDriver: (id: string) => void;
  systemSettings: {
    commissionRate: number;
    surgeMultiplier: number;
    minimumWithdrawal: number;
    topupPromoActive?: boolean;
    topupPromoRate?: number;
    classRates?: Record<string, { baseFare: number; perKm: number }>;
  };
  onUpdateSettings: (settings: { 
    commissionRate: number; 
    surgeMultiplier: number; 
    minimumWithdrawal: number;
    topupPromoActive?: boolean;
    topupPromoRate?: number;
    classRates?: Record<string, { baseFare: number; perKm: number }>;
  }) => void;
  transactions: any[];
  onApproveWithdrawal: (id: string) => void;
}

export default function AdminDashboard({
  onClose,
  driversList,
  onApproveDriver,
  onRejectDriver,
  systemSettings,
  onUpdateSettings,
  transactions,
  onApproveWithdrawal
}: AdminDashboardProps) {
  const [tab, setTab] = useState<'kpi' | 'drivers' | 'transactions' | 'settings'>('kpi');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWeatherAlert, setActiveWeatherAlert] = useState<string>('Normal Skies');

  // Firebase Firestore Settings Form & Sync State
  const [formData, setFormData] = useState(systemSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Sync formData with systemSettings when props change
  useEffect(() => {
    setFormData(systemSettings);
  }, [systemSettings]);

  // Subscribe directly to Firestore settings/pricing collection
  useEffect(() => {
    const unsubscribe = subscribeToSettings((firestoreData) => {
      if (firestoreData) {
        setFormData(prev => ({
          ...prev,
          ...firestoreData,
          classRates: {
            ...(prev.classRates || {}),
            ...(firestoreData.classRates || {})
          }
        }));
        setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSaveToFirestore = async () => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
    try {
      await saveSettingsToFirestore(formData);
      onUpdateSettings(formData);
      setSaveSuccessMessage(`Enregistré dans Firestore ('settings/pricing') avec succès ! (${new Date().toLocaleTimeString('fr-FR')})`);
      setLastSyncedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => setSaveSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('Error saving to Firestore:', err);
      setSaveErrorMessage(`Erreur lors de la sauvegarde Firestore : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Local helper for weather/surge presets
  const triggerSimulationSurge = (weather: string, surge: number) => {
    setActiveWeatherAlert(weather);
    onUpdateSettings({
      ...systemSettings,
      surgeMultiplier: surge
    });
  };

  // Compute stats
  const totalRevenue = transactions
    .filter(t => t.status === 'success' && t.type === 'topup')
    .reduce((acc, curr) => acc + curr.amount, 142000);

  const totalWithdrawals = transactions
    .filter(t => t.status === 'success' && t.type === 'withdrawal')
    .reduce((acc, curr) => acc + curr.amount, 35000);

  const pendingWithdrawalsCount = transactions.filter(t => t.status === 'pending' && t.type === 'withdrawal').length;

  return (
    <div className="fixed inset-0 bg-brand-midnight/90 backdrop-blur-md z-[1500] flex flex-col overflow-hidden text-white font-sans" id="admin-dashboard-modal">
      
      {/* Top Admin Navigation Header */}
      <header className="bg-brand-deep border-b border-brand-card px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <WandaLogo className="w-10 h-10 drop-shadow-[0_0_8px_rgba(226,193,141,0.25)]" />
          <div>
            <h1 className="text-base font-black tracking-widest text-brand-gold flex items-center gap-2">
              WANDA ADMIN <span className="bg-brand-gold/15 text-brand-gold border border-brand-gold/25 text-[9px] font-black tracking-normal px-2 py-0.5 rounded-full uppercase">Command Console</span>
            </h1>
            <p className="text-[10px] text-brand-text-muted italic font-bold">Manage drivers, approvals, cellular wallet networks & surge APIs</p>
          </div>
        </div>

        {/* Top bar controls */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-brand-card/60 rounded-xl px-3 py-1.5 border border-brand-input items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="font-bold text-brand-text">Local Dispatch Server: <strong className="text-emerald-400">ONLINE (Port 3000)</strong></span>
          </div>
          <button
            onClick={onClose}
            className="bg-brand-card hover:bg-brand-input border border-brand-input hover:text-brand-gold text-brand-text-muted px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer"
            id="close-admin-btn"
          >
            ← Exit Console
          </button>
        </div>
      </header>

      {/* Admin Panel Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side Tab Drawer */}
        <aside className="w-full md:w-64 bg-brand-deep/60 border-r border-brand-card/80 p-4 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0">
          <button
            onClick={() => setTab('kpi')}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'kpi' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'}`}
          >
            <Grid size={16} />
            <span>Overview & Analytics</span>
          </button>
          <button
            onClick={() => setTab('drivers')}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'drivers' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'}`}
          >
            <Users size={16} />
            <span>Driver Approvals & Fleet</span>
            {driversList.filter(d => d.approvalStatus === 'pending').length > 0 && (
              <span className="ml-auto bg-rose-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                {driversList.filter(d => d.approvalStatus === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('transactions')}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'transactions' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'}`}
          >
            <Smartphone size={16} />
            <span>Wallet Transactions</span>
            {pendingWithdrawalsCount > 0 && (
              <span className="ml-auto bg-amber-500 text-brand-midnight font-extrabold text-[9px] px-2 py-0.5 rounded-full animate-pulse">
                {pendingWithdrawalsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${tab === 'settings' ? 'bg-brand-gold text-brand-midnight' : 'text-brand-text-muted hover:bg-brand-card hover:text-white'}`}
          >
            <Sliders size={16} />
            <span>⚙️ Tarification & Prix / KM</span>
          </button>
        </aside>

        {/* Right Main Content Scrollport */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW / ANALYTICS TAB */}
            {tab === 'kpi' && (
              <motion.div
                key="kpi-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Weather / Jam Simulator dispatch banner */}
                <div className="bg-brand-card border border-brand-input rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
                  <div className="space-y-1">
                    <span className="text-[10px] text-brand-gold font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                      <Bell size={12} className="animate-bounce" />
                      Douala Simulation Dispatch Engine
                    </span>
                    <h3 className="text-sm font-black text-white">
                      Current Traffic Factor: <span className="text-brand-gold text-glow-gold font-mono">{systemSettings.surgeMultiplier.toFixed(1)}x Surge</span> • Alerts: <span className="text-emerald-400 font-semibold">{activeWeatherAlert}</span>
                    </h3>
                  </div>

                  {/* Dispatch triggers */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => triggerSimulationSurge('Normal Skies', 1.0)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${activeWeatherAlert === 'Normal Skies' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'}`}
                    >
                      ☀️ Normal (1.0x)
                    </button>
                    <button
                      onClick={() => triggerSimulationSurge('Rain in Bastos', 1.5)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${activeWeatherAlert === 'Rain in Bastos' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'}`}
                    >
                      🌧️ Heavy Rain (1.5x)
                    </button>
                    <button
                      onClick={() => triggerSimulationSurge('Ndokoti Junction Jam', 2.0)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${activeWeatherAlert === 'Ndokoti Junction Jam' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'}`}
                    >
                      🚦 Ndokoti Gridlock (2.0x)
                    </button>
                  </div>
                </div>

                {/* PROMINENT LIVE PRICING GRID OVERVIEW CARD */}
                <div className="bg-brand-deep/90 border border-brand-gold/30 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-brand-card">
                    <div>
                      <div className="text-[10px] font-black uppercase text-brand-gold tracking-widest flex items-center gap-1.5">
                        <DollarSign size={12} className="text-emerald-400" /> Grille Tarifaire Actuelle (Frais de Base & Prix au KM)
                      </div>
                      <p className="text-xs text-brand-text-muted font-medium">Tarifs en vigueur appliqués immédiatement lors du calcul des courses passagers.</p>
                    </div>
                    <button
                      onClick={() => setTab('settings')}
                      className="bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/30 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Sliders size={13} />
                      <span>Modifier les Tarifs →</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: 'okada', name: 'Moto-Taxi (Okada)', defaultBase: 250, defaultPerKm: 80, icon: '🏍️' },
                      { id: 'keke', name: 'Petit Taxi (Yellow Cab)', defaultBase: 300, defaultPerKm: 100, icon: '🛺' },
                      { id: 'ecoride', name: 'EcoRide (Private Sedan)', defaultBase: 1500, defaultPerKm: 250, icon: '🚗' },
                      { id: 'comfort', name: 'VIP Ride (SUV)', defaultBase: 3000, defaultPerKm: 400, icon: '🚘' },
                    ].map((cls) => {
                      const rates = systemSettings.classRates?.[cls.id] || { baseFare: cls.defaultBase, perKm: cls.defaultPerKm };
                      const est5km = Math.round((rates.baseFare + (5 * rates.perKm)) * systemSettings.surgeMultiplier);

                      return (
                        <div key={cls.id} className="bg-brand-card/70 border border-brand-input/80 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-white">
                            <span className="flex items-center gap-1.5"><span>{cls.icon}</span> {cls.name}</span>
                          </div>
                          <div className="space-y-1 text-xs font-mono">
                            <div className="flex justify-between text-brand-text-muted">
                              <span>Prise en charge :</span>
                              <strong className="text-emerald-400 font-extrabold">{rates.baseFare.toLocaleString('fr-FR')} FCFA</strong>
                            </div>
                            <div className="flex justify-between text-brand-text-muted">
                              <span>Prix au KM :</span>
                              <strong className="text-brand-gold font-extrabold">{rates.perKm.toLocaleString('fr-FR')} FCFA/km</strong>
                            </div>
                          </div>
                          <div className="pt-1.5 border-t border-brand-input/40 flex justify-between items-center text-[10px] text-slate-300 font-semibold">
                            <span>Ex. Course 5 km :</span>
                            <span className="text-white font-mono font-bold">{est5km.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dashboard grid of cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-brand-card/40 border border-brand-card p-5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-brand-text-muted uppercase font-black tracking-wider block">Total Platform Deposits</span>
                    <h3 className="text-2xl font-black text-brand-gold tracking-tight">{(totalRevenue).toLocaleString('fr-FR')} FCFA</h3>
                    <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <TrendingUp size={12} />
                      <span>MTN MoMo & Orange Money API</span>
                    </p>
                  </div>

                  <div className="bg-brand-card/40 border border-brand-card p-5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-brand-text-muted uppercase font-black tracking-wider block">Admin Commissions (15%)</span>
                    <h3 className="text-2xl font-black text-white tracking-tight">{(totalRevenue * systemSettings.commissionRate / 100).toLocaleString('fr-FR')} FCFA</h3>
                    <p className="text-[10px] text-brand-text-muted font-medium">Accumulated from completed rides</p>
                  </div>

                  <div className="bg-brand-card/40 border border-brand-card p-5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-brand-text-muted uppercase font-black tracking-wider block">Approved Fleet Size</span>
                    <h3 className="text-2xl font-black text-white tracking-tight">{driversList.filter(d => d.approvalStatus === 'approved').length} Active</h3>
                    <p className="text-[10px] text-brand-text-muted font-medium">Approved professional chauffeurs</p>
                  </div>

                  <div className="bg-brand-card/40 border border-brand-card p-5 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-brand-text-muted uppercase font-black tracking-wider block">Driver Cashouts</span>
                    <h3 className="text-2xl font-black text-brand-gold tracking-tight">{(totalWithdrawals).toLocaleString('fr-FR')} FCFA</h3>
                    <p className="text-[10px] text-amber-500 font-semibold">
                      {pendingWithdrawalsCount > 0 ? `● ${pendingWithdrawalsCount} payout waiting` : '✓ All payouts cleared'}
                    </p>
                  </div>
                </div>

                {/* SVG Visualizations of Revenue Channels */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Carrier share chart card */}
                  <div className="bg-brand-card border border-brand-input rounded-2xl p-5 shadow-md lg:col-span-5 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-text-muted">Deposit API Share by Carrier</h4>
                    
                    <div className="flex justify-center py-4">
                      {/* Interactive vector pie/donut visual representation */}
                      <svg viewBox="0 0 200 200" className="w-40 h-40">
                        {/* Orange segment (55%) */}
                        <circle cx="100" cy="100" r="70" fill="transparent" stroke="#f97316" strokeWidth="25" strokeDasharray="242 440" strokeDashoffset="0" />
                        {/* MTN Gold segment (45%) */}
                        <circle cx="100" cy="100" r="70" fill="transparent" stroke="#facc15" strokeWidth="25" strokeDasharray="198 440" strokeDashoffset="-242" />
                        {/* Center text overlay */}
                        <circle cx="100" cy="100" r="45" fill="#0a081d" />
                        <text x="100" y="95" textAnchor="middle" fill="#beb7e8" fontSize="10" fontWeight="bold">TOTAL API</text>
                        <text x="100" y="115" textAnchor="middle" fill="#ffd385" fontSize="13" fontWeight="900">MOMO</text>
                      </svg>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold pt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-amber-400 rounded"></span>
                        <span>MTN MoMo (45%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-orange-500 rounded"></span>
                        <span>Orange Money (55%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking timeline graph */}
                  <div className="bg-brand-card border border-brand-input rounded-2xl p-5 shadow-md lg:col-span-7 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-text-muted">Simulated Daily Bookings (Last 7 Days)</h4>
                    
                    <div className="relative pt-6">
                      {/* SVG line chart */}
                      <svg viewBox="0 0 500 150" className="w-full h-36">
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="500" y2="20" stroke="#19143d" strokeWidth="0.5" strokeDasharray="5,5" />
                        <line x1="0" y1="60" x2="500" y2="60" stroke="#19143d" strokeWidth="0.5" strokeDasharray="5,5" />
                        <line x1="0" y1="100" x2="500" y2="100" stroke="#19143d" strokeWidth="0.5" strokeDasharray="5,5" />
                        <line x1="0" y1="130" x2="500" y2="130" stroke="#19143d" strokeWidth="1" />
                        
                        {/* Line path representing traffic graph */}
                        <path
                          d="M 20 120 L 95 105 L 170 85 L 245 110 L 320 60 L 395 35 L 470 50"
                          fill="none"
                          stroke="#ffd385"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />

                        {/* Node points */}
                        <circle cx="20" cy="120" r="4.5" fill="#ffd385" stroke="#0a081d" strokeWidth="2" />
                        <circle cx="95" cy="105" r="4.5" fill="#ffd385" stroke="#0a081d" strokeWidth="2" />
                        <circle cx="170" cy="85" r="4.5" fill="#ffd385" stroke="#0a081d" strokeWidth="2" />
                        <circle cx="245" cy="110" r="4.5" fill="#ffd385" stroke="#0a081d" strokeWidth="2" />
                        <circle cx="320" cy="60" r="4.5" fill="#ffd385" stroke="#0a081d" strokeWidth="2" />
                        <circle cx="395" cy="35" r="4.5" fill="#ffd385" stroke="#0a081d" strokeWidth="2" />
                        <circle cx="470" cy="50" r="4.5" fill="#ffd385" stroke="#0a081d" strokeWidth="2" />
                      </svg>
                      
                      {/* Timeline labels */}
                      <div className="flex justify-between text-[10px] text-brand-text-muted px-2 font-mono mt-1 font-bold">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                        <span>Sun (Today)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* DRIVER fleet & approvals portal */}
            {tab === 'drivers' && (
              <motion.div
                key="drivers-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-white">Driver Credentials Audit</h3>
                  <div className="relative max-w-xs">
                    <input
                      type="text"
                      placeholder="Search driver list..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-brand-card border border-brand-input rounded-xl px-3 py-1.5 pl-8 text-xs text-white focus:outline-none focus:border-brand-gold focus:bg-brand-card w-56 font-semibold"
                    />
                    <Search className="absolute left-2.5 top-2 text-brand-text-muted" size={13} />
                  </div>
                </div>

                <div className="space-y-3">
                  {driversList
                    .filter(driver => driver.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((driver) => {
                      const isPending = driver.approvalStatus === 'pending';
                      return (
                        <div key={driver.id} className="bg-brand-card border border-brand-input rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm hover:border-brand-input/80 transition">
                          <div className="flex items-center gap-3">
                            <img
                              src={driver.avatar}
                              alt={driver.name}
                              className="w-12 h-12 rounded-xl object-cover border border-brand-input"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-extrabold text-white">{driver.name}</h4>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${driver.approvalStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-amber-500/10 text-amber-500 border border-amber-500/25'}`}>
                                  {driver.approvalStatus}
                                </span>
                              </div>
                              <p className="text-xs text-brand-text-muted font-medium mt-0.5">{driver.vehicleModel} • {driver.vehiclePlate}</p>
                              <p className="text-[10px] text-brand-text-muted font-semibold mt-1">📞 {driver.phone}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => onApproveDriver(driver.id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] px-4 py-2 rounded-xl cursor-pointer shadow transition"
                                >
                                  Approve Driver
                                </button>
                                <button
                                  onClick={() => onRejectDriver(driver.id)}
                                  className="bg-brand-input hover:bg-brand-card text-rose-400 font-bold text-[11px] px-3 py-2 rounded-xl border border-brand-input cursor-pointer transition"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => onRejectDriver(driver.id)}
                                className="bg-brand-input hover:bg-brand-card text-rose-400/80 font-semibold text-[10px] px-3 py-1.5 rounded-xl border border-brand-input cursor-pointer transition"
                              >
                                Suspend/Revoke Account
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* WALLET TRANSACTIONS PANEL */}
            {tab === 'transactions' && (
              <motion.div
                key="transactions-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <h3 className="text-sm font-black text-white">MoMo & Orange Money Audit Ledger</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-brand-text border-collapse">
                    <thead>
                      <tr className="border-b border-brand-input text-brand-text-muted text-[10px] font-black uppercase">
                        <th className="py-3 px-2">Timestamp</th>
                        <th className="py-3 px-2">Tx ID</th>
                        <th className="py-3 px-2">Account/Number</th>
                        <th className="py-3 px-2">Action Type</th>
                        <th className="py-3 px-2">Carrier API</th>
                        <th className="py-3 px-2 text-right">Amount</th>
                        <th className="py-3 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-input/50 font-medium">
                      {transactions.map((tx, idx) => {
                        const isTopup = tx.type === 'topup';
                        const isPending = tx.status === 'pending';
                        
                        return (
                          <tr key={`${tx.id}-${idx}`} className="hover:bg-brand-card/20 transition">
                            <td className="py-3.5 px-2 text-brand-text-muted font-mono">{tx.date}</td>
                            <td className="py-3.5 px-2 font-mono font-bold text-white">{tx.id}</td>
                            <td className="py-3.5 px-2">{tx.phone}</td>
                            <td className="py-3.5 px-2 font-bold">
                              {isTopup ? (
                                <span className="text-emerald-400">⚡ DEPOSIT (TOPUP)</span>
                              ) : (
                                <span className="text-amber-500">📥 DRIVER CASHOUT</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2">
                              {tx.carrier === 'momo_mtn' ? (
                                <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[9px] font-bold">MTN MoMo</span>
                              ) : (
                                <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[9px] font-bold">Orange OM</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-right font-black text-brand-gold">
                              <div>{tx.amount.toLocaleString('fr-FR')} XAF</div>
                              {tx.bonusAmount && tx.bonusAmount > 0 && (
                                <div className="text-[10px] text-emerald-400 font-bold tracking-tight">
                                  +{tx.bonusAmount.toLocaleString('fr-FR')} bonus
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-center">
                              {isPending ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => onApproveWithdrawal(tx.id)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[9px] px-2 py-1 rounded cursor-pointer transition"
                                  >
                                    Clear Payout
                                  </button>
                                </div>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                  ✓ Settled
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* EDITABLE SETTINGS AND SLIDERS PANEL WITH FIRESTORE REAL-TIME PERSISTENCE */}
            {tab === 'settings' && (
              <motion.div
                key="settings-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-brand-card border border-brand-input rounded-2xl p-6 shadow-md space-y-6"
              >
                {/* Header & Firestore Live Sync Status Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-deep/90 border border-brand-gold/30 rounded-2xl p-4 shadow-inner">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Sliders className="text-brand-gold" size={20} />
                      <span>Gestion de Tarification & Commission Firebase</span>
                    </h3>
                    <p className="text-xs text-brand-text-muted font-medium">
                      Modifiez en temps réel les tarifs de base, prix au kilomètre et commissions stockés dans Firestore (<code className="text-brand-gold font-mono text-[11px]">settings/pricing</code>).
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400 font-mono">
                        Firestore Sync {lastSyncedTime ? `(${lastSyncedTime})` : 'Actif'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveToFirestore}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-brand-midnight font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Sauvegarde...</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          <span>Enregistrer dans Firestore</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                {saveSuccessMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    <span>{saveSuccessMessage}</span>
                  </motion.div>
                )}

                {saveErrorMessage && (
                  <div className="bg-rose-500/15 border border-rose-500/40 text-rose-300 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <AlertCircle size={16} className="text-rose-400 shrink-0" />
                    <span>{saveErrorMessage}</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Vehicle Class Rates Configuration */}
                  <div className="bg-brand-deep/90 border border-brand-gold/20 rounded-2xl p-5 space-y-4 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-input/60">
                      <div>
                        <h4 className="text-xs font-black text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign size={14} className="text-emerald-400" />
                          <span>Tarifs de Prise en Charge (Base Fare) & Prix au Kilomètre (Rate/KM)</span>
                        </h4>
                        <p className="text-[10.5px] text-brand-text-muted font-medium mt-0.5">
                          Saisissez directement les valeurs numériques ou ajustez à l'aide des curseurs.
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const reset = {
                              ...formData,
                              classRates: {
                                okada: { baseFare: 250, perKm: 80 },
                                keke: { baseFare: 300, perKm: 100 },
                                ecoride: { baseFare: 1500, perKm: 250 },
                                comfort: { baseFare: 3000, perKm: 400 },
                              }
                            };
                            setFormData(reset);
                            onUpdateSettings(reset);
                          }}
                          className="bg-brand-input hover:bg-brand-card text-brand-text-muted hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold border border-brand-card transition cursor-pointer"
                        >
                          🔄 Réinitialiser Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.classRates || {
                              okada: { baseFare: 250, perKm: 80 },
                              keke: { baseFare: 300, perKm: 100 },
                              ecoride: { baseFare: 1500, perKm: 250 },
                              comfort: { baseFare: 3000, perKm: 400 },
                            };
                            const boosted: Record<string, { baseFare: number; perKm: number }> = {};
                            Object.keys(current).forEach((k) => {
                              boosted[k] = {
                                baseFare: Math.round(current[k].baseFare * 1.15),
                                perKm: Math.round(current[k].perKm * 1.15)
                              };
                            });
                            const updated = { ...formData, classRates: boosted };
                            setFormData(updated);
                            onUpdateSettings(updated);
                          }}
                          className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-500/30 transition cursor-pointer"
                        >
                          ⚡ +15% Heures de Pointe
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {[
                        { id: 'okada', name: 'Moto-Taxi (Okada)', defaultBase: 250, defaultPerKm: 80, icon: '🏍️' },
                        { id: 'keke', name: 'Petit Taxi (Yellow Cab / Tricycle)', defaultBase: 300, defaultPerKm: 100, icon: '🛺' },
                        { id: 'ecoride', name: 'EcoRide (Berline Privée)', defaultBase: 1500, defaultPerKm: 250, icon: '🚗' },
                        { id: 'comfort', name: 'VIP Ride (SUV Luxe)', defaultBase: 3000, defaultPerKm: 400, icon: '🚘' },
                      ].map((cls) => {
                        const currentRates = formData.classRates?.[cls.id] || { baseFare: cls.defaultBase, perKm: cls.defaultPerKm };

                        const updateClassRate = (field: 'baseFare' | 'perKm', val: number) => {
                          const safeVal = isNaN(val) ? 0 : Math.max(0, val);
                          const updated = {
                            ...formData,
                            classRates: {
                              ...(formData.classRates || {}),
                              [cls.id]: {
                                ...currentRates,
                                [field]: safeVal
                              }
                            }
                          };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        };

                        const sample5km = Math.round((currentRates.baseFare + (5 * currentRates.perKm)) * (formData.surgeMultiplier || 1.0));

                        return (
                          <div key={cls.id} className="bg-brand-card/90 border border-brand-input p-4 rounded-2xl space-y-3.5 shadow-md">
                            <div className="flex items-center justify-between border-b border-brand-input/40 pb-2">
                              <span className="text-xs font-black text-white flex items-center gap-2">
                                <span className="text-base">{cls.icon}</span> {cls.name}
                              </span>
                              <span className="text-[10px] font-mono font-extrabold bg-brand-gold/15 text-brand-gold px-2 py-0.5 rounded-lg border border-brand-gold/25">
                                Base: {currentRates.baseFare} XAF | {currentRates.perKm} XAF/km
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              {/* Base Fee Field */}
                              <div className="bg-brand-deep/80 p-2.5 rounded-xl border border-brand-input/60 space-y-1.5">
                                <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider">
                                  Frais de Prise en Charge
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={10000}
                                    step={50}
                                    value={currentRates.baseFare}
                                    onChange={(e) => updateClassRate('baseFare', parseInt(e.target.value))}
                                    className="w-full bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-1 text-xs font-mono font-black text-emerald-400 outline-none"
                                  />
                                  <span className="text-[10px] font-bold text-brand-text-muted shrink-0">XAF</span>
                                </div>
                                <input
                                  type="range"
                                  min={100}
                                  max={5000}
                                  step={50}
                                  value={currentRates.baseFare}
                                  onChange={(e) => updateClassRate('baseFare', parseInt(e.target.value))}
                                  className="w-full accent-emerald-400 h-1.5 bg-brand-input rounded-lg cursor-pointer"
                                />
                              </div>

                              {/* Per KM Field */}
                              <div className="bg-brand-deep/80 p-2.5 rounded-xl border border-brand-input/60 space-y-1.5">
                                <label className="block text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider">
                                  Prix au Kilomètre
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={2000}
                                    step={10}
                                    value={currentRates.perKm}
                                    onChange={(e) => updateClassRate('perKm', parseInt(e.target.value))}
                                    className="w-full bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-1 text-xs font-mono font-black text-brand-gold outline-none"
                                  />
                                  <span className="text-[10px] font-bold text-brand-text-muted shrink-0">XAF/km</span>
                                </div>
                                <input
                                  type="range"
                                  min={20}
                                  max={1000}
                                  step={10}
                                  value={currentRates.perKm}
                                  onChange={(e) => updateClassRate('perKm', parseInt(e.target.value))}
                                  className="w-full accent-brand-gold h-1.5 bg-brand-input rounded-lg cursor-pointer"
                                />
                              </div>
                            </div>

                            {/* Live calculation formula preview */}
                            <div className="bg-brand-midnight/60 px-3 py-1.5 rounded-xl border border-brand-input/40 flex justify-between items-center text-[10px]">
                              <span className="text-brand-text-muted">Estimation Course 5 km (Surge {(formData.surgeMultiplier || 1.0).toFixed(1)}x) :</span>
                              <strong className="text-white font-mono font-black">{sample5km.toLocaleString('fr-FR')} FCFA</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commission percentage and Platform controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Commission Rate */}
                    <div className="bg-brand-deep/80 border border-brand-input/60 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-1">
                          <Percent size={13} className="text-brand-gold" />
                          <span>Taux de Commission Wanda</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={formData.commissionRate}
                            onChange={(e) => {
                              const updated = { ...formData, commissionRate: parseInt(e.target.value) || 0 };
                              setFormData(updated);
                              onUpdateSettings(updated);
                            }}
                            className="w-14 bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-0.5 text-xs font-mono font-black text-brand-gold text-right outline-none"
                          />
                          <span className="text-xs font-bold text-brand-gold">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={35}
                        step={1}
                        value={formData.commissionRate}
                        onChange={(e) => {
                          const updated = { ...formData, commissionRate: parseInt(e.target.value) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        className="w-full accent-brand-gold h-2 bg-brand-input rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-brand-text-muted block font-medium">Déduit directement du tarif de chaque course effectuée.</span>
                    </div>

                    {/* Surge Multiplier */}
                    <div className="bg-brand-deep/80 border border-brand-input/60 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white uppercase tracking-wider">Multiplicateur Surge</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1.0}
                            max={3.0}
                            step={0.1}
                            value={formData.surgeMultiplier}
                            onChange={(e) => {
                              const updated = { ...formData, surgeMultiplier: parseFloat(e.target.value) || 1.0 };
                              setFormData(updated);
                              onUpdateSettings(updated);
                            }}
                            className="w-14 bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-0.5 text-xs font-mono font-black text-brand-gold text-right outline-none"
                          />
                          <span className="text-xs font-bold text-brand-gold">x</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={1.0}
                        max={2.5}
                        step={0.1}
                        value={formData.surgeMultiplier}
                        onChange={(e) => {
                          const updated = { ...formData, surgeMultiplier: parseFloat(e.target.value) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        className="w-full accent-brand-gold h-2 bg-brand-input rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-brand-text-muted block font-medium">Multiplie la tarification pendant les heures de pointe/pluie.</span>
                    </div>

                    {/* Minimum Withdrawal */}
                    <div className="bg-brand-deep/80 border border-brand-input/60 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white uppercase tracking-wider">Seuil Retrait Chauffeur</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={500}
                            max={20000}
                            step={500}
                            value={formData.minimumWithdrawal}
                            onChange={(e) => {
                              const updated = { ...formData, minimumWithdrawal: parseInt(e.target.value) || 1000 };
                              setFormData(updated);
                              onUpdateSettings(updated);
                            }}
                            className="w-20 bg-brand-input border border-brand-card focus:border-brand-gold rounded-lg px-2 py-0.5 text-xs font-mono font-black text-brand-gold text-right outline-none"
                          />
                          <span className="text-[10px] font-bold text-brand-text-muted">XAF</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={1000}
                        max={10000}
                        step={500}
                        value={formData.minimumWithdrawal}
                        onChange={(e) => {
                          const updated = { ...formData, minimumWithdrawal: parseInt(e.target.value) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        className="w-full accent-brand-gold h-2 bg-brand-input rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-brand-text-muted block font-medium">Limite minimale pour retrait MTN MoMo / Orange Money.</span>
                    </div>
                  </div>

                  {/* Wallet Topup Promo Settings */}
                  <div className="bg-brand-deep/80 border border-brand-input/60 rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-center bg-brand-input/40 p-3 rounded-xl border border-brand-card">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-xs text-white uppercase tracking-wider block">Bonus de Recharge Wallet Passager</span>
                        <span className="text-[10px] text-brand-text-muted font-medium font-medium">Activer ou désactiver les crédits bonus lors des dépôts</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...formData, topupPromoActive: !(formData.topupPromoActive ?? false) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl font-black text-[10px] tracking-wide uppercase transition duration-200 cursor-pointer ${
                          formData.topupPromoActive
                            ? 'bg-emerald-500 text-brand-midnight shadow-lg shadow-emerald-500/20'
                            : 'bg-brand-card border border-brand-input text-brand-text-muted hover:text-white'
                        }`}
                      >
                        {formData.topupPromoActive ? '✓ Promo Active' : '● Inactif'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white uppercase tracking-wider">Pourcentage de Bonus Promo</span>
                        <strong className="text-brand-gold font-mono font-black text-sm">{(formData.topupPromoRate ?? 10)}% Bonus</strong>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        step={5}
                        value={formData.topupPromoRate ?? 10}
                        onChange={(e) => {
                          const updated = { ...formData, topupPromoRate: parseInt(e.target.value) };
                          setFormData(updated);
                          onUpdateSettings(updated);
                        }}
                        disabled={!formData.topupPromoActive}
                        className={`w-full accent-brand-gold h-2 bg-brand-input rounded-lg cursor-pointer transition ${!formData.topupPromoActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-[10px] text-brand-text-muted block font-medium">
                        {formData.topupPromoActive 
                          ? `Les passagers reçoivent ${(formData.topupPromoRate ?? 10)}% de crédits bonus sur chaque rechargement (ex. 10 000 FCFA -> ${(10000 * (1 + (formData.topupPromoRate ?? 10)/100)).toLocaleString('fr-FR')} FCFA).`
                          : "Activez le statut ci-dessus pour offrir des crédits bonus lors des dépôts."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer with Primary Save Button */}
                <div className="bg-gradient-to-r from-brand-deep to-brand-midnight border border-brand-gold/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-gold/15 text-brand-gold rounded-xl border border-brand-gold/30 shrink-0">
                      <Database size={20} />
                    </div>
                    <div>
                      <strong className="text-white text-xs font-black block">Persistance Firestore en Temps Réel</strong>
                      <span className="text-[11px] text-brand-text-muted font-medium">
                        Cliquez ci-contre pour écrire immédiatement les paramètres de tarification dans la base de données Firestore.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveToFirestore}
                    disabled={isSaving}
                    className="w-full sm:w-auto bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-brand-midnight font-black px-6 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl transition transform active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Enregistrement Firestore...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Enregistrer dans Firestore ('settings/pricing')</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}
