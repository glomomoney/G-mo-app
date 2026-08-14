import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MessageSquare, TrendingUp, Flame, Play, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import DriverWallet from '../components/DriverWallet';
import {
  UserRole, RideStatus, Location, PaymentMethod, Message, DriverRideRequest,
  Transaction, SystemSettings, HistoryItem, RecentBooking, UserProfile
} from '../types';

// ============================================================================
// Main driver dashboard panel (Orders / Wallet tabs) — rendered inside the
// left sidebar when role === 'driver'.
// ============================================================================
interface DriverMainDashboardProps {
  role: UserRole;
  slangMode: boolean;
  rideStatus: RideStatus;
  driverActiveTab: 'orders' | 'wallet';
  setDriverActiveTab: (tab: 'orders' | 'wallet') => void;
  driverOnline: boolean;
  setDriverOnline: (online: boolean) => void;
  driverStats: { earnings: number; trips: number; rating: number };
  getPaymentBadge: (method: PaymentMethod) => React.JSX.Element;
  paymentMethod: PaymentMethod;
  pickup: Location | null;
  destination: Location | null;
  activeFareToCharge: number;
  waitingTime: number;
  currentRideWaitingFare: number;
  setRideStatus: (status: RideStatus) => void;
  setShowChat: (show: boolean) => void;
  messages: Message[];
  handleCancelBooking: () => void;
  showCallDropdown: boolean;
  setShowCallDropdown: (show: boolean) => void;
  startInAppCall: (sender: 'passenger' | 'driver') => void;
  receiveInAppCall: (sender: 'passenger' | 'driver') => void;
  currentCity: string;
  driverLoc: { lat: number; lng: number } | null;
  setCenterCoords: (coords: { lat: number; lng: number } | null) => void;
  recentBookings: RecentBooking[];
  driverWallet: number;
  handleDriverWithdraw: (amount: number, method: 'momo_mtn' | 'orange_money', phoneNumber: string) => void;
  transactions: Transaction[];
  systemSettings: SystemSettings;
  user: UserProfile | null;
  history: HistoryItem[];
  isOnline: boolean;
  waitingLogs: any[];
}

