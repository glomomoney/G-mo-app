import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Navigation, Bike, Car, CheckCircle, Clock, DollarSign, Star, MessageSquare, Loader2,
  CreditCard, X, Compass, ArrowRight, ShieldCheck, Share2, Download, RotateCcw, Gift,
  ChevronDown, ChevronUp, ArrowUpDown, Ruler, Gauge, WifiOff
} from 'lucide-react';
import { LiveCountdownTimer } from '../components/LiveCountdownTimer';
import WalletCard from '../components/WalletCard';
import { RIDE_CLASSES, getDistanceKm } from '../data';
import { getTailwindColorForName } from '../utils/vehicleColor';
import {
  Location, RideStatus, Driver, PaymentMethod, Message, HistoryItem, Transaction, SystemSettings
} from '../types';

interface PassengerBookingScreenProps {
  slangMode: boolean;
  activeTab: 'booking' | 'wallet' | 'history';
  setActiveTab: (tab: 'booking' | 'wallet' | 'history') => void;
  showTabBalance: boolean;
  setShowTabBalance: React.Dispatch<React.SetStateAction<boolean>>;
  passengerWallet: number;
  pickup: Location | null;
  destination: Location | null;
  setDestination: (loc: Location | null) => void;
  setSearchModalType: (type: 'pickup' | 'destination' | null) => void;
  setSearchQuery: (q: string) => void;
  geolocateCurrentPosition: (onDone?: (location: Location) => void) => void;
  activeCityLocations: Location[];
  currentCity: string;
  showPromoBanner: boolean;
  setShowPromoBanner: (show: boolean) => void;
  systemSettings: SystemSettings;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  rideDistance: number;
  finalFareToPay: number;
  triggerSOS: () => void;
  handleBookRide: () => void;
  rideStatus: RideStatus;
  walletPrice: number;
  cashPrice: number;
  handleCancelBooking: () => void;
  activeDriver: Driver | null;
  driverLoc: { lat: number; lng: number } | null;
  etaMinutes: number;
  etaStatusText: string;
  waitingTime: number;
  currentRideWaitingFare: number;
  activeFareToCharge: number;
  isProgressExpanded: boolean;
  setIsProgressExpanded: (expanded: boolean) => void;
  summaryMetricMode: 'time' | 'distance';
  setSummaryMetricMode: (mode: 'time' | 'distance') => void;
  setShowChat: (show: boolean) => void;
  messages: Message[];
  setShowShareModal: (show: boolean) => void;
  showCallDropdown: boolean;
  setShowCallDropdown: (show: boolean) => void;
  startInAppCall: (sender: 'passenger' | 'driver') => void;
  receiveInAppCall: (sender: 'passenger' | 'driver') => void;
  transactions: Transaction[];
  handlePassengerTopUp: (amount: number, method: 'momo_mtn' | 'orange_money') => void;
  passengerPoints: number;
  isOnline: boolean;
  history: HistoryItem[];
  setHistory: (history: HistoryItem[]) => void;
  historySortOrder: 'recent' | 'oldest';
  setHistorySortOrder: React.Dispatch<React.SetStateAction<'recent' | 'oldest'>>;
  getPaymentBadge: (method: PaymentMethod) => React.JSX.Element;
  handleRebook: (hist: HistoryItem) => void;
  downloadPDFReceipt: (hist: HistoryItem) => void;
}

