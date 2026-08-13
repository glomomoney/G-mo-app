import { AnimatePresence, motion } from 'motion/react';
import { Check, RotateCcw } from 'lucide-react';
import { ParticleExplosion } from './ParticleExplosion';
import { Location, PaymentMethod, DriverRideRequest, RideStatus, UserRole } from '../types';

interface DriverEarningsModalProps {
  role: UserRole;
  rideStatus: RideStatus;
  pickup: Location | null;
  destination: Location | null;
  driverRideRequest: DriverRideRequest | null;
  paymentMethod: PaymentMethod;
  slangMode: boolean;
  activeFareToCharge: number;
  getPaymentBadge: (method: PaymentMethod) => JSX.Element;
  setRideStatus: (status: RideStatus) => void;
  setDriverRideRequest: (request: DriverRideRequest | null) => void;
  setDriverLoc: (loc: { lat: number; lng: number } | null) => void;
  setShowChat: (show: boolean) => void;
  setCurrentRideWaitingTime: (time: number) => void;
  setCurrentRideWaitingFare: (fare: number) => void;
}

export default function DriverEarningsModal({
  role,
  rideStatus,
  pickup,
  destination,
  driverRideRequest,
  paymentMethod,
  slangMode,
  activeFareToCharge,
  getPaymentBadge,
  setRideStatus,
  setDriverRideRequest,
  setDriverLoc,
  setShowChat,
  setCurrentRideWaitingTime,
  setCurrentRideWaitingFare,
}: DriverEarningsModalProps) {
  return (
    <AnimatePresence>
      {role === 'driver' && rideStatus === 'completed' && (
        <div className="fixed inset-0 bg-brand-midnight/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4" id="driver-completed-modal">
          <ParticleExplosion particleCount={60} />
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="bg-brand-deep border border-brand-gold/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-white font-sans relative z-[2001]"
          >
            <div className="p-5 text-center border-b border-brand-input/40 bg-gradient-to-b from-emerald-500/15 via-brand-gold/10 to-transparent space-y-2">
              <div className="w-12 h-12 bg-emerald-500 text-brand-midnight rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <Check size={26} className="stroke-[3.5]" />
              </div>
              <span className="inline-block bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider border border-emerald-500/30">
                {slangMode ? "🎉 Course Terminée !" : "🎉 Trip Completed!"}
              </span>
              <h3 className="text-base font-black text-white">{slangMode ? "Résumé des Gains Chauffeur" : "Driver Earnings Summary"}</h3>
            </div>

            <div className="p-5 space-y-4 text-xs font-semibold">
              <div className="space-y-2.5 bg-brand-input/40 p-3 rounded-2xl border border-brand-card/80">
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Ramassage (A) :</span>
                  <strong className="text-white text-right max-w-[170px] truncate">{pickup?.name || driverRideRequest?.pickupName || "Lieu d'embarquement"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Dépôt (B) :</span>
                  <strong className="text-white text-right max-w-[170px] truncate">{destination?.name || driverRideRequest?.destName || "Destination"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Mode de paiement :</span>
                  {getPaymentBadge(paymentMethod)}
                </div>
              </div>

              <div className="bg-brand-gold/10 border border-brand-gold/30 p-3.5 rounded-2xl text-center space-y-1">
                <span className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider block">
                  {slangMode ? "Votre Gain Net (Portefeuille Wanda)" : "Your Net Payout"}
                </span>
                <p className="text-2xl font-black text-brand-gold font-mono">
                  {activeFareToCharge.toLocaleString('fr-FR')} FCFA
                </p>
              </div>

              <button
                onClick={() => {
                  setRideStatus('idle');
                  setDriverRideRequest(null);
                  setDriverLoc(null);
                  setShowChat(false);
                  setCurrentRideWaitingTime(0);
                  setCurrentRideWaitingFare(0);
                }}
                className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-3 rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-brand-gold/25 flex items-center justify-center gap-2"
                id="driver-back-online-btn"
              >
                <RotateCcw size={14} />
                <span>{slangMode ? "Prêt pour la prochaine course" : "Back Online for Next Ride"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
