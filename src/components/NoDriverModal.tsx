import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Bike, Car, Navigation, ArrowRight, X, Clock, CheckCircle2 } from 'lucide-react';
import { RIDE_CLASSES } from '../data';

interface NoDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestedClassId: string;
  onSelectAlternativeClass: (newClassId: string) => void;
  slangMode?: boolean;
  language?: 'fr' | 'en';
  rideDistance?: number;
  surgeMultiplier?: number;
  classRates?: Record<string, { baseFare: number; perKm: number }>;
}

export default function NoDriverModal({
  isOpen,
  onClose,
  requestedClassId,
  onSelectAlternativeClass,
  slangMode = false,
  language = 'fr',
  rideDistance = 5,
  surgeMultiplier = 1.0,
  classRates
}: NoDriverModalProps) {
  if (!isOpen) return null;

  const isFr = language === 'fr' || slangMode;
  const requestedClass = RIDE_CLASSES.find(c => c.id === requestedClassId) || RIDE_CLASSES[0];
  const alternativeClasses = RIDE_CLASSES.filter(c => c.id !== requestedClassId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-brand-midnight/85 backdrop-blur-md z-[3000] flex items-center justify-center p-4 text-white font-sans" id="no-driver-available-modal">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-brand-deep border-2 border-amber-500/60 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] shadow-amber-500/10 relative"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent p-5 border-b border-amber-500/30 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle size={24} className="text-amber-400 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                  {isFr ? "INDISPONIBILITÉ DE FLOTTE" : "FLEET AVAILABILITY ALERT"}
                </span>
                <h3 className="text-base font-black text-white leading-tight">
                  {isFr 
                    ? `Aucun ${requestedClass.name} disponible` 
                    : `No ${requestedClass.name} Available`
                  }
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-brand-midnight/60 hover:bg-brand-midnight border border-brand-input text-brand-text-muted hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 text-xs text-amber-200/90 leading-relaxed font-medium">
              <p>
                {isFr ? (
                  <>
                    Tous les chauffeurs de la catégorie <strong className="text-white font-extrabold">{requestedClass.name}</strong> sont actuellement occupés ou hors ligne dans votre zone.
                  </>
                ) : (
                  <>
                    All drivers for <strong className="text-white font-extrabold">{requestedClass.name}</strong> are currently busy or offline in your area.
                  </>
                )}
              </p>
              <p className="mt-1 font-bold text-amber-400 text-[11px]">
                {isFr 
                  ? "👉 Veuillez choisir une autre classe disponible ci-dessous pour réserver immédiatement :"
                  : "👉 Please choose an available alternative class below to book instantly:"
                }
              </p>
            </div>

            {/* Alternative Ride Classes Cards */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              <p className="text-[10px] font-black uppercase text-brand-text-muted tracking-wider">
                {isFr ? "Classes disponibles actuellement :" : "Currently Available Classes:"}
              </p>

              {alternativeClasses.map((rc) => {
                const base = classRates?.[rc.id]?.baseFare ?? rc.baseFare;
                const perKm = classRates?.[rc.id]?.perKm ?? rc.perKm;
                const calculatedFare = Math.round((base + (rideDistance * perKm)) * surgeMultiplier);

                return (
                  <div
                    key={rc.id}
                    className="bg-brand-midnight/90 border border-brand-input hover:border-brand-gold/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition group shadow-sm hover:shadow-brand-gold/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center shrink-0 text-xl">
                        {rc.id === 'okada' ? '🏍️' : rc.id === 'keke' ? '🛺' : rc.id === 'ecoride' ? '🚗' : '🚘'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white group-hover:text-brand-gold transition truncate">
                            {rc.name}
                          </h4>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            {isFr ? "Disponible" : "Available"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-brand-text-muted mt-0.5 font-medium">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock size={11} className="text-brand-gold" />
                            ~{rc.eta} mins
                          </span>
                          <span>•</span>
                          <span className="text-slate-300 truncate">{rc.description}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-brand-gold">
                        {calculatedFare.toLocaleString('fr-FR')} FCFA
                      </p>
                      <button
                        onClick={() => {
                          onSelectAlternativeClass(rc.id);
                          onClose();
                        }}
                        className="mt-1 text-[10px] font-black bg-brand-gold hover:bg-yellow-400 text-brand-midnight px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                      >
                        <span>{isFr ? "Réserver" : "Book"}</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-brand-input hover:bg-brand-input text-brand-text-muted hover:text-white font-extrabold text-xs transition cursor-pointer"
              >
                {isFr ? "Fermer & Réessayer" : "Close & Retry"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