export default function PassengerBookingScreen(props: PassengerBookingScreenProps) {
  const {
    slangMode, activeTab, setActiveTab, showTabBalance, setShowTabBalance, passengerWallet,
    pickup, destination, setDestination, setSearchModalType, setSearchQuery, geolocateCurrentPosition,
    activeCityLocations, currentCity, showPromoBanner, setShowPromoBanner, systemSettings,
    selectedClassId, setSelectedClassId, paymentMethod, setPaymentMethod, rideDistance, finalFareToPay,
    triggerSOS, handleBookRide, rideStatus, walletPrice, cashPrice, handleCancelBooking, activeDriver,
    driverLoc, etaMinutes, etaStatusText, waitingTime, currentRideWaitingFare, activeFareToCharge,
    isProgressExpanded, setIsProgressExpanded, summaryMetricMode, setSummaryMetricMode, setShowChat,
    messages, setShowShareModal, showCallDropdown, setShowCallDropdown, startInAppCall, receiveInAppCall,
    transactions, handlePassengerTopUp, passengerPoints, isOnline, history, setHistory, historySortOrder,
    setHistorySortOrder, getPaymentBadge, handleRebook, downloadPDFReceipt,
  } = props;

  return (
            <div className="flex flex-col flex-1 p-3.5 sm:p-4 space-y-3.5">
              
              {/* Tab selector */}
              {(rideStatus === 'idle' || rideStatus === 'searching') && (
                <div className="flex border-b border-brand-card/80 pb-1.5 gap-1 text-xs">
                  <button
                    onClick={() => setActiveTab('booking')}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer ${activeTab === 'booking' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    {slangMode ? "Course" : "Book Ride"}
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('wallet');
                      setShowTabBalance(prev => !prev);
                    }}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1 ${activeTab === 'wallet' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    Wallet
                    <span 
                      className="text-[9px] bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded-full font-black cursor-pointer hover:bg-brand-gold/20 transition-colors animate-pulse"
                      title={slangMode ? "Cliquer pour afficher/masquer" : "Click to show/hide balance"}
                    >
                      {showTabBalance ? `${passengerWallet.toLocaleString('fr-FR')} XAF` : '•••• XAF'}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer ${activeTab === 'history' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    {slangMode ? "Historique" : "Past Rides"}
                  </button>
                </div>
              )}

              {/* BOOKING TAB */}
              {activeTab === 'booking' && (
                <>
                  {rideStatus === 'idle' && (
                    <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-3.5">
                        
                        {/* YANGO UX PATTERN - STEP 1: PROMINENT "WHERE TO?" SEARCH BAR & QUICK DESTINATION CHIPS */}
                        {!destination ? (
                          <div className="space-y-3">
                            {/* PROMINENT LIGHT ROUNDED "WHERE TO?" SEARCH BAR (YANGO STYLE) */}
                            <button
                              type="button"
                              onClick={() => { setSearchModalType('destination'); setSearchQuery(''); }}
                              className="w-full bg-white text-slate-900 hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 shadow-xl flex items-center justify-between transition-all transform hover:scale-[1.005] active:scale-[0.995] cursor-pointer group"
                              id="where-to-search-bar"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-amber-400/25 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-400 group-hover:text-slate-900 transition-colors">
                                  <Car size={20} className="stroke-[2.5]" />
                                </div>
                                <div className="text-left min-w-0">
                                  <span className="block text-[8.5px] uppercase font-mono tracking-widest text-slate-500 font-black">
                                    {slangMode ? "DESTINATION" : "DESTINATION"}
                                  </span>
                                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight block truncate">
                                    {slangMode ? "Où allez-vous ?" : "Where to?"}
                                  </span>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-amber-400 group-hover:text-slate-900 transition-colors shrink-0 shadow-sm">
                                <ArrowRight size={16} className="stroke-[2.5]" />
                              </div>
                            </button>

                            {/* Single Clean Pickup Bar under "Where to?" */}
                            <div className="bg-brand-card/40 border border-brand-card/80 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                              <button
                                type="button"
                                onClick={() => { setSearchModalType('pickup'); setSearchQuery(''); }}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                              >
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[8.5px] uppercase font-mono tracking-wider text-brand-text-muted font-bold">
                                    {slangMode ? "POINT DE DÉPART (AUTO-DÉTECTÉ)" : "PICKUP (AUTO-DETECTED)"}
                                  </p>
                                  <p className="text-xs font-bold text-white truncate group-hover:text-brand-gold transition-colors">
                                    {pickup ? pickup.name : (slangMode ? 'Position GPS Actuelle' : 'Current GPS Location')}
                                  </p>
                                </div>
                              </button>
                              <button 
                                onClick={() => geolocateCurrentPosition()}
                                className="text-[10px] bg-brand-input hover:bg-brand-card border border-brand-card text-brand-gold font-bold px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                                title={slangMode ? "Recentrer GPS" : "Re-center GPS"}
                              >
                                🎯 GPS
                              </button>
                            </div>

                            {/* FREQUENT & RECENT DESTINATIONS CHIPS */}
                            <div className="space-y-2 pt-1">
                              <span className="text-[9.5px] font-black uppercase text-brand-text-muted tracking-wider block">
                                📍 {slangMode ? "DESTINATIONS POPULAIRES" : "POPULAR DESTINATIONS"}
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                {activeCityLocations.slice(1, 5).map((loc) => (
                                  <button
                                    key={loc.name}
                                    onClick={() => setDestination(loc)}
                                    className="p-2.5 bg-brand-card/40 hover:bg-brand-card border border-brand-input hover:border-brand-gold/40 rounded-xl text-left transition cursor-pointer flex items-center gap-2 group"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-brand-input flex items-center justify-center text-brand-gold group-hover:bg-brand-gold group-hover:text-brand-midnight transition-colors shrink-0">
                                      <Navigation size={13} className="rotate-45" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-white truncate">{loc.name}</p>
                                      <p className="text-[8.5px] text-brand-text-muted font-semibold truncate">{currentCity}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* SMALL DISMISSIBLE PROMO CARD */}
                            {showPromoBanner && systemSettings.topupPromoActive && (
                              <div className="bg-gradient-to-r from-brand-gold/15 via-brand-card to-brand-midnight border border-brand-gold/30 rounded-2xl p-3 flex items-center justify-between text-xs gap-2 shrink-0 shadow-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="p-1.5 rounded-xl bg-brand-gold/20 text-brand-gold shrink-0">
                                    <Gift size={14} />
                                  </div>
                                  <div className="min-w-0 leading-snug">
                                    <span className="text-[9px] font-black uppercase text-brand-gold tracking-wider block">
                                      🎁 {slangMode ? "WANDA PROMO !" : "WANDA PROMO !"}
                                    </span>
                                    <span className="text-[10px] text-brand-text-muted font-medium truncate block">
                                      Paye par Wallet = <strong className="text-brand-gold">-15% sur tes courses</strong>
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => setActiveTab('wallet')}
                                    className="bg-brand-gold hover:bg-white text-brand-midnight text-[9px] font-black px-2 py-1 rounded-lg transition cursor-pointer"
                                  >
                                    {slangMode ? "RECHARGER" : "TOP UP"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowPromoBanner(false);
                                      localStorage.setItem('wanda_topup_promo_dismissed', 'true');
                                    }}
                                    className="text-brand-text-muted hover:text-white p-1 cursor-pointer"
                                    title="Fermer"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* YANGO UX PATTERN - STEP 2: RIDE CLASS + DUAL PRICING (WALLET VS CASH) SELECTION */
                          <div className="space-y-3 animate-fade-in">
                            
                            {/* Compact Route Summary Bar */}
                            <div className="bg-brand-card/40 border border-brand-card/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                <span className="font-extrabold text-white truncate">{pickup?.name.split('(')[0]}</span>
                                <span className="text-brand-text-muted font-bold">→</span>
                                <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0" />
                                <span className="font-extrabold text-brand-gold truncate">{destination?.name.split('(')[0]}</span>
                              </div>
                              <button
                                onClick={() => setDestination(null)}
                                className="text-[10px] text-brand-text-muted hover:text-white font-bold underline cursor-pointer shrink-0 ml-2"
                              >
                                {slangMode ? "Changer" : "Edit"}
                              </button>
                            </div>

                            {/* Route Distance & Duration Pill */}
                            <div className="flex items-center justify-between px-3 py-1.5 bg-brand-input/40 border border-brand-card rounded-xl text-[10px] text-brand-text-muted font-semibold">
                              <span>🏁 {rideDistance} KM</span>
                              <span>🕒 {Math.round(rideDistance * 1.5) + 3} mins</span>
                              {/* Subtle Traffic Delay Badge */}
                              <span className="text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                                🚦 {slangMode ? "Trafic normal" : "Normal traffic"}
                              </span>
                            </div>

                            {/* DUAL PRICING TOGGLE (WALLET VS CASH) */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] font-black uppercase text-brand-text-muted tracking-wider">
                                <span>{slangMode ? "MODE DE PAIEMENT" : "PAYMENT METHOD"}</span>
                              </div>
                              <div className="grid grid-cols-2 bg-brand-input border border-brand-card/80 p-1 rounded-xl gap-1">
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod('wallet')}
                                  className={`py-1.5 px-2 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${paymentMethod === 'wallet' ? 'bg-brand-gold text-brand-midnight shadow' : 'text-brand-text-muted hover:text-white'}`}
                                >
                                  <span>💰 Wallet</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod('cash')}
                                  className={`py-1.5 px-2 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white shadow' : 'text-brand-text-muted hover:text-white'}`}
                                >
                                  <span>💵 Cash</span>
                                </button>
                              </div>
                            </div>

                            {/* RIDE CLASS CARDS LIST */}
                            <div className="space-y-2 py-1">
                              {RIDE_CLASSES.map((rc) => {
                                const clsBaseFare = systemSettings.classRates?.[rc.id]?.baseFare ?? rc.baseFare;
                                const clsPerKm = systemSettings.classRates?.[rc.id]?.perKm ?? rc.perKm;
                                const rcBaseFare = Math.round((clsBaseFare + (rideDistance * clsPerKm)) * systemSettings.surgeMultiplier);
                                const rcWalletFare = Math.round(rcBaseFare * 0.85);
                                const isSelected = selectedClassId === rc.id;

                                return (
                                  <div
                                    key={rc.id}
                                    onClick={() => setSelectedClassId(rc.id)}
                                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${isSelected ? 'bg-brand-gold/10 border-brand-gold shadow-md' : 'bg-brand-card/40 border-brand-input hover:bg-brand-card/60'}`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-brand-gold text-brand-midnight' : 'bg-brand-input text-brand-text-muted'}`}>
                                        {rc.icon === 'Bike' && <Bike size={18} />}
                                        {rc.icon === 'Tricycle' && <span className="text-lg font-bold">🛺</span>}
                                        {rc.icon === 'Car' && <Car size={18} />}
                                        {rc.icon === 'Suv' && <span className="text-lg font-bold">🚘</span>}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-black text-white truncate">{rc.name}</p>
                                        <p className="text-[9.5px] text-brand-text-muted font-semibold truncate">{rc.eta} min • {rc.description}</p>
                                      </div>
                                    </div>

                                    {/* Both Actual Prices Displayed in FCFA (Wallet vs Cash) */}
                                    <div className="text-right shrink-0 flex flex-col justify-center items-end space-y-0.5">
                                      {/* Wallet Price - Emphasized & Bold */}
                                      <div className="flex items-center justify-end gap-1 font-mono">
                                        <span className="text-[9px] uppercase font-black text-brand-gold tracking-tight">Wallet:</span>
                                        <span className={`font-mono font-black ${paymentMethod === 'wallet' ? 'text-brand-gold text-xs sm:text-sm' : 'text-emerald-400 text-xs'}`}>
                                          {rcWalletFare.toLocaleString('fr-FR')} FCFA
                                        </span>
                                      </div>
                                      {/* Cash Price - Clearly Readable Actual Amount */}
                                      <div className="flex items-center justify-end gap-1 font-mono">
                                        <span className="text-[9px] uppercase font-bold text-brand-text-muted tracking-tight">Cash:</span>
                                        <span className={`font-mono font-bold ${paymentMethod === 'cash' ? 'text-white text-xs' : 'text-slate-300 text-[10.5px]'}`}>
                                          {rcBaseFare.toLocaleString('fr-FR')} FCFA
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                          </div>
                        )}

                      </div>

                      {/* CONFIRMation & SOS BUTTONS FOOTER */}
                      <div className="pt-2 border-t border-brand-card/80 flex items-center gap-2 shrink-0">
                        <button
                          onClick={triggerSOS}
                          className="w-10 h-10 rounded-xl bg-rose-950/40 hover:bg-rose-900 border border-rose-900/60 text-rose-400 hover:text-white flex items-center justify-center cursor-pointer transition shrink-0 shadow-sm"
                          title="Sécurité SOS"
                        >
                          <span className="text-xs font-black">🚨</span>
                        </button>

                        {/* Submit Request */}
                        <button
                          onClick={handleBookRide}
                          disabled={!pickup || !destination}
                          className="flex-1 bg-gradient-to-r from-brand-gold via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-brand-gold text-brand-midnight font-black py-2.5 px-3.5 rounded-xl flex items-center justify-between cursor-pointer shadow-md shadow-brand-gold/15 hover:scale-[1.005] active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none"
                          id="book-ride-main-btn"
                        >
                          <span className="text-xs font-black uppercase tracking-wider">
                            {slangMode ? "Commander Wanda" : "Confirm Taxi"}
                          </span>
                          <span className="text-xs font-black font-mono bg-brand-midnight text-brand-gold px-2.5 py-0.5 rounded-lg">
                            {finalFareToPay.toLocaleString('fr-FR')} FCFA
                          </span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* Contacting Drivers Radar Simulation */}
                  {rideStatus === 'searching' && (
                    <div className="flex flex-col items-center justify-center py-10 flex-1 space-y-6">
                      <div className="relative flex items-center justify-center w-32 h-32">
                        <div className="absolute inset-0 bg-brand-gold/15 rounded-full animate-ping"></div>
                        <div className="absolute w-24 h-24 bg-brand-gold/25 rounded-full animate-pulse"></div>
                        <div className="absolute w-16 h-16 bg-brand-gold/35 rounded-full"></div>
                        <div className="relative p-4 bg-brand-gold text-brand-midnight rounded-full z-10 shadow-lg shadow-brand-gold/30">
                          <Loader2 size={26} className="animate-spin" />
                        </div>
                      </div>
                      
                      <div className="text-center space-y-1">
                        <h3 className="text-sm font-extrabold text-white">{slangMode ? "Recherche d'un djo de confiance..." : "Contacting closest drivers..."}</h3>
                        <p className="text-[11px] text-brand-text-muted max-w-xs leading-normal font-medium">
                          {slangMode ? "On scanne les chauffeurs agréés près de toi..." : "Connecting travel path with vetted drivers..."}
                        </p>
                      </div>

                      <div className="bg-brand-card/40 border border-brand-card p-3 rounded-xl w-full text-center">
                        <span className="text-[9px] text-brand-gold font-bold uppercase tracking-wider block">Boarding Ledger Reserved</span>
                        <p className="text-[11px] text-emerald-400 font-mono font-bold mt-1">
                          {paymentMethod === 'wallet' ? `✓ Paid via Wallet (-${walletPrice.toLocaleString('fr-FR')} XAF)` : `✓ Cash Settlement Approved (${cashPrice.toLocaleString('fr-FR')} XAF)`}
                        </p>
                      </div>

                      <button
                        onClick={handleCancelBooking}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline px-4 py-2 border border-rose-950/50 bg-rose-950/20 rounded-xl cursor-pointer"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}

                  {/* Active driver assigned */}
                  {(rideStatus === 'driver_found' || rideStatus === 'arriving' || rideStatus === 'in_progress') && activeDriver && (
                    <div className="flex flex-col flex-1 justify-between space-y-4">
                      
                      {/* Driver Assignee Card */}
                      <div className="bg-brand-card/40 border border-brand-card rounded-2xl p-4 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            rideStatus === 'driver_found' ? 'bg-brand-gold text-brand-midnight' :
                            rideStatus === 'arriving' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                          }`}>
                            {rideStatus === 'driver_found' && (slangMode ? 'Le djo arrive' : 'Driver Heading to You')}
                            {rideStatus === 'arriving' && (slangMode ? 'Le djo est là !' : 'Driver Arrived!')}
                            {rideStatus === 'in_progress' && (slangMode ? 'En route...' : 'Trip in Progress')}
                          </span>
                          <span className="text-[10px] text-brand-text-muted font-mono flex items-center gap-1 font-bold">
                            OTP Boarding Code: <strong className="text-emerald-400 text-xs font-bold">4810</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <img
                            src={activeDriver.avatar}
                            alt={activeDriver.name}
                            className="w-12 h-12 rounded-xl object-cover border border-brand-card"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1">
                            <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                              {activeDriver.name}
                              <span className="flex items-center text-[10px] text-brand-gold font-normal">
                                <Star size={10} className="fill-brand-gold text-brand-gold mr-0.5" />
                                {activeDriver.rating}
                              </span>
                            </h4>
                            {(() => {
                              const displayColor = activeDriver.vehicleColor || 
                                (activeDriver.vehicleModel.toLowerCase().includes('black') || activeDriver.vehicleModel.toLowerCase().includes('noir') ? 'Noir' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('silver') || activeDriver.vehicleModel.toLowerCase().includes('argent') ? 'Silver' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('yellow') || activeDriver.vehicleModel.toLowerCase().includes('jaune') ? 'Jaune' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('red') || activeDriver.vehicleModel.toLowerCase().includes('rouge') ? 'Rouge' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('gray') || activeDriver.vehicleModel.toLowerCase().includes('gris') ? 'Gris' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('white') || activeDriver.vehicleModel.toLowerCase().includes('blanc') ? 'Blanc' : 'Jaune');
                              
                              return (
                                <div className="space-y-1.5 mt-0.5">
                                  <p className="text-[11px] text-brand-text-muted font-medium leading-tight">{activeDriver.vehicleModel}</p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-mono font-black text-brand-midnight bg-brand-gold px-2 py-0.5 rounded shadow-sm border border-brand-gold/60 tracking-wider">
                                      🎫 {activeDriver.vehiclePlate}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-input border border-brand-card text-[10px] font-extrabold text-white">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getTailwindColorForName(displayColor) }} />
                                      {slangMode ? `Couleur: ${displayColor}` : `Color: ${displayColor}`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Miniature Map view for active ride tracking - hidden because the main map is now fully visible and dominant */}
                        {/* 
                        <MiniatureMap
                          pickup={pickup}
                          destination={destination}
                          driverLoc={driverLoc}
                          rideStatus={rideStatus}
                          driverType={selectedClassId}
                          slangMode={slangMode}
                        />
                        */}

                        {/* AC / waiting stats */}
                        <div className="bg-brand-input border border-brand-card/80 p-3.5 rounded-xl space-y-2 text-xs">
                          <div className="space-y-1">
                            <p className="text-brand-text-muted font-bold tracking-wide text-[10px] uppercase">
                              {rideStatus === 'driver_found' && (slangMode ? "Arrivée estimée :" : "ETA to Pickup:")}
                              {rideStatus === 'arriving' && (slangMode ? "Le chauffeur t'attend au point de ramassage :" : "Driver is parked outside!")}
                              {rideStatus === 'in_progress' && (slangMode ? "Destination de dépôt :" : "Dropoff Destination:")}
                            </p>
                            
                            {rideStatus === 'driver_found' ? (
                              <div className="space-y-1.5 w-full">
                                <div className="flex items-center justify-between">
                                  <motion.div 
                                    key={etaMinutes} 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ 
                                      scale: [0.9, 1.05, 1],
                                      opacity: 1,
                                    }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="font-black text-white flex items-center gap-2"
                                  >
                                    <Clock size={16} className="text-brand-gold animate-pulse shrink-0" /> 
                                    <span className="text-brand-gold font-mono font-black text-xl tracking-tight">
                                      <LiveCountdownTimer
                                        driverLoc={driverLoc}
                                        targetLoc={pickup}
                                        etaMinutes={etaMinutes}
                                        slangMode={slangMode}
                                        size="lg"
                                        showLabel={false}
                                      />
                                    </span>
                                  </motion.div>

                                  {/* Pulsing indicator light */}
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold"></span>
                                  </span>
                                </div>

                                {/* Traffic Update Message */}
                                <AnimatePresence mode="wait">
                                  {etaStatusText && (
                                    <motion.div
                                      key={etaStatusText}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: 10 }}
                                      transition={{ duration: 0.3 }}
                                      className="text-[10px] font-bold text-brand-text-muted bg-brand-card/50 border border-brand-input px-2.5 py-1 rounded-lg flex items-center gap-1.5 mt-1"
                                    >
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse shrink-0" />
                                      <span className="truncate">{etaStatusText}</span>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ) : (
                              <p className="font-black text-white flex items-center gap-1.5">
                                {rideStatus === 'arriving' && <><CheckCircle size={12} className="text-emerald-400 animate-bounce" /> {pickup?.name}</>}
                                {rideStatus === 'in_progress' && <><Navigation size={12} className="text-brand-gold rotate-45" /> {destination?.name}</>}
                              </p>
                            )}
                          </div>

                          {rideStatus === 'arriving' && (
                            <div className="bg-amber-500/10 border border-brand-gold/20 p-2 rounded-lg space-y-1 mt-1 text-[11px]">
                              <p className="font-extrabold text-brand-gold flex items-center gap-1.5 animate-pulse">
                                <Clock size={11} />
                                <span>{slangMode ? "Compteur d'attente actif" : "Waiting Timer Active"}</span>
                              </p>
                              <div className="flex justify-between items-center text-[10px] text-brand-text-muted font-bold">
                                <span>{slangMode ? "Temps d'attente :" : "Waiting time:"} <strong className="text-white font-mono">{String(Math.floor(waitingTime / 60)).padStart(2, '0')}:{String(waitingTime % 60).padStart(2, '0')}</strong></span>
                                <span>{slangMode ? "Frais d'attente :" : "Waiting Fee:"} <strong className="text-brand-gold font-mono">+{currentRideWaitingFare.toLocaleString('fr-FR')} FCFA</strong></span>
                              </div>
                              <p className="text-[9px] text-brand-text-muted leading-tight">
                                {waitingTime <= 10 ? (
                                  <span className="text-emerald-400 font-semibold">{slangMode ? "Période de grâce de 10s gratuite en cours." : "10s free grace period is active."}</span>
                                ) : (
                                  <span className="text-brand-gold font-semibold">{slangMode ? "Période de grâce expirée. 100 FCFA/sec de frais d'attente s'appliquent." : "Grace period ended. 100 FCFA/sec waiting surcharge applies."}</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Detailed Ride Summary when trip is in progress */}
                        {rideStatus === 'in_progress' && (() => {
                          const total = (pickup && destination) ? getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng) : 0;
                          const remaining = (driverLoc && destination) ? getDistanceKm(driverLoc.lat, driverLoc.lng, destination.lat, destination.lng) : 0;
                          const progress = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - remaining / total) * 100))) : 0;

                          const radius = 34;
                          const stroke = 4.5;
                          const normalizedRadius = radius - stroke;
                          const circumference = normalizedRadius * 2 * Math.PI;
                          const strokeDashoffset = circumference - (progress / 100) * circumference;

                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4 }}
                              className="bg-brand-card/30 border border-brand-gold/15 rounded-2xl p-3.5 space-y-3 mt-2 shadow-lg"
                              id="passenger-ride-summary-card"
                            >
                              {/* Section Title */}
                              <div className="flex items-center justify-between border-b border-brand-input pb-2">
                                <h5 className="text-[10px] font-black uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                                  <ShieldCheck size={11} className="text-brand-gold animate-pulse" />
                                  {slangMode ? "Résumé de la course" : "Ride Summary Details"}
                                </h5>
                                <span className="text-[9px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-2 py-0.5 rounded-full font-bold">
                                  {slangMode ? "En route" : "On Trip"}
                                </span>
                              </div>

                              {/* Layout side-by-side: Ride details left, Circular progress right */}
                              <div className="flex gap-3 items-stretch">
                                {/* Left Side: Details Column */}
                                <div className="flex-1 space-y-3 min-w-0 flex flex-col justify-between">
                                  {/* Dynamic Ride details Grid */}
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {/* Estimated Fare & Payment Method */}
                                    <div className="bg-brand-input/60 border border-brand-input p-2 rounded-xl flex flex-col justify-between space-y-1">
                                      <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                                        <DollarSign size={10} className="text-brand-gold" />
                                        {slangMode ? "Tarif estimé" : "Estimated Fare"}
                                      </span>
                                      <div className="space-y-0.5">
                                        <p className="font-mono font-black text-brand-gold text-xs sm:text-sm">
                                          {activeFareToCharge.toLocaleString('fr-FR')} FCFA
                                        </p>
                                        <span className="text-[8px] text-white font-extrabold flex items-center gap-0.5 leading-tight truncate">
                                          <CreditCard size={8} className="text-brand-text-muted shrink-0" />
                                          {paymentMethod === 'wallet' ? (slangMode ? "Wanda Wallet (-15%)" : "Wanda Wallet (-15%)") :
                                           paymentMethod === 'momo_mtn' ? "MTN MoMo" :
                                           paymentMethod === 'orange_money' ? "Orange Money" : (slangMode ? "Cash" : "Cash")}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Ride Class details */}
                                    {(() => {
                                      const rc = RIDE_CLASSES.find(c => c.id === selectedClassId) || RIDE_CLASSES[2];
                                      return (
                                        <div className="bg-brand-input/60 border border-brand-input p-2 rounded-xl flex flex-col justify-between space-y-1">
                                          <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Compass size={10} className="text-brand-gold" />
                                            {slangMode ? "Catégorie" : "Service Class"}
                                          </span>
                                          <div className="space-y-0.5">
                                            <p className="font-black text-white text-[10px] truncate flex items-center gap-1">
                                              {rc.id === 'okada' ? <Bike size={10} className="text-brand-gold shrink-0" /> : <Car size={10} className="text-brand-gold shrink-0" />}
                                              {rc.name}
                                            </p>
                                            <p className="text-[8px] text-brand-text-muted leading-tight truncate" title={rc.description}>
                                              {rc.description}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Vehicle Specs specs info inside left pane */}
                                  <div className="bg-brand-midnight/40 border border-brand-input/50 rounded-xl p-2 space-y-1 text-[9px] flex-1 flex flex-col justify-center">
                                    <div className="flex justify-between items-center text-brand-text-muted font-bold uppercase tracking-wider text-[8px]">
                                      <span>{slangMode ? "Infos du véhicule" : "Vehicle Specs"}</span>
                                      <span className="text-brand-gold font-mono">{activeDriver.vehiclePlate}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-white truncate font-extrabold mt-0.5">
                                      <span>{activeDriver.vehicleModel}</span>
                                      <span className="w-1 h-1 rounded-full bg-brand-input shrink-0" />
                                      <span className="text-brand-text-muted font-semibold text-[8px]">
                                        {activeDriver.vehicleColor || "Yellow"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Circular Progress Card */}
                                <div className="w-24 xs:w-28 bg-brand-input/60 border border-brand-input rounded-xl p-2 flex flex-col items-center justify-center space-y-2 shrink-0">
                                  <div className="relative flex items-center justify-center">
                                    {/* Simple custom SVG */}
                                    <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                                      {/* Background track circle */}
                                      <circle
                                        stroke="rgba(255, 211, 133, 0.1)"
                                        fill="transparent"
                                        strokeWidth={stroke}
                                        r={normalizedRadius}
                                        cx={radius}
                                        cy={radius}
                                      />
                                      {/* Glowing active progress circle with fluid framer-motion transition */}
                                      <motion.circle
                                        stroke="#ffd385"
                                        fill="transparent"
                                        strokeWidth={stroke}
                                        strokeLinecap="round"
                                        r={normalizedRadius}
                                        cx={radius}
                                        cy={radius}
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset }}
                                        transition={{
                                          duration: 1.2,
                                          ease: [0.25, 1, 0.5, 1] // Custom fluid easeOutQuint
                                        }}
                                        style={{
                                          strokeDasharray: circumference,
                                          filter: 'drop-shadow(0 0 3px rgba(226, 193, 141, 0.6))'
                                        }}
                                      />
                                    </svg>
                                    
                                    {/* Centered progress text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                                      <span className="text-xs font-black text-brand-gold font-mono">{progress}%</span>
                                      <span className="text-[7px] text-brand-text-muted font-extrabold uppercase mt-0.5">
                                        {slangMode ? "Ok" : "Done"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress summary label */}
                                  <div className="text-center space-y-0.5 border-b border-brand-input/30 pb-1.5 w-full">
                                    <span className="text-[8px] text-brand-text-muted font-bold uppercase tracking-widest block leading-none">
                                      {slangMode ? "Distance" : "Trip"}
                                    </span>
                                    <span className="text-[9px] text-white font-mono font-extrabold block leading-none">
                                      {remaining > 0 ? `${remaining.toFixed(1)} km` : "0 km"}
                                    </span>
                                    <span className="text-[7px] text-brand-gold font-semibold block leading-none">
                                      {slangMode ? "restant" : "remaining"}
                                    </span>
                                  </div>

                                  {/* Live Dynamic ETA Block */}
                                  <div className="text-center space-y-0.5 w-full">
                                    <span className="text-[8px] text-brand-gold font-bold uppercase tracking-widest block leading-none animate-pulse">
                                      {slangMode ? "ETA Estimé" : "ETA"}
                                    </span>
                                    <span className="text-[10px] text-white font-mono font-black block leading-none">
                                      <LiveCountdownTimer
                                        driverLoc={driverLoc}
                                        targetLoc={(rideStatus as RideStatus) === 'driver_found' ? pickup : destination}
                                        etaMinutes={etaMinutes}
                                        slangMode={slangMode}
                                        size="sm"
                                        showLabel={false}
                                      />
                                    </span>
                                    <span className="text-[6.5px] text-brand-text-muted font-bold block leading-none whitespace-normal px-0.5 mt-0.5">
                                      {etaStatusText || (slangMode ? "Trafic normal" : "Normal traffic")}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Footer Driver Specs */}
                              <div className="bg-brand-midnight/60 border-t border-brand-input/30 pt-2 flex justify-between items-center text-[10px] text-brand-text-muted font-semibold px-1">
                                <span>{slangMode ? "Chauffeur assigné :" : "Assigned Driver:"} <strong className="text-white font-extrabold">{activeDriver.name}</strong></span>
                                <span className="flex items-center text-brand-gold font-bold bg-brand-gold/10 px-1.5 py-0.5 rounded-md border border-brand-gold/10">
                                  <Star size={9} className="fill-brand-gold text-brand-gold mr-0.5 shrink-0" />
                                  {activeDriver.rating}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })()}

                        {/* Real-time Journey Progress Bar */}
                        {(() => {
                          if (!pickup || !driverLoc) return null;
                          
                          let label = '';
                          let remainingKm = 0;
                          let progress = 0;
                          let fromName = '';
                          let toName = '';
                          
                          if (rideStatus === 'driver_found') {
                            const initialLat = activeDriver.lat;
                            const initialLng = activeDriver.lng;
                            const total = getDistanceKm(initialLat, initialLng, pickup.lat, pickup.lng);
                            const remaining = getDistanceKm(driverLoc.lat, driverLoc.lng, pickup.lat, pickup.lng);
                            progress = total > 0 ? Math.max(0, Math.min(99, Math.round((1 - remaining / total) * 100))) : 0;
                            remainingKm = remaining;
                            label = slangMode ? "Ramassage du djo" : "Heading to Pickup";
                            fromName = slangMode ? "Chauffeur départ" : "Driver Start";
                            toName = pickup.name;
                          } else if (rideStatus === 'arriving') {
                            progress = 100;
                            remainingKm = 0;
                            label = slangMode ? "Le djo est là !" : "Driver Arrived";
                            fromName = slangMode ? "Chauffeur départ" : "Driver Start";
                            toName = pickup.name;
                          } else if (rideStatus === 'in_progress' && destination) {
                            const total = getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
                            const remaining = getDistanceKm(driverLoc.lat, driverLoc.lng, destination.lat, destination.lng);
                            progress = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - remaining / total) * 100))) : 0;
                            remainingKm = remaining;
                            label = slangMode ? "Course en cours" : "Journey Progress";
                            fromName = pickup.name;
                            toName = destination.name;
                          } else {
                            return null;
                          }

                          // Calculate estimated time in minutes & arrival clock time
                          const calculatedTimeMin = etaMinutes ?? (remainingKm > 0 ? Math.max(1, Math.round(remainingKm * 2.5)) : 1);
                          const now = new Date();
                          const arrivalDate = new Date(now.getTime() + Math.round(calculatedTimeMin * 60 * 1000));
                          const formattedArrivalTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const totalKm = getDistanceKm(pickup.lat, pickup.lng, destination ? destination.lat : pickup.lat, destination ? destination.lng : pickup.lng) || 1;

                          return (
                            <div className="mt-2" id="passenger-trip-progress">
                              {!isProgressExpanded ? (
                                <button
                                  type="button"
                                  onClick={() => setIsProgressExpanded(true)}
                                  className="w-full py-2.5 px-3.5 bg-brand-input/80 hover:bg-brand-input border border-brand-card/80 hover:border-brand-gold/50 rounded-2xl flex items-center justify-between text-xs text-brand-text-muted hover:text-white transition-all cursor-pointer shadow-md group active:scale-98"
                                  title={slangMode ? "Afficher les détails du trajet" : "Show detailed progress bar"}
                                >
                                  <div className="flex items-center gap-2.5 font-extrabold text-[11px] min-w-0">
                                    <div className="w-6.5 h-6.5 rounded-xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                      <Gauge size={13} className="text-brand-gold" />
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-white truncate font-bold">{label}</span>
                                      <span className="font-mono text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2 py-0.5 rounded-md text-[10px] font-black shrink-0">
                                        {progress}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-brand-gold font-black bg-brand-card px-2.5 py-1 rounded-xl border border-brand-input shrink-0">
                                    <span>{calculatedTimeMin <= 0.5 ? "< 1 min" : `${calculatedTimeMin} min`}</span>
                                    <ChevronDown size={13} className="stroke-[2.5]" />
                                  </div>
                                </button>
                              ) : (
                                <div className="bg-brand-input border border-brand-card/80 p-3.5 rounded-2xl space-y-3 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
                                  <div className="flex justify-between items-center pb-2 border-b border-brand-card/60">
                                    <span className="text-brand-text-muted font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                      <span className="inline-block w-2 h-2 rounded-full bg-brand-gold animate-ping" />
                                      {label} ({progress}%)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setIsProgressExpanded(false)}
                                      className="p-1 px-2 text-brand-text-muted hover:text-white bg-brand-card border border-brand-input rounded-xl transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                      title={slangMode ? "Masquer" : "Hide"}
                                    >
                                      <span>{slangMode ? "Masquer" : "Hide"}</span>
                                      <ChevronUp size={13} className="stroke-[2.5]" />
                                    </button>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-brand-text-muted font-black uppercase tracking-wider text-[9px]">
                                        {slangMode ? "PROGRESSION DÉTAILLÉE" : "DETAILED METRIC"}
                                      </span>

                                      {/* Value Badge that smoothly animates between Estimated Time and Estimated Distance */}
                                      <AnimatePresence mode="wait">
                                        {summaryMetricMode === 'time' ? (
                                          <motion.div
                                            key="time-value"
                                            initial={{ opacity: 0, y: -4, scale: 0.92 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.92 }}
                                            transition={{ duration: 0.2 }}
                                            className="font-mono font-black text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2.5 py-1 rounded-lg text-[10px] shadow-sm flex items-center gap-1.5"
                                          >
                                            <Clock size={12} className="text-brand-gold animate-pulse shrink-0" />
                                            <span>
                                              {calculatedTimeMin <= 0.5
                                                ? (slangMode ? "< 1 min (Arrivée)" : "< 1 min (Arriving)")
                                                : `${calculatedTimeMin} min ${slangMode ? "estimé" : "ETA"}`}
                                            </span>
                                            <span className="text-[9px] text-brand-text-muted font-normal border-l border-brand-gold/20 pl-1.5">
                                              ~{formattedArrivalTime}
                                            </span>
                                          </motion.div>
                                        ) : (
                                          <motion.div
                                            key="distance-value"
                                            initial={{ opacity: 0, y: -4, scale: 0.92 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.92 }}
                                            transition={{ duration: 0.2 }}
                                            className="font-mono font-black text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2.5 py-1 rounded-lg text-[10px] shadow-sm flex items-center gap-1.5"
                                          >
                                            <Ruler size={12} className="text-brand-gold shrink-0" />
                                            <span>
                                              {remainingKm.toFixed(1)} km {slangMode ? "restant" : "remaining"}
                                            </span>
                                            <span className="text-[9px] text-brand-text-muted font-normal border-l border-brand-gold/20 pl-1.5">
                                              {(totalKm - remainingKm > 0 ? (totalKm - remainingKm).toFixed(1) : '0.0')}/{totalKm.toFixed(1)} km
                                            </span>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>

                                    {/* Visual Segmented Toggle Switch for Time vs Distance */}
                                    <div className="flex items-center justify-between bg-brand-midnight/80 p-1 rounded-lg border border-brand-card/80">
                                      <span className="text-[9px] font-black uppercase text-brand-text-muted px-1.5 flex items-center gap-1 tracking-wider">
                                        {slangMode ? "AFFICHAGE :" : "SUMMARY METRIC:"}
                                      </span>
                                      <div className="flex bg-brand-deep p-0.5 rounded-md border border-brand-input/40 relative">
                                        <button
                                          type="button"
                                          onClick={() => setSummaryMetricMode('time')}
                                          className={`relative px-2 py-0.5 text-[9.5px] font-extrabold rounded flex items-center gap-1 transition-all z-10 cursor-pointer ${
                                            summaryMetricMode === 'time' ? 'text-brand-midnight font-black' : 'text-brand-text-muted hover:text-white'
                                          }`}
                                        >
                                          {summaryMetricMode === 'time' && (
                                            <motion.div
                                              layoutId="activeSummaryMetricPill"
                                              className="absolute inset-0 bg-brand-gold rounded shadow-sm -z-10"
                                              transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                            />
                                          )}
                                          <Clock size={10} className={summaryMetricMode === 'time' ? 'stroke-[2.5]' : ''} />
                                          <span>{slangMode ? "Temps Estimé" : "Est. Time"}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setSummaryMetricMode('distance')}
                                          className={`relative px-2 py-0.5 text-[9.5px] font-extrabold rounded flex items-center gap-1 transition-all z-10 cursor-pointer ${
                                            summaryMetricMode === 'distance' ? 'text-brand-midnight font-black' : 'text-brand-text-muted hover:text-white'
                                          }`}
                                        >
                                          {summaryMetricMode === 'distance' && (
                                            <motion.div
                                              layoutId="activeSummaryMetricPill"
                                              className="absolute inset-0 bg-brand-gold rounded shadow-sm -z-10"
                                              transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                            />
                                          )}
                                          <Ruler size={10} className={summaryMetricMode === 'distance' ? 'stroke-[2.5]' : ''} />
                                          <span>{slangMode ? "Distance Estimée" : "Est. Distance"}</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Progress bar track */}
                                  <div className="relative w-full h-3 bg-brand-card border border-brand-input rounded-full overflow-visible my-3">
                                    {/* Glowing ambient trail underneath */}
                                    <div className="absolute inset-0 bg-brand-gold/5 rounded-full blur-[1px]"></div>
                                    
                                    {/* Progress track background shimmer line */}
                                    <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white to-transparent animate-[shimmer_2s_infinite]"></div>

                                    {/* Animated active progress fill with dual-layered glowing trail effect */}
                                    <motion.div
                                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-gold/80 via-brand-gold to-yellow-400 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.6)] overflow-hidden"
                                      initial={{ width: '0%' }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ type: "spring", stiffness: 70, damping: 14 }}
                                    >
                                      {/* Framer Motion sweep light particle inside the progress fill */}
                                      {progress > 0 && (
                                        <motion.div
                                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                          animate={{
                                            x: ['-100%', '300%']
                                          }}
                                          transition={{
                                            repeat: Infinity,
                                            duration: 1.8,
                                            ease: "easeInOut"
                                          }}
                                        />
                                      )}
                                    </motion.div>

                                    {/* Background glowing pulse trail radiating behind the moving taxi */}
                                    {progress > 0 && (
                                      <motion.div
                                        className="absolute top-0 h-full bg-gradient-to-r from-transparent to-brand-gold/35 blur-[2px] rounded-full"
                                        initial={{ width: '0%' }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ type: "spring", stiffness: 70, damping: 14 }}
                                      />
                                    )}

                                    {/* Moving taxi icon riding the bar with a pulsing trailing beacon */}
                                    <motion.div
                                      className="absolute -top-1.5 -ml-3 w-6 h-6 bg-brand-gold text-brand-midnight border-2 border-brand-midnight rounded-full flex items-center justify-center shadow-lg cursor-pointer z-10"
                                      animate={{ 
                                        left: `${progress}%`,
                                        scale: [1, 1.08, 1]
                                      }}
                                      transition={{ 
                                        left: { type: "spring", stiffness: 70, damping: 14 },
                                        scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                                      }}
                                      title={slangMode ? "Position du djo" : "Driver Position"}
                                    >
                                      {/* Pulsing glow aura following the taxi */}
                                      <motion.div
                                        className="absolute -inset-1.5 bg-brand-gold/35 rounded-full -z-10 blur-[3px]"
                                        animate={{
                                          scale: [1, 1.4, 1],
                                          opacity: [0.6, 0.1, 0.6]
                                        }}
                                        transition={{
                                          repeat: Infinity,
                                          duration: 1.5,
                                          ease: "easeOut"
                                        }}
                                      />
                                      {/* Small compact taxi svg icon */}
                                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4h14v4zM7.5 14c-.83 0-1.5.67-1.5 1s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm9 0c-.83 0-1.5.67-1.5 1s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
                                      </svg>
                                    </motion.div>
                                  </div>

                                  {/* Progress Track labels */}
                                  <div className="flex justify-between text-[9px] text-brand-text-muted font-bold font-mono gap-4">
                                    <span className="truncate max-w-[130px] hover:text-white transition-colors" title={fromName}>
                                      📍 {fromName}
                                    </span>
                                    <span className="font-extrabold text-brand-gold bg-brand-midnight/60 px-1.5 py-0.5 rounded border border-brand-input/30 shadow-inner shrink-0">
                                      {progress}%
                                    </span>
                                    <span className="truncate max-w-[130px] text-right hover:text-white transition-colors" title={toName}>
                                      🏁 {toName}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Message Driver CTA Button */}
                      <button
                        type="button"
                        onClick={() => setShowChat(true)}
                        className="w-full py-3 px-3.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/40 hover:border-brand-gold text-brand-gold rounded-2xl flex items-center justify-between font-black text-xs transition cursor-pointer active:scale-98 shadow-sm group"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquare size={16} className="text-brand-gold group-hover:scale-110 transition-transform" />
                          <span>{slangMode ? "Tchatter avec le djo" : "Message Driver"}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] bg-brand-gold text-brand-midnight px-2.5 py-0.5 rounded-full font-black">
                          {messages.length > 0 ? `${messages.length} msgs` : (slangMode ? "Ouvrir Chat" : "Open Chat")}
                          <ChevronUp size={12} className="stroke-[3]" />
                        </span>
                      </button>

                      {/* Share My Ride CTA Banner */}
                      <div className="bg-gradient-to-r from-brand-gold/15 to-brand-gold/5 border border-brand-gold/25 rounded-2xl p-3 flex items-center justify-between shadow-sm shrink-0 animate-pulse-subtle">
                        <div className="space-y-0.5">
                          <h5 className="text-[11px] font-black text-brand-gold uppercase tracking-wider flex items-center gap-1">
                            🛡️ {slangMode ? "Sécurise ton voyage" : "Secure Your Journey"}
                          </h5>
                          <p className="text-[10px] text-brand-text-muted font-bold">
                            {slangMode ? "Partage ton trajet live sur WhatsApp" : "Share live tracking link"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowShareModal(true);
                          }}
                          className="bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight text-[11px] font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                        >
                          <Share2 size={12} />
                          <span>{slangMode ? "Partager" : "Share"}</span>
                        </button>
                      </div>

                      {/* Control buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleCancelBooking}
                          className="flex-1 py-3 text-xs bg-brand-card hover:bg-brand-card/80 border border-brand-input text-brand-text-muted hover:text-white font-bold rounded-xl cursor-pointer transition shadow-sm"
                        >
                          Cancel Booking
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
                                  onClick={() => startInAppCall('passenger')}
                                  className="w-full text-left px-2.5 py-2 hover:bg-brand-card rounded-xl text-xs font-black text-white flex items-center gap-2 transition cursor-pointer group"
                                >
                                  <span className="text-base group-hover:scale-110 transition">📞</span>
                                  <div>
                                    <p className="font-extrabold">{slangMode ? "Appeler le chauffeur" : "Call Driver"}</p>
                                    <p className="text-[9px] text-brand-text-muted font-semibold">{slangMode ? "Lancer un appel sortant" : "Start outgoing call"}</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => receiveInAppCall('driver')}
                                  className="w-full text-left px-2.5 py-2 hover:bg-brand-card rounded-xl text-xs font-black text-brand-gold flex items-center gap-2 transition cursor-pointer group"
                                >
                                  <span className="text-base group-hover:scale-110 transition">🔔</span>
                                  <div>
                                    <p className="font-extrabold">{slangMode ? "Simuler un appel entrant" : "Simulate Incoming Call"}</p>
                                    <p className="text-[9px] text-brand-text-muted font-semibold">{slangMode ? "Recevoir l'appel du chauffeur" : "Driver calling you"}</p>
                                  </div>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                    </div>
                  )}
                </>
              )}

              {/* INTEGRATED PASSENGER WALLET CARD */}
              {activeTab === 'wallet' && (
                <WalletCard
                  balance={passengerWallet}
                  onTopUpRequested={handlePassengerTopUp}
                  transactions={transactions.filter(t => t.type === 'topup')}
                  topupPromoActive={systemSettings.topupPromoActive}
                  topupPromoRate={systemSettings.topupPromoRate}
                  slangMode={slangMode}
                  passengerPoints={passengerPoints}
                  isOffline={!isOnline}
                />
              )}

              {/* PAST RIDE HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {/* Service Worker Offline History Badge */}
                  {!isOnline && (
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-2.5 text-amber-200 text-[10px] font-bold shadow-sm animate-fade-in">
                      <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                        <WifiOff size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block font-black uppercase text-[9px] text-amber-400 tracking-wider">
                          {slangMode ? "Mode Hors Ligne (Service Worker)" : "Offline Mode (Service Worker)"}
                        </span>
                        <span className="text-[9.5px] font-semibold text-amber-100/90 block leading-tight">
                          {slangMode
                            ? `Consultation disponible : Vos ${history.length} trajets passés sont enregistrés en toute sécurité.`
                            : `Offline access active: Your ${history.length} past rides are stored securely in local Service Worker cache.`}
                        </span>
                      </div>
                      <span className="bg-amber-500/20 text-amber-300 text-[8px] font-mono font-black px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                        SW CACHE
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-brand-card/20 p-2 rounded-xl border border-brand-input/30">
                    <h3 className="text-[10px] font-black uppercase text-brand-text-muted tracking-wider">
                      {slangMode ? "Journal des Trajets" : "Ride Ledger Logs"}
                    </h3>
                    <div className="flex items-center gap-3">
                      {history.length > 0 && (
                        <button
                          onClick={() => setHistorySortOrder(prev => prev === 'recent' ? 'oldest' : 'recent')}
                          className="flex items-center gap-1 text-[10px] text-brand-gold hover:text-white cursor-pointer font-bold bg-brand-input/60 px-2.5 py-1 rounded-lg border border-brand-gold/20 hover:border-brand-gold/50 transition-all active:scale-95"
                          title={slangMode ? "Trier les trajets" : "Sort Rides"}
                        >
                          <ArrowUpDown size={10} />
                          <span>{historySortOrder === 'recent' ? (slangMode ? "Récent" : "Recent First") : (slangMode ? "Ancien" : "Oldest First")}</span>
                        </button>
                      )}
                      <button
                        onClick={() => setHistory([])}
                        className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer font-bold"
                      >
                        {slangMode ? "Effacer" : "Clear History"}
                      </button>
                    </div>
                  </div>

                  {history.length === 0 ? (
                    <div className="text-center py-10 text-brand-text-muted italic text-xs font-medium">
                      {slangMode ? "Aucun trajet enregistré." : "No previous completed rides."}
                    </div>
                  ) : (
                    (historySortOrder === 'recent' ? history : [...history].reverse()).map((hist) => (
                      <div key={hist.id} className="bg-brand-card/30 border border-brand-card p-3.5 rounded-2xl space-y-3.5 shadow-sm">
                        <div className="flex justify-between items-center text-[9px] text-brand-text-muted font-bold font-mono">
                          <span>{hist.date}</span>
                          {getPaymentBadge(hist.paymentMethod)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-white font-semibold">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0"></span>
                            <p className="truncate">{hist.pickupName}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-white font-semibold">
                            <span className="w-1.5 h-1.5 bg-brand-gold rounded-full shrink-0"></span>
                            <p className="truncate">{hist.destName}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-brand-input/40 pt-2 text-[11px] font-medium">
                          <span className="text-brand-text-muted">{hist.vehicleClass} • {hist.driverName}</span>
                          <span className="font-black text-brand-gold">{hist.fare.toLocaleString('fr-FR')} FCFA</span>
                        </div>

                        {/* Interactive Business Utilities */}
                        <div className="flex gap-2 pt-1 border-t border-brand-input/10">
                          <button
                            type="button"
                            onClick={() => handleRebook(hist)}
                            className="flex-1 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold hover:text-white border border-brand-gold/15 hover:border-brand-gold/45 py-1.5 px-2 rounded-xl text-[9.5px] font-extrabold flex items-center justify-center gap-1 transition active:scale-[0.98] cursor-pointer"
                            title="Instantly rebook this trip"
                          >
                            <RotateCcw size={11.5} />
                            <span>{slangMode ? "Re-booker" : "Re-book"}</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => downloadPDFReceipt(hist)}
                            className="flex-1 bg-slate-900/60 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 py-1.5 px-2 rounded-xl text-[9.5px] font-extrabold flex items-center justify-center gap-1 transition active:scale-[0.98] cursor-pointer"
                            title="Generate and download PDF invoice"
                          >
                            <Download size={11.5} className="text-brand-gold" />
                            <span>{slangMode ? "Télécharger Reçu" : "PDF Receipt"}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
  );
}
