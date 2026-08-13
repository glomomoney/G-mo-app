import { motion, AnimatePresence } from 'motion/react';
import { MicOff, Volume2, PhoneOff, Phone } from 'lucide-react';
import { CallState } from '../hooks/useCallState';
import { UserRole, Driver, DriverRideRequest, UserProfile } from '../types';

interface CallOverlayProps {
  callState: CallState;
  slangMode: boolean;
  role: UserRole;
  activeDriver: Driver | null;
  language: 'en' | 'fr';
  driverRideRequest: DriverRideRequest | null;
  user: UserProfile | null;
  callDuration: number;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isSpeaker: boolean;
  setIsSpeaker: (speaker: boolean) => void;
  declineInAppCall: () => void;
  answerInAppCall: () => void;
  endInAppCall: () => void;
}

export default function CallOverlay({
  callState,
  slangMode,
  role,
  activeDriver,
  language,
  driverRideRequest,
  user,
  callDuration,
  isMuted,
  setIsMuted,
  isSpeaker,
  setIsSpeaker,
  declineInAppCall,
  answerInAppCall,
  endInAppCall,
}: CallOverlayProps) {
  return (
      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-b from-brand-midnight via-brand-card to-brand-midnight border-2 border-brand-gold/40 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between min-h-[480px] text-white relative overflow-hidden my-auto"
            >
              {/* Elegant ambient glow background */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none"></div>

              {/* Header Status */}
              <div className="text-center w-full z-10">
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold bg-brand-gold/10 px-3.5 py-1.5 rounded-full border border-brand-gold/30 shadow-md">
                  WANDA IN-APP CALL
                </span>
                <h3 className="text-sm font-black text-white mt-3 tracking-wide">
                  {callState === 'outgoing' && (slangMode ? 'Appel en cours...' : 'Outgoing Call...')}
                  {callState === 'incoming' && (slangMode ? 'Appel Entrant' : 'Incoming Call')}
                  {callState === 'active' && (slangMode ? 'Appel Actif' : 'Active Call')}
                </h3>
              </div>

              {/* Calling Avatar/Logo Pulsing animation */}
              <div className="flex flex-col items-center gap-4 my-auto z-10">
                <div className="relative">
                  {/* Multiple pulsing rings */}
                  {(callState === 'outgoing' || callState === 'incoming') && (
                    <>
                      <div className="absolute inset-0 bg-brand-gold/30 rounded-full animate-ping scale-125"></div>
                      <div className="absolute inset-0 bg-brand-gold/20 rounded-full animate-ping scale-150"></div>
                    </>
                  )}
                  {callState === 'active' && (
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-pulse scale-125"></div>
                  )}

                  <div className="relative w-28 h-28 rounded-full bg-brand-deep border-4 border-brand-gold p-1 flex items-center justify-center shadow-2xl shadow-brand-gold/30">
                    <img
                      src={
                        role === 'passenger'
                          ? (activeDriver?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
                          : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
                      }
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">
                    {role === 'passenger'
                      ? (activeDriver?.name || (language === 'fr' ? 'Chauffeur Wanda' : 'Wanda Driver'))
                      : (driverRideRequest?.passengerName || user?.name || 'Passager Client')}
                  </h4>
                  <p className="text-xs text-brand-gold font-bold mt-1 uppercase tracking-wider">
                    {role === 'passenger'
                      ? `${language === 'fr' ? 'Chauffeur' : 'Driver'} (${(activeDriver?.vehicleType || activeDriver?.vehicleModel || 'TAXI').toUpperCase()})`
                      : (slangMode ? 'Client Passager Wanda' : 'Wanda Passenger')}
                  </p>
                </div>

                {/* Duration indicator or Ringing Waveform */}
                {callState === 'active' ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-mono text-2xl font-black text-brand-gold">
                      {Math.floor(callDuration / 60).toString().padStart(2, '0')}:
                      {(callDuration % 60).toString().padStart(2, '0')}
                    </span>
                    {/* Animated sound waves */}
                    <div className="flex items-center gap-1.5 h-5 mt-1">
                      {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((val, idx) => (
                        <motion.span
                          key={idx}
                          animate={{ height: ['4px', `${val * 4}px`, '4px'] }}
                          transition={{ duration: 0.8 + idx * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                          className="w-1 bg-brand-gold rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-brand-text-muted animate-pulse font-medium">
                    {slangMode ? "Connexion sécurisée en cours..." : "Securing encrypted connection..."}
                  </p>
                )}
              </div>

              {/* Calling Controls */}
              <div className="w-full space-y-4 z-10">
                {/* Speaker & Mute Buttons */}
                {callState === 'active' && (
                  <div className="flex justify-center gap-6 mb-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        isMuted 
                          ? 'bg-brand-gold text-brand-midnight border-brand-gold' 
                          : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'
                      }`}
                    >
                      <MicOff size={20} />
                    </button>
                    <button
                      onClick={() => setIsSpeaker(!isSpeaker)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        isSpeaker 
                          ? 'bg-brand-gold text-brand-midnight border-brand-gold' 
                          : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'
                      }`}
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>
                )}

                {/* Decline, Accept, End Buttons */}
                <div className="w-full">
                  {callState === 'incoming' ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                      {/* Decline Call */}
                      <button
                        onClick={declineInAppCall}
                        className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95 border border-rose-400/30"
                      >
                        <PhoneOff size={18} className="stroke-[2.5]" />
                        <span>{slangMode ? "Refuser" : "Decline"}</span>
                      </button>

                      {/* Answer Call */}
                      <button
                        onClick={answerInAppCall}
                        className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition cursor-pointer active:scale-95 border border-emerald-300/30 animate-pulse"
                      >
                        <Phone size={18} className="stroke-[2.5]" />
                        <span>{slangMode ? "Accepter" : "Accept"}</span>
                      </button>
                    </div>
                  ) : (
                    /* End Call (for outgoing & active states) */
                    <button
                      onClick={endInAppCall}
                      className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95 border border-rose-400/30"
                    >
                      <PhoneOff size={18} className="stroke-[2.5]" />
                      <span>{slangMode ? "Raccrocher" : "End Call"}</span>
                    </button>
                  )}
                </div>

                {/* Background permissions info note */}
                <p className="text-[9.5px] text-brand-text-muted text-center px-2 italic font-medium">
                  ℹ️ {language === 'fr' 
                    ? "Audio chiffré de bout en bout Wanda In-App."
                    : "Wanda In-App encrypted audio connection."}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