export function DriverMainDashboard(props: DriverMainDashboardProps) {
  const {
    role, slangMode, rideStatus, driverActiveTab, setDriverActiveTab, driverOnline, setDriverOnline,
    driverStats, getPaymentBadge, paymentMethod, pickup, destination, activeFareToCharge, waitingTime,
    currentRideWaitingFare, setRideStatus, setShowChat, messages, handleCancelBooking, showCallDropdown,
    setShowCallDropdown, startInAppCall, receiveInAppCall, currentCity,
    driverLoc, setCenterCoords, recentBookings, driverWallet, handleDriverWithdraw, transactions,
    systemSettings, user, history, isOnline, waitingLogs,
  } = props;

  return (
          role === 'driver' && (
            <div className="flex flex-col flex-1 p-4 space-y-4">
              
              {/* Tab selector for driver */}
              {rideStatus === 'idle' && (
                <div className="flex border-b border-brand-card/80 pb-1.5 gap-1 text-xs">
                  <button
                    onClick={() => setDriverActiveTab('orders')}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer ${driverActiveTab === 'orders' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    {slangMode ? "Commandes" : "Incoming Orders"}
                  </button>
                  <button
                    onClick={() => setDriverActiveTab('wallet')}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1 ${driverActiveTab === 'wallet' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    {slangMode ? "Revenus / Retrait" : "Earnings / Payout"}
                  </button>
                </div>
              )}

              {/* ORDERS PANEL */}
              {driverActiveTab === 'orders' && (
                <>
                  {rideStatus === 'idle' && (
                    <div className="bg-brand-card/40 p-3.5 sm:p-4 rounded-2xl border border-brand-card/80 space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-brand-gold flex items-center gap-1.5 tracking-wider uppercase">
                          <TrendingUp size={13} />
                          Wanda Chauffeur Portal
                        </span>
                        
                        {/* Driver Status Toggle Pill */}
                        <button
                          onClick={() => setDriverOnline(!driverOnline)}
                          className={`px-3 py-1 rounded-full text-[9px] font-black transition cursor-pointer flex items-center gap-1.5 ${
                            driverOnline ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${driverOnline ? 'bg-white animate-pulse' : 'bg-rose-400'}`} />
                          {driverOnline ? 'ONLINE' : 'OFFLINE'}
                        </button>
                      </div>

                      {/* Prominent Immediately-Visible "GO ONLINE" Banner Button when Offline */}
                      {!driverOnline && (
                        <button
                          onClick={() => setDriverOnline(true)}
                          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-black py-3 px-4 rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer border border-emerald-300/40"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                          <span>{slangMode ? "PASSER EN LIGNE (SE CONNECTER)" : "GO ONLINE (START ACCEPTING RIDES)"}</span>
                        </button>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-brand-input/40 border border-brand-card p-2 rounded-xl">
                          <span className="text-[8px] text-brand-text-muted block uppercase font-bold">Earnings</span>
                          <span className="text-xs font-black text-white">{driverStats.earnings.toLocaleString('fr-FR')} XAF</span>
                        </div>
                        <div className="bg-brand-input/40 border border-brand-card p-2 rounded-xl">
                          <span className="text-[8px] text-brand-text-muted block uppercase font-bold">Trips Completed</span>
                          <span className="text-xs font-black text-white">{driverStats.trips}</span>
                        </div>
                        <div className="bg-brand-input/40 border border-brand-card p-2 rounded-xl">
                          <span className="text-[8px] text-brand-text-muted block uppercase font-bold">Fleet Rating</span>
                          <span className="text-xs font-black text-brand-gold flex items-center justify-center gap-0.5">★ {driverStats.rating}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!driverOnline ? (
                    <div className="text-center py-3 space-y-2 flex-1 flex flex-col justify-center bg-brand-card/20 rounded-2xl border border-brand-card/50 p-3">
                      <span className="text-2xl block">😴</span>
                      <h4 className="text-xs font-extrabold text-white">{slangMode ? "Tu es déconnecté" : "You are Offline"}</h4>
                      <p className="text-[10px] text-brand-text-muted max-w-xs mx-auto leading-relaxed font-medium">
                        {slangMode ? (
                          `Passe en ligne pour recevoir les demandes de courses en temps réel à ${currentCity} !`
                        ) : (
                          `Go online to start receiving passenger ride requests in ${currentCity}.`
                        )}
                      </p>
                      <button
                        onClick={() => setDriverOnline(true)}
                        className="mx-auto bg-emerald-500 hover:bg-emerald-400 text-white font-black py-2.5 px-6 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>{slangMode ? "Se connecter maintenant" : "Go Online Now"}</span>
                      </button>
                    </div>
                  ) : rideStatus !== 'idle' ? (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      {/* Active simulation details for driving mode */}
                      <div className="bg-brand-card/40 border border-brand-card p-4 rounded-2xl space-y-3 shadow-md">
                        <div className="flex items-center justify-between border-b border-brand-input pb-2">
                          <span className="text-[9px] text-brand-gold font-bold uppercase tracking-wider">
                            {rideStatus === 'driver_found' && 'Driving to Pickup Carrefour'}
                            {rideStatus === 'arriving' && 'Waiting at Pickup Station'}
                            {rideStatus === 'in_progress' && 'Transporting Dropoff'}
                          </span>
                          {getPaymentBadge(paymentMethod)}
                        </div>

                        <div className="space-y-2.5 text-xs font-semibold">
                          <div className="flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 animate-pulse"></span>
                            <div>
                              <span className="text-[8px] text-brand-text-muted block uppercase">RAMASSAGE (A)</span>
                              <p className="font-extrabold text-white truncate">{pickup?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0 mt-1"></span>
                            <div>
                              <span className="text-[8px] text-brand-text-muted block uppercase">DÉPÔT (B)</span>
                              <p className="font-extrabold text-white truncate">{destination?.name}</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-brand-input/40 pt-2.5 flex justify-between items-center text-xs">
                          <span className="text-brand-text-muted font-medium">Estimated Gross Payout:</span>
                          <strong className="text-brand-gold text-xs font-black">{activeFareToCharge.toLocaleString('fr-FR')} FCFA</strong>
                        </div>
                      </div>

                      {rideStatus === 'arriving' && (
                        <div className="bg-amber-500/10 border-2 border-brand-gold/60 p-4 rounded-2xl space-y-3 shadow-xl animate-pulse-subtle">
                          <div className="flex items-center justify-between border-b border-brand-gold/20 pb-2">
                            <span className="text-[10px] text-brand-gold font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
                              {slangMode ? "COMPTEUR D'ATTENTE" : "WAITING TIME METER"}
                            </span>
                            <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-full font-black">
                              {slangMode ? "Facture Supplémentaire" : "Potential Adjustment"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[9px] text-brand-text-muted uppercase font-bold">{slangMode ? "Temps Écoulé" : "Elapsed Duration"}</p>
                              <p className="text-2xl font-black text-white font-mono tracking-wider">
                                {String(Math.floor(waitingTime / 60)).padStart(2, '0')}:
                                {String(waitingTime % 60).padStart(2, '0')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-brand-text-muted uppercase font-bold">{slangMode ? "Frais d'Attente" : "Extra Fare Accrued"}</p>
                              <p className="text-xl font-black text-brand-gold font-mono">
                                +{currentRideWaitingFare.toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>
                          </div>

                          {/* Grace period status bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold">
                              {waitingTime <= 10 ? (
                                <>
                                  <span className="text-emerald-400">{slangMode ? "Période de grâce gratuite" : "Free Grace Period"}</span>
                                  <span className="text-emerald-400 font-mono">{10 - waitingTime}s restant</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-brand-gold">{slangMode ? "Heures supplémentaires payantes" : "Billable Overtime"}</span>
                                  <span className="text-brand-gold font-mono">100 FCFA / sec</span>
                                </>
                              )}
                            </div>
                            <div className="h-2 bg-brand-input rounded-full overflow-hidden border border-brand-card">
                              <div 
                                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${waitingTime <= 10 ? 'bg-emerald-500' : 'bg-brand-gold'}`}
                                style={{ width: `${Math.min(100, (waitingTime / 10) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Button to start trip manually */}
                          <button
                            onClick={() => setRideStatus('in_progress')}
                            className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-2.5 rounded-xl text-xs tracking-wide shadow-lg shadow-brand-gold/20 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                          >
                            <Play size={13} className="fill-brand-midnight" />
                            {slangMode ? "Démarrer la course (Client à bord)" : "Start Trip (Passenger Onboard)"}
                          </button>
                        </div>
                      )}

                      {/* Message Passenger Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setShowChat(true)}
                        className="w-full py-3 px-3.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/40 hover:border-brand-gold text-brand-gold rounded-2xl flex items-center justify-between font-black text-xs transition cursor-pointer active:scale-98 shadow-sm group"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquare size={16} className="text-brand-gold group-hover:scale-110 transition-transform" />
                          <span>{slangMode ? "Tchatter avec le client" : "Chat with Passenger"}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] bg-brand-gold text-brand-midnight px-2.5 py-0.5 rounded-full font-black">
                          {messages.length > 0 ? `${messages.length} msgs` : (slangMode ? "Ouvrir Chat" : "Open Chat")}
                          <ChevronUp size={12} className="stroke-[3]" />
                        </span>
                      </button>

                      {/* Control buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleCancelBooking}
                          className="flex-1 bg-brand-card hover:bg-brand-card/80 border border-brand-input text-rose-400 text-xs py-3 rounded-xl font-bold cursor-pointer transition shadow-sm animate-pulse"
                        >
                          Cancel Active Order
                        </button>
                        <div className="relative flex shrink-0">
                          <button
                            onClick={() => setShowCallDropdown(!showCallDropdown)}
                            className="px-3.5 py-3 bg-brand-input hover:bg-brand-input/80 text-brand-gold border border-brand-card rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer shadow gap-1.5 transition active:scale-95"
                          >
                            <span>📞 {slangMode ? "Appeler" : "Call"}</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${showCallDropdown ? 'rotate-180' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {showCallDropdown && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full right-0 mb-2 w-56 bg-brand-midnight/95 backdrop-blur-md border border-brand-card/80 p-2 rounded-2xl shadow-2xl z-50 space-y-1"
                              >
                                <div className="px-2.5 py-1.5 text-[9px] text-brand-text-muted font-black uppercase tracking-wider border-b border-brand-card/40">
                                  {slangMode ? "OPTIONS D'APPEL" : "CALL OPTIONS"}
                                </div>
                                <button
                                  onClick={() => startInAppCall('driver')}
                                  className="w-full text-left px-2.5 py-2 hover:bg-brand-card rounded-xl text-xs font-black text-white flex items-center gap-2 transition cursor-pointer group"
                                >
                                  <span className="text-base group-hover:scale-110 transition">📞</span>
                                  <div>
                                    <p className="font-extrabold">{slangMode ? "Appeler le client" : "Call Passenger"}</p>
                                    <p className="text-[9px] text-brand-text-muted font-semibold">{slangMode ? "Lancer un appel sortant" : "Start outgoing call"}</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => receiveInAppCall('passenger')}
                                  className="w-full text-left px-2.5 py-2 hover:bg-brand-card rounded-xl text-xs font-black text-brand-gold flex items-center gap-2 transition cursor-pointer group"
                                >
                                  <span className="text-base group-hover:scale-110 transition">🔔</span>
                                  <div>
                                    <p className="font-extrabold">{slangMode ? "Simuler un appel entrant" : "Simulate Incoming Call"}</p>
                                    <p className="text-[9px] text-brand-text-muted font-semibold">{slangMode ? "Recevoir l'appel du client" : "Passenger calling you"}</p>
                                  </div>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-220px)] pr-1 scrollbar-thin">
                      
                      {/* Radar Scanning Header Card */}
                      <div className="bg-gradient-to-r from-brand-card to-brand-midnight border border-brand-card/60 p-4 rounded-2xl relative overflow-hidden shadow-lg">
                        {/* Radar pulse background animation */}
                        <div className="absolute right-3 top-3 w-10 h-10 rounded-full border border-emerald-500/30 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full border border-emerald-500/40 animate-ping absolute"></div>
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 animate-pulse absolute"></div>
                          <span className="text-emerald-400 text-xs font-black select-none z-10">📡</span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            {slangMode ? "Heatmap Active" : "Heatmap Active"}
                          </span>
                          <h4 className="text-xs font-black text-white">
                            {slangMode ? "Radar de Demande en Temps Réel" : "Real-Time Demand Radar"}
                          </h4>
                          <p className="text-[10px] text-brand-text-muted leading-relaxed font-medium max-w-[80%]">
                            {slangMode ? (
                              `Les zones de forte affluence à ${currentCity} s'affichent en surbrillance sur votre carte.`
                            ) : (
                              `High-traffic passenger zones across ${currentCity} are highlighted as glowing overlays on your map.`
                            )}
                          </p>
                        </div>
                        
                        {/* Driver position */}
                        <div className="pt-3 border-t border-brand-input/30 mt-3 flex items-center justify-between gap-2">
                          {driverLoc && (
                            <button
                              onClick={() => setCenterCoords({ lat: driverLoc.lat, lng: driverLoc.lng })}
                              className="bg-brand-input hover:bg-brand-card text-brand-text-muted hover:text-white border border-brand-card px-2.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition"
                            >
                              📍 {slangMode ? "Ma Position" : "Center Map"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* HIGH TRAFFIC ZONES LIST (HEATMAP DATA SOURCE) */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-brand-text-muted font-black tracking-wider uppercase flex items-center gap-1.5">
                          <Flame size={12} className="text-orange-500 animate-pulse" />
                          <span>{slangMode ? "ZONES DE FORTE DEMANDE (CLIQUEZ POUR VOIR)" : "HIGH-TRAFFIC HOTSPOTS (CLICK TO RE-CENTER)"}</span>
                        </span>
                        
                        <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                          {[
                            { name: 'Bastos Embassy District', lat: 3.8910, lng: 11.5130, city: 'Yaoundé', multiplier: '1.5x', level: 'High', color: 'text-orange-400 bg-orange-400/10' },
                            { name: 'Marché Central (Central Market)', lat: 3.8655, lng: 11.5190, city: 'Yaoundé', multiplier: '1.8x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Poste Centrale & Blvd 20 Mai', lat: 3.8640, lng: 11.5205, city: 'Yaoundé', multiplier: '1.9x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Ngoa-Ekelle University Area', lat: 3.8490, lng: 11.5030, city: 'Yaoundé', multiplier: '1.2x', level: 'Medium', color: 'text-amber-400 bg-amber-400/10' },
                            { name: 'Mvan Bus Terminal (Gare)', lat: 3.8290, lng: 11.5180, city: 'Yaoundé', multiplier: '1.6x', level: 'High', color: 'text-orange-400 bg-orange-400/10' },
                            { name: 'Mokolo Market (Marché Mokolo)', lat: 3.8710, lng: 11.4980, city: 'Yaoundé', multiplier: '1.7x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            
                            { name: 'Akwa Palace & Blvd de la Liberté', lat: 4.0485, lng: 9.6974, city: 'Douala', multiplier: '1.9x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Bonanjo Administrative Center', lat: 4.0435, lng: 9.6895, city: 'Douala', multiplier: '1.4x', level: 'High', color: 'text-orange-400 bg-orange-400/10' },
                            { name: 'Deido Roundabout (Rond-point)', lat: 4.0620, lng: 9.7090, city: 'Douala', multiplier: '1.7x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Ndokoti Junction (Carrefour)', lat: 4.0415, lng: 9.7420, city: 'Douala', multiplier: '2.1x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Bonamoussadi Market (Marché)', lat: 4.0825, lng: 9.7405, city: 'Douala', multiplier: '1.2x', level: 'Medium', color: 'text-amber-400 bg-amber-400/10' },
                            { name: 'Douala Grand Mall & Airport Zone', lat: 4.0152, lng: 9.7360, city: 'Douala', multiplier: '1.5x', level: 'High', color: 'text-orange-400 bg-orange-400/10' }
                          ]
                            .filter(zone => zone.city === currentCity)
                            .map((zone, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCenterCoords({ lat: zone.lat, lng: zone.lng })}
                                className="w-full text-left bg-brand-card/40 hover:bg-brand-card border border-brand-card hover:border-brand-input p-2.5 rounded-xl flex items-center justify-between transition group active:scale-98"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-base group-hover:scale-110 transition shrink-0">🔥</span>
                                  <div className="min-w-0">
                                    <h5 className="text-[11px] font-black text-white truncate group-hover:text-brand-gold transition">
                                      {zone.name}
                                    </h5>
                                    <p className="text-[9px] text-brand-text-muted font-bold">
                                      {slangMode ? "Zone à forte affluence" : "High-density calling zone"}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider ${zone.color}`}>
                                    {zone.level}
                                  </span>
                                  <span className="text-[10px] font-black text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-1.5 py-0.5 rounded-lg">
                                    {zone.multiplier}
                                  </span>
                                </div>
                              </button>
                            ))
                          }
                        </div>
                      </div>

                      {/* LIVE BOOKINGS ACTIVITY FEED */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-brand-text-muted font-black tracking-wider uppercase flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold"></span>
                          </span>
                          <span>{slangMode ? "FLUX D'ACTIVITÉ RÉCENT (RÉSERVATIONS)" : "RECENT BOOKING EVENTS FEED"}</span>
                        </span>
                        
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                          {recentBookings
                            .filter(booking => booking.city === currentCity)
                            .map((booking) => (
                              <div 
                                key={booking.id} 
                                className="bg-brand-input/30 border border-brand-card/50 p-2.5 rounded-xl flex items-center justify-between text-[11px] relative overflow-hidden"
                              >
                                <div className="flex items-start gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-brand-card/60 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-inner">
                                    {booking.rideClass.includes('VIP') ? '⭐' : booking.rideClass.includes('Moto') || booking.rideClass.includes('Okada') ? '🏍️' : '🚗'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-white truncate max-w-[130px]">
                                        {booking.zoneName.split('(')[0].trim()}
                                      </span>
                                      <span className="text-[8px] text-brand-text-muted font-black">• {booking.timeAgo}</span>
                                    </div>
                                    <p className="text-[9.5px] text-brand-text-muted font-bold">
                                      {booking.rideClass} • <span className="text-brand-gold">{booking.fare.toLocaleString('fr-FR')} FCFA</span>
                                    </p>
                                  </div>
                                </div>
                                
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                                  booking.status === 'completed' 
                                    ? 'bg-emerald-500/15 text-emerald-400' 
                                    : booking.status === 'active' 
                                      ? 'bg-brand-gold/15 text-brand-gold animate-pulse' 
                                      : 'bg-rose-500/15 text-rose-400'
                                }`}>
                                  {booking.status}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      </div>

                      <div className="text-[10px] text-brand-text-muted text-center leading-normal font-semibold border-t border-brand-card/40 pt-3">
                        💡 **Wanda Pro Tip:** Maintain a high rating above 4.7 to receive higher volume VIP class bookings!
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* DRIVER WALLET / CASHOUT PANEL */}
              {driverActiveTab === 'wallet' && (
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 scrollbar-thin">
                  <DriverWallet
                    balance={driverWallet}
                    onWithdrawRequested={handleDriverWithdraw}
                    transactions={transactions.filter(t => t.type === 'withdrawal')}
                    minimumWithdrawal={systemSettings.minimumWithdrawal}
                    driverPhone={user?.phone}
                    rideHistory={history}
                    slangMode={slangMode}
                    isOffline={!isOnline}
                  />

                  {/* Waiting logs ledger */}
                  <div className="bg-brand-card/40 border border-brand-card rounded-2xl p-4 space-y-3.5 shadow-md text-white font-sans">
                    <span className="text-[10px] text-brand-text-muted font-black tracking-wider uppercase flex items-center gap-1.5 border-b border-brand-input pb-2">
                      <Clock size={12} className="text-brand-gold" />
                      <span>{slangMode ? "JOURNAL DES TEMPS D'ATTENTE" : "WAITING TIME LOGS"}</span>
                    </span>

                    {waitingLogs.length === 0 ? (
                      <p className="text-xs text-brand-text-muted/60 italic text-center py-6 font-medium">
                        {slangMode ? "Aucun frais d'attente enregistré." : "No waiting times logged yet."}
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {waitingLogs.map((log) => {
                          const isFree = log.extraFare === 0;
                          return (
                            <div key={log.id} className="bg-brand-input/40 p-3 rounded-xl border border-brand-card space-y-1.5 relative overflow-hidden">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-extrabold text-white truncate max-w-[150px]">{log.pickupName}</span>
                                <span className="font-mono text-[9px] text-brand-text-muted">{log.timestamp}</span>
                              </div>
                              <div className="flex justify-between items-end text-[10px] text-brand-text-muted">
                                <div className="space-y-0.5">
                                  <span>{slangMode ? "Durée :" : "Duration :"} <strong className="text-white font-mono">{Math.floor(log.durationSeconds / 60)}m {log.durationSeconds % 60}s</strong></span>
                                  <span className="block text-[9px]">ID: {log.id}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-bold text-brand-text-muted">{slangMode ? "Ajustement Tarif :" : "Fare Adjustment :"}</p>
                                  <strong className={`font-black text-xs ${isFree ? 'text-emerald-400' : 'text-brand-gold'}`}>
                                    {isFree ? (slangMode ? "GRATUIT" : "FREE (Grace)") : `+${log.extraFare.toLocaleString('fr-FR')} FCFA`}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )
  );
}

// ============================================================================
// Floating active-navigation control bar shown over the map while a driver
// has an active ride (rideStatus !== 'idle'). Lives inside the map <section>
// so its `absolute` positioning stays relative to the map viewport.
// ============================================================================
interface DriverFloatingNavBarProps {
  role: UserRole;
  rideStatus: RideStatus;
  slangMode: boolean;
  isDriverDetailsExpanded: boolean;
  setIsDriverDetailsExpanded: (expanded: boolean) => void;
  destination: Location | null;
  pickup: Location | null;
  activeFareToCharge: number;
  startInAppCall: (sender: 'passenger' | 'driver') => void;
  setShowChat: (show: boolean) => void;
  getPaymentBadge: (method: PaymentMethod) => React.JSX.Element;
  paymentMethod: PaymentMethod;
  waitingTime: number;
  setRideStatus: (status: RideStatus) => void;
  handleCancelBooking: () => void;
  messages: Message[];
}

export function DriverFloatingNavBar(props: DriverFloatingNavBarProps) {
  const {
    role, rideStatus, slangMode, isDriverDetailsExpanded, setIsDriverDetailsExpanded, destination,
    pickup, activeFareToCharge, startInAppCall, setShowChat, getPaymentBadge, paymentMethod,
    waitingTime, setRideStatus, handleCancelBooking, messages,
  } = props;

  return (
          role === 'driver' && rideStatus !== 'idle' && (
            <AnimatePresence>
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                className="absolute bottom-4 inset-x-3 sm:inset-x-6 max-w-lg mx-auto z-[1010] pointer-events-auto"
                id="floating-driver-navigation-bar"
              >
                <div className="bg-brand-midnight/95 backdrop-blur-md border border-brand-gold/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl space-y-2.5 text-white">
                  {!isDriverDetailsExpanded ? (
                    /* COLLAPSED DRIVER BAR (Clean 1-line summary) */
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-black uppercase text-brand-gold tracking-widest block truncate">
                            {rideStatus === 'driver_found' && (slangMode ? 'Vers le point de ramassage' : 'Driving to Pickup')}
                            {rideStatus === 'arriving' && (slangMode ? 'Au point de rendez-vous' : 'Arrived at Pickup Station')}
                            {rideStatus === 'in_progress' && (slangMode ? 'Transport du passager' : 'Driving to Dropoff')}
                          </span>
                          <p className="text-xs font-black text-white truncate leading-snug">
                            {rideStatus === 'in_progress' ? destination?.name : pickup?.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-black text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-xl border border-brand-gold/30 font-mono">
                          {activeFareToCharge.toLocaleString('fr-FR')} FCFA
                        </span>

                        {/* Call button */}
                        <button
                          onClick={() => startInAppCall('driver')}
                          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl border border-emerald-500/30 transition cursor-pointer active:scale-95"
                          title={slangMode ? "Appeler le client" : "Call Passenger"}
                        >
                          <Phone size={15} />
                        </button>

                        {/* Chat button */}
                        <button
                          onClick={() => setShowChat(true)}
                          className="p-2 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-xl border border-brand-gold/30 transition cursor-pointer active:scale-95"
                          title={slangMode ? "Tchatter avec le client" : "Chat Passenger"}
                        >
                          <MessageSquare size={15} />
                        </button>

                        {/* Expand Details button */}
                        <button
                          onClick={() => setIsDriverDetailsExpanded(true)}
                          className="px-2.5 py-2 bg-brand-input hover:bg-brand-card text-brand-text-muted hover:text-white rounded-xl border border-brand-card transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                          title="Expand details"
                        >
                          <span>Détails</span>
                          <ChevronUp size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* EXPANDED DRIVER DETAILS BAR */
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-center justify-between border-b border-brand-input/40 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-brand-gold bg-brand-gold/10 px-2.5 py-0.5 rounded-full border border-brand-gold/20">
                            {rideStatus === 'driver_found' && 'Driving to Pickup'}
                            {rideStatus === 'arriving' && 'Waiting at Pickup'}
                            {rideStatus === 'in_progress' && 'Transporting Dropoff'}
                          </span>
                          {getPaymentBadge(paymentMethod)}
                        </div>
                        <button
                          onClick={() => setIsDriverDetailsExpanded(false)}
                          className="text-brand-text-muted hover:text-white transition p-1 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                        >
                          <span>Masquer</span>
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Pickup & Destination Addresses */}
                      <div className="space-y-2 text-xs font-semibold bg-brand-input/40 p-2.5 rounded-xl border border-brand-card/80">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 animate-pulse" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] text-brand-text-muted block uppercase">RAMASSAGE (A)</span>
                            <p className="font-extrabold text-white truncate">{pickup?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0 mt-1" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] text-brand-text-muted block uppercase">DÉPÔT (B)</span>
                            <p className="font-extrabold text-white truncate">{destination?.name}</p>
                          </div>
                        </div>
                      </div>

                      {/* Waiting time meter if status is arriving */}
                      {rideStatus === 'arriving' && (
                        <div className="bg-amber-500/10 border border-brand-gold/40 p-3 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-brand-gold font-black uppercase tracking-wider flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-brand-gold animate-ping" />
                              {slangMode ? "Compteur d'Attente" : "Waiting Meter"}
                            </span>
                            <span className="text-sm font-black font-mono text-white">
                              {String(Math.floor(waitingTime / 60)).padStart(2, '0')}:{String(waitingTime % 60).padStart(2, '0')}
                            </span>
                          </div>
                          <button
                            onClick={() => setRideStatus('in_progress')}
                            className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition active:scale-95"
                          >
                            <Play size={13} className="fill-brand-midnight" />
                            {slangMode ? "Démarrer la course (Client à bord)" : "Start Trip (Passenger Onboard)"}
                          </button>
                        </div>
                      )}

                      {/* Fare details & action buttons */}
                      <div className="flex items-center justify-between border-t border-brand-input/40 pt-2 text-xs">
                        <div>
                          <span className="text-brand-text-muted text-[10px]">Gain estimé : </span>
                          <strong className="text-brand-gold font-black text-xs">{activeFareToCharge.toLocaleString('fr-FR')} FCFA</strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCancelBooking}
                            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => setShowChat(true)}
                            className="px-3 py-1.5 bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight rounded-xl text-xs font-black flex items-center gap-1 transition cursor-pointer"
                          >
                            <MessageSquare size={13} />
                            <span>Chat ({messages.length})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )
  );
}

// ============================================================================
// Full-screen takeover modal for an incoming ride request. Rendered as a
// top-level sibling (outside the sidebar/map layout) so it can cover the
// whole viewport.
// ============================================================================
interface DriverIncomingRequestModalProps {
  role: UserRole;
  slangMode: boolean;
  language: 'en' | 'fr';
  driverRideRequest: DriverRideRequest | null;
  requestCountdown: number;
  getPaymentBadge: (method: PaymentMethod) => React.JSX.Element;
  handleDeclineRequest: () => void;
  handleAcceptRequest: () => void;
}

export function DriverIncomingRequestModal(props: DriverIncomingRequestModalProps) {
  const {
    role, slangMode, language, driverRideRequest, requestCountdown, getPaymentBadge,
    handleDeclineRequest, handleAcceptRequest,
  } = props;

  return (
      <AnimatePresence>
        {role === 'driver' && driverRideRequest && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[9999] bg-brand-midnight/98 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          >
            <div className="w-full max-w-md bg-gradient-to-b from-brand-midnight via-brand-card to-brand-midnight border-2 border-brand-gold/70 rounded-3xl p-4 sm:p-5 shadow-[0_0_80px_rgba(234,179,8,0.3)] flex flex-col justify-between space-y-3.5 my-auto relative overflow-hidden text-white">
              
              {/* Top ambient glow */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none" />

              {/* Top Header & Countdown Timer */}
              <div className="flex items-center justify-between border-b border-brand-gold/30 pb-2.5 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-gold animate-ping" />
                  <span className="text-xs font-black uppercase tracking-widest text-brand-gold">
                    ⚡ {slangMode ? "DEMANDE ENTRANTE" : "INCOMING RIDE REQUEST"}
                  </span>
                </div>
                <span className="font-mono text-sm text-brand-gold font-black bg-brand-gold/10 border border-brand-gold/40 px-3 py-1 rounded-xl shadow-inner">
                  ⏱️ {requestCountdown}s
                </span>
              </div>

              {/* Passenger Profile */}
              <div className="flex items-center gap-3 bg-brand-input/60 border border-brand-card p-3 rounded-2xl z-10">
                <div className="w-11 h-11 rounded-full bg-brand-deep border-2 border-brand-gold flex items-center justify-center text-xl shadow-md shrink-0 font-bold">
                  👤
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-white flex items-center justify-between gap-1.5">
                    <span className="truncate">{driverRideRequest.passengerName}</span>
                    <span className="text-xs text-brand-gold font-black bg-brand-gold/10 px-2 py-0.5 rounded-lg shrink-0 border border-brand-gold/20">★ 4.9</span>
                  </h4>
                  <p className="text-[11px] text-brand-text-muted font-bold mt-0.5">
                    {slangMode ? "Passager vérifié Wanda" : "Verified Wanda Rider"}
                  </p>
                </div>
              </div>

              {/* Pickup & Dropoff Addresses */}
              <div className="space-y-2.5 bg-brand-input/40 border border-brand-card/80 p-3 rounded-2xl text-xs font-semibold z-10">
                <div className="flex items-start gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[8.5px] text-brand-text-muted block uppercase font-bold tracking-wider">
                      {language === 'fr' ? "POINT DE RAMASSAGE (A)" : "PICKUP LOCATION (A)"}
                    </span>
                    <p className="font-extrabold text-white text-xs sm:text-sm truncate">{driverRideRequest.pickupName}</p>
                  </div>
                </div>

                <div className="w-full border-t border-brand-card/50 my-1" />

                <div className="flex items-start gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-brand-gold shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[8.5px] text-brand-text-muted block uppercase font-bold tracking-wider">
                      {language === 'fr' ? "POINT DE DÉPÔT (B)" : "DROPOFF LOCATION (B)"}
                    </span>
                    <p className="font-extrabold text-white text-xs sm:text-sm truncate">{driverRideRequest.destName}</p>
                  </div>
                </div>
              </div>

              {/* Real-Time Mini Map Preview */}
              <div className="space-y-1 z-10">
                <span className="text-[8.5px] text-brand-text-muted block uppercase font-black tracking-wider">
                  {slangMode ? "APERCU ITINÉRAIRE GPS" : "GPS ROUTE PREVIEW"}
                </span>
                <div 
                  id="driver-request-map-preview" 
                  className="w-full h-24 sm:h-28 rounded-2xl overflow-hidden border border-brand-gold/40 bg-brand-input/60 relative z-10"
                />
              </div>

              {/* Fare & Payment Badge */}
              <div className="flex justify-between items-center bg-brand-gold/10 border border-brand-gold/40 p-3 rounded-2xl text-xs z-10">
                <div>
                  <p className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider">{slangMode ? "Mode de Paiement" : "Payment Method"}</p>
                  <div className="mt-0.5">{getPaymentBadge(driverRideRequest.payment)}</div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider">{slangMode ? "Gain Estimé" : "Fare Payout"}</p>
                  <strong className="text-brand-gold text-base sm:text-lg font-black font-mono">
                    {driverRideRequest.fare.toLocaleString('fr-FR')} FCFA
                  </strong>
                </div>
              </div>

              {/* Accept & Decline Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1 z-10">
                <button
                  onClick={handleDeclineRequest}
                  className="w-full py-3.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  ✕ {slangMode ? "Refuser" : "Decline"}
                </button>
                <button
                  onClick={handleAcceptRequest}
                  className="w-full py-3.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 border border-emerald-300/40 animate-pulse"
                >
                  ✓ {slangMode ? "Accepter" : "Accept Ride"}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
