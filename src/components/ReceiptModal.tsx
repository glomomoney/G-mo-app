import { AnimatePresence, motion } from 'motion/react';
import { Check, Star, Download } from 'lucide-react';
import { ParticleExplosion } from './ParticleExplosion';
import { Location, Driver, PaymentMethod, HistoryItem } from '../types';

interface ReceiptModalProps {
  showReceipt: boolean;
  role: 'passenger' | 'driver';
  pickup: Location | null;
  destination: Location | null;
  activeDriver: Driver | null;
  slangMode: boolean;
  transactionId: string | null;
  currentRideWaitingTime: number;
  currentRideWaitingFare: number;
  ridePointsRedeemed: number;
  paymentMethod: PaymentMethod;
  tipAmount: number;
  userRating: number;
  userPraise: string;
  language: 'en' | 'fr';
  rideDistance: number;
  activeFareToCharge: number;
  setTipAmount: (amount: number) => void;
  setUserRating: (rating: number) => void;
  setUserPraise: (praise: string) => void;
  getPaymentBadge: (method: PaymentMethod) => JSX.Element;
  downloadPDFReceipt: (hist: HistoryItem) => void;
  handleSubmitRating: () => void;
}

export default function ReceiptModal({
  showReceipt,
  role,
  pickup,
  destination,
  activeDriver,
  slangMode,
  transactionId,
  currentRideWaitingTime,
  currentRideWaitingFare,
  ridePointsRedeemed,
  paymentMethod,
  tipAmount,
  userRating,
  userPraise,
  language,
  rideDistance,
  activeFareToCharge,
  setTipAmount,
  setUserRating,
  setUserPraise,
  getPaymentBadge,
  downloadPDFReceipt,
  handleSubmitRating,
}: ReceiptModalProps) {
  return (
    <AnimatePresence>
      {showReceipt && role === 'passenger' && pickup && destination && activeDriver && (
        <div className="fixed inset-0 bg-brand-midnight/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4" id="receipt-modal">
          <ParticleExplosion particleCount={75} />
          <motion.div
            initial={{ scale: 0.65, opacity: 0, y: 50, rotateX: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="bg-brand-deep border border-brand-gold/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-white font-sans relative z-[2001]"
          >
            <div className="p-5 text-center border-b border-brand-input/40 bg-gradient-to-b from-brand-gold/15 via-emerald-500/10 to-transparent space-y-2 relative overflow-hidden">
              <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0.2, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-brand-gold/30 blur-md"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 18, delay: 0.15 }}
                  className="w-12 h-12 bg-gradient-to-tr from-brand-gold via-amber-400 to-yellow-300 text-brand-midnight rounded-full flex items-center justify-center shadow-xl shadow-brand-gold/40 relative z-10"
                >
                  <Check size={26} className="stroke-[3.5] text-brand-midnight" />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.35 }}
              >
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full mb-1 tracking-wider shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{slangMode ? "🎉 Trajet Réussi & Terminé !" : "🎉 Trip Completed Successfully!"}</span>
                </div>
                <h3 className="text-base font-black tracking-wide text-white">{slangMode ? "Reçu Officiel Wanda" : "Official Wanda Receipt"}</h3>
                <p className="text-[10px] text-brand-gold font-mono font-bold uppercase tracking-wider">
                  {transactionId}
                </p>
              </motion.div>
            </div>

            {/* Receipt Body */}
            <div className="p-5 space-y-4">
              <div className="space-y-2 border-b border-brand-input pb-3.5 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Ramassage (A) :</span>
                  <strong className="text-white text-right max-w-[170px] truncate">{pickup.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Dépôt (B) :</span>
                  <strong className="text-white text-right max-w-[170px] truncate">{destination.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Distance :</span>
                  <strong className="text-white">{rideDistance} KM</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Tarif de base :</span>
                  <strong className="text-white">{activeFareToCharge.toLocaleString('fr-FR')} FCFA</strong>
                </div>
                {currentRideWaitingTime > 0 && (
                  <div className="flex justify-between text-brand-gold bg-brand-gold/5 p-1 rounded border border-brand-gold/15">
                    <span>{slangMode ? "Frais d'attente :" : "Waiting Fee :"} ({Math.floor(currentRideWaitingTime / 60)}m {currentRideWaitingTime % 60}s)</span>
                    <strong>+{currentRideWaitingFare.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                )}
                {ridePointsRedeemed > 0 && (
                  <div className="flex justify-between text-indigo-400 bg-indigo-500/5 p-1 rounded border border-indigo-500/15">
                    <span>{slangMode ? "Réduction Wanda Points :" : "Wanda Points Discount :"} ({ridePointsRedeemed} pts)</span>
                    <strong>-{(ridePointsRedeemed * 100).toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                )}
                {paymentMethod === 'wallet' && tipAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 bg-emerald-500/5 p-1 rounded border border-emerald-500/15">
                    <span>{slangMode ? "Pourboire (Chauffeur) :" : "Driver Tip :"}</span>
                    <strong>+{tipAmount.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Payement :</span>
                  {getPaymentBadge(paymentMethod)}
                </div>

                {/* Highlighted Wanda Points Earned Banner */}
                {(() => {
                  const pointsEarned = paymentMethod === 'wallet' ? 1 : 0;
                  return pointsEarned > 0 ? (
                    <div className="mt-1.5 flex justify-between items-center text-[10.5px] text-indigo-300 bg-indigo-500/10 px-2.5 py-1.5 rounded-xl border border-indigo-500/20 font-bold">
                      <span>⭐ {slangMode ? "Points Wanda gagnés (Payement Wallet) :" : "Wanda Points Earned (Wallet Pay) :"}</span>
                      <span>+1 pt (≈ 100 FCFA)</span>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex justify-between items-center text-[10.5px] text-brand-text-muted bg-brand-input/20 px-2.5 py-1.5 rounded-xl border border-brand-input/30 font-medium">
                      <span>⭐ {slangMode ? "Points Wanda (Payement Cash) :" : "Wanda Points (Cash Pay) :"}</span>
                      <span>0 pt ({slangMode ? "Payez par Wallet pour gagner +1 pt" : "Wallet Payment Required"})</span>
                    </div>
                  );
                })()}
              </div>

              {/* Tipping Selector Section - Wallet Only */}
              {paymentMethod === 'wallet' && (
                <div className="bg-brand-input/40 border border-brand-card/85 p-3 rounded-2xl space-y-2.5 text-center">
                  <p className="text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <span>💸</span> {slangMode ? "Laisser un pourboire au djo" : "Add a Tip for Driver"}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 500, 1000, 2000].map((amt) => {
                      const isSelected = tipAmount === amt;
                      return (
                        <button
                          key={amt}
                          onClick={() => setTipAmount(amt)}
                          type="button"
                          className={`py-2 px-1 rounded-xl text-[10px] font-extrabold tracking-tight transition duration-200 cursor-pointer flex flex-col items-center justify-center border ${
                            isSelected
                              ? 'bg-brand-gold text-brand-midnight border-brand-gold shadow-md'
                              : 'bg-brand-card/50 text-brand-text-muted border-brand-input hover:text-white hover:border-brand-text-muted/45'
                          }`}
                        >
                          <span>{amt === 0 ? (slangMode ? "Aucun" : "No Tip") : `+${amt}`}</span>
                          {amt > 0 && <span className="text-[8px] opacity-80">FCFA</span>}
                        </button>
                      );
                    })}
                  </div>
                  {tipAmount > 0 && (
                    <p className="text-[9px] text-emerald-400 font-semibold leading-tight">
                      {slangMode
                        ? `Le djo recevra 100% de tes ${tipAmount.toLocaleString('fr-FR')} FCFA de bonus.`
                        : `Driver receives 100% of your ${tipAmount.toLocaleString('fr-FR')} FCFA bonus.`}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-bold border-b border-brand-input pb-3.5">
                <span className="text-brand-text-muted">{language === 'fr' ? "Montant Total :" : "Total Amount :"}</span>
                <span className="text-base font-black text-brand-gold">{(Math.max(0, activeFareToCharge - (ridePointsRedeemed * 100)) + currentRideWaitingFare + (paymentMethod === 'wallet' ? tipAmount : 0)).toLocaleString('fr-FR')} FCFA</span>
              </div>

              {/* Rating component */}
              <div className="text-center space-y-2.5">
                <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-wider">
                  {language === 'fr' ? "Note ton Chauffeur" : "Rate your Driver"}
                </p>

                <div className="flex justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setUserRating(star)}
                      className="text-xl cursor-pointer hover:scale-110 transition focus:outline-none"
                    >
                      <Star
                        size={20}
                        className={star <= userRating ? 'fill-brand-gold text-brand-gold' : 'text-brand-input'}
                      />
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={userPraise}
                  onChange={(e) => setUserPraise(e.target.value)}
                  placeholder={slangMode ? "Ex: Chauffeur poli, rapide, clim nickel..." : "Feedback..."}
                  className="w-full bg-brand-input border border-brand-card rounded-xl px-3 py-2 text-[11px] text-white text-center focus:outline-none"
                  id="rating-comment-input"
                />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (pickup && destination && activeDriver) {
                      const finalFareToCharge = Math.max(0, activeFareToCharge - (ridePointsRedeemed * 100)) + currentRideWaitingFare + (paymentMethod === 'wallet' ? tipAmount : 0);
                      const currentHist: HistoryItem = {
                        id: transactionId || `hist_${Date.now()}`,
                        date: new Date().toLocaleString(),
                        pickupName: pickup.name,
                        destName: destination.name,
                        fare: finalFareToCharge,
                        driverName: activeDriver.name,
                        vehicleClass: activeDriver.vehicleType ? activeDriver.vehicleType.toUpperCase() : 'COMFORT VIP',
                        paymentMethod: paymentMethod,
                        tipAmount: tipAmount,
                        status: 'completed'
                      };
                      downloadPDFReceipt(currentHist);
                    }
                  }}
                  className="w-full bg-slate-900/90 hover:bg-slate-800 text-brand-gold font-extrabold py-2.5 rounded-2xl text-xs border border-brand-gold/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-md"
                  id="download-receipt-modal-btn"
                >
                  <Download size={14} className="text-brand-gold" />
                  <span>{slangMode ? "Télécharger Reçu PDF Officiel" : "Download Official PDF Invoice"}</span>
                </button>

                <button
                  onClick={handleSubmitRating}
                  className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-3 rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-brand-gold/25"
                  id="submit-rating-btn"
                >
                  Confirm & Close Receipt
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
