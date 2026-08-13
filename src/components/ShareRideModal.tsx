import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, ShieldCheck } from 'lucide-react';
import { UserProfile, Driver, Location } from '../types';

interface ShareRideModalProps {
  showShareModal: boolean;
  setShowShareModal: (show: boolean) => void;
  setCopied: (copied: boolean) => void;
  copied: boolean;
  slangMode: boolean;
  user: UserProfile | null;
  activeDriver: Driver | null;
  pickup: Location | null;
  destination: Location | null;
  shareUrl: string;
}

export default function ShareRideModal({
  showShareModal,
  setShowShareModal,
  setCopied,
  copied,
  slangMode,
  user,
  activeDriver,
  pickup,
  destination,
  shareUrl,
}: ShareRideModalProps) {
  return (
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 bg-brand-midnight/90 backdrop-blur-sm z-[2500] flex items-center justify-center p-4 text-white font-sans" id="share-ride-modal">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-deep border-2 border-brand-gold/60 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={() => { setShowShareModal(false); setCopied(false); }}
                className="absolute top-3.5 right-3.5 text-brand-text-muted hover:text-white p-1.5 rounded-full hover:bg-brand-input cursor-pointer z-50 transition"
              >
                <X size={18} />
              </button>

              <div className="p-5 bg-brand-gold/10 border-b border-brand-gold/20 text-center space-y-2">
                <span className="w-12 h-12 bg-brand-gold/15 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner animate-pulse">
                  📡
                </span>
                <h3 className="text-sm font-black text-brand-gold tracking-wider uppercase">
                  {slangMode ? "Partager Mon Trajet" : "Share My Ride"}
                </h3>
                <p className="text-[11px] text-brand-text-muted font-semibold leading-relaxed">
                  {slangMode 
                    ? "Génère un lien de suivi en direct sécurisé pour tes proches." 
                    : "Generate an active live-tracking link to share with family or friends."}
                </p>
              </div>

              <div className="p-5 space-y-4">
                {/* Trip Preview details */}
                <div className="bg-brand-card/40 border border-brand-input rounded-xl p-3 space-y-2 text-[10px] font-semibold text-brand-text-muted">
                  <div className="flex justify-between border-b border-brand-input/30 pb-1.5">
                    <span>{slangMode ? "Passager" : "Rider"}: <strong className="text-white">{user?.name}</strong></span>
                    <span>{slangMode ? "Chauffeur" : "Driver"}: <strong className="text-white">{activeDriver?.name}</strong></span>
                  </div>
                  <div className="space-y-1">
                    <p className="truncate">📍 <span className="text-white font-bold">{pickup?.name}</span></p>
                    <p className="truncate">🏁 <span className="text-white font-bold">{destination?.name}</span></p>
                  </div>
                </div>

                {/* Shared link display box */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-brand-text-muted block">
                    {slangMode ? "Lien de suivi unique" : "Unique Tracking Link"}
                  </span>
                  <div className="flex bg-brand-card border border-brand-input rounded-xl p-1 items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 bg-transparent border-0 text-[10px] font-semibold font-mono text-brand-gold select-all focus:outline-none px-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!shareUrl) return;
                        navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="bg-brand-input hover:bg-brand-card hover:text-white text-brand-gold border border-brand-card p-1.5 rounded-lg transition active:scale-90 cursor-pointer shrink-0"
                      title={slangMode ? "Copier le lien" : "Copy Link"}
                    >
                      {copied ? (
                        <span className="text-[9px] font-black text-emerald-400 px-1">✓ Copied</span>
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Direct Share Channels */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-brand-text-muted block">
                    {slangMode ? "Canaux de partage direct" : "Direct Share Channels"}
                  </span>
                  <a
                    href={shareUrl ? `https://api.whatsapp.com/send?text=${encodeURIComponent(
                      slangMode 
                        ? `Suis mon trajet Wanda 🚕 en direct : ${shareUrl}`
                        : `Track my Wanda ride 🚕 live : ${shareUrl}`
                    )}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.019-5.114-2.875-6.973C16.588 1.91 14.12 1.15 11.517 1.15 6.08 1.15 1.657 5.57 1.653 11.01c0 1.685.443 3.328 1.283 4.766L1.926 21.9l6.23-1.632zM17.47 14.39c-.32-.16-1.89-.93-2.18-1.04-.3-.11-.51-.17-.72.15-.22.3-.83 1.04-1.02 1.25-.19.22-.38.25-.7.09-.32-.16-1.34-.49-2.56-1.58-.95-.84-1.59-1.89-1.78-2.21-.19-.32-.02-.49.14-.65.15-.14.32-.38.49-.57.16-.19.22-.32.32-.54.1-.22.05-.41-.02-.57-.08-.16-.72-1.73-.99-2.37-.26-.63-.52-.54-.72-.55-.19-.01-.41-.01-.63-.01-.22 0-.57.08-.88.41-.31.33-1.2 1.17-1.2 2.85 0 1.68 1.22 3.3 1.39 3.53.17.22 2.4 3.66 5.8 5.13.81.35 1.44.56 1.93.72.82.26 1.56.22 2.15.14.65-.1 1.89-.77 2.16-1.48.27-.71.27-1.31.19-1.44-.08-.13-.3-.21-.62-.37z"/>
                    </svg>
                    <span>{slangMode ? "Partager sur WhatsApp" : "Share on WhatsApp"}</span>
                  </a>
                </div>

                <div className="bg-brand-card/60 p-3 rounded-xl flex gap-2 text-[10px] leading-relaxed text-brand-text-muted font-medium border border-brand-input">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    {slangMode 
                      ? "Le lien s'actualise toutes les 2 secondes pour montrer ton trajet précis." 
                      : "The link refreshes automatically to reflect your real-time coordinates."}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}
