import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';
import { Location } from '../types';

interface SOSDrawerProps {
  showSOS: boolean;
  setShowSOS: (show: boolean) => void;
  setSosAlertTriggered: (triggered: boolean) => void;
  slangMode: boolean;
  sosAlertTriggered: boolean;
  sosCountdown: number;
  pickup: Location | null;
}

export default function SOSDrawer({
  showSOS,
  setShowSOS,
  setSosAlertTriggered,
  slangMode,
  sosAlertTriggered,
  sosCountdown,
  pickup,
}: SOSDrawerProps) {
  return (
      <AnimatePresence>
        {showSOS && (
          <div className="fixed inset-0 bg-brand-midnight/90 backdrop-blur-sm z-[2500] flex items-center justify-center p-4 text-white font-sans" id="sos-modal">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-deep border-2 border-rose-600 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={() => { setShowSOS(false); setSosAlertTriggered(false); }}
                className="absolute top-3.5 right-3.5 text-brand-text-muted hover:text-white p-1.5 rounded-full hover:bg-brand-input cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="p-6 bg-rose-950/20 border-b border-rose-950/40 text-center space-y-2">
                <span className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg shadow-rose-600/35 animate-pulse">
                  🚨
                </span>
                <h3 className="text-base font-black text-rose-500 tracking-wider">SECURE EMERGENCY SOS</h3>
                <p className="text-[11px] text-brand-text-muted font-semibold leading-relaxed">
                  {slangMode ? "Si tu es en danger, déclenche l'alerte pour avertir le centre de Gendarmerie le plus proche à Douala." : "Instantly signal Gendarmerie and dispatch hubs in case of physical threat."}
                </p>
              </div>

              <div className="p-6 space-y-4">
                
                {/* Emergency speed dials */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-brand-text-muted block">Direct Emergency Speed Dials</span>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="tel:113"
                      className="p-3 bg-rose-600 hover:bg-rose-500 rounded-xl text-center font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition"
                    >
                      <span>📞 Dial 113</span>
                      <span className="text-[9px] font-normal uppercase opacity-90">Gendarmerie</span>
                    </a>
                    <a
                      href="tel:117"
                      className="p-3 bg-brand-input hover:bg-brand-card rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center gap-1 border border-rose-950/50 transition"
                    >
                      <span>📞 Dial 117</span>
                      <span className="text-[9px] font-normal uppercase opacity-75">National Police</span>
                    </a>
                  </div>
                </div>

                {/* Threat dispatch trigger */}
                {!sosAlertTriggered ? (
                  <button
                    onClick={() => setSosAlertTriggered(true)}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3.5 rounded-2xl text-xs shadow-lg shadow-rose-600/25 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>⚠️ Broadcast Gendarmerie Threat Alert</span>
                  </button>
                ) : (
                  <div className="bg-rose-950/30 border border-rose-900 rounded-xl p-4 text-center space-y-2 animate-pulse">
                    <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-wide block">Broadcasting Live Coordinates...</span>
                    {sosCountdown > 0 ? (
                      <p className="text-white text-xs font-semibold">
                        Locking coordinate handshake in <strong className="text-rose-500 text-sm font-black font-mono">{sosCountdown}s</strong>...
                      </p>
                    ) : (
                      <p className="text-emerald-400 text-xs font-black">
                        ✓ SECURE SOS SHIFT BROADCAST SENT SUCCESSFULLY TO CENTRAL CLOUD SYSTEM.
                      </p>
                    )}
                    <button
                      onClick={() => setSosAlertTriggered(false)}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer font-bold block mx-auto mt-2"
                    >
                      Cancel Dispatch
                    </button>
                  </div>
                )}

                <div className="bg-brand-card/60 p-3 rounded-xl flex gap-2 text-[10px] leading-relaxed text-brand-text-muted font-medium border border-brand-input">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    Your live GPS coordinates **({pickup?.lat.toFixed(4)}, {pickup?.lng.toFixed(4)})** and ride details are secure.
                  </span>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}
