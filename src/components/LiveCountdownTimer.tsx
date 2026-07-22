import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Zap, MapPin } from 'lucide-react';

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface LiveCountdownTimerProps {
  driverLoc?: { lat: number; lng: number } | null;
  targetLoc?: { lat: number; lng: number } | null;
  etaMinutes?: number;
  slangMode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onArrived?: () => void;
}

export const LiveCountdownTimer: React.FC<LiveCountdownTimerProps> = ({
  driverLoc,
  targetLoc,
  etaMinutes,
  slangMode = false,
  size = 'md',
  showLabel = true,
  className = '',
  onArrived
}) => {
  // Calculate target seconds from driver location or etaMinutes
  const computeTargetSeconds = () => {
    if (driverLoc && targetLoc) {
      const distKm = getDistanceKm(driverLoc.lat, driverLoc.lng, targetLoc.lat, targetLoc.lng);
      // ~25 km/h urban speed = ~140 seconds per km
      const calculatedSeconds = Math.round(distKm * 140);
      return Math.max(0, calculatedSeconds);
    }
    if (typeof etaMinutes === 'number') {
      return Math.max(0, Math.round(etaMinutes * 60));
    }
    return 180; // default 3 mins
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(computeTargetSeconds());
  const lastTargetSecondsRef = useRef<number>(computeTargetSeconds());

  // Recalculate target seconds when driver location or etaMinutes changes
  useEffect(() => {
    const targetSec = computeTargetSeconds();
    if (Math.abs(targetSec - lastTargetSecondsRef.current) > 5) {
      lastTargetSecondsRef.current = targetSec;
      setSecondsLeft(targetSec);
    }
  }, [driverLoc?.lat, driverLoc?.lng, targetLoc?.lat, targetLoc?.lng, etaMinutes]);

  // Real-time 1-second countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (onArrived) onArrived();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onArrived]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isUrgent = secondsLeft <= 30 && secondsLeft > 0;
  const isArrived = secondsLeft === 0;

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 font-mono font-black ${isUrgent ? 'text-rose-400 animate-pulse' : 'text-brand-gold'} ${className}`}>
        <Clock size={11} className={isUrgent ? 'animate-spin' : ''} />
        <span>{isArrived ? (slangMode ? "ARRIVÉ !" : "ARRIVED!") : formattedTime}</span>
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <div className={`flex flex-col items-start gap-1 ${className}`}>
        <div className="flex items-center gap-2">
          <motion.div
            key={formattedTime}
            initial={{ scale: 0.95, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`font-mono font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-2 px-3 py-1 rounded-xl border shadow-lg ${
              isUrgent
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                : 'bg-brand-midnight/80 border-brand-gold/40 text-brand-gold shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            }`}
          >
            <Clock size={22} className={isUrgent ? 'text-rose-400 animate-spin' : 'text-brand-gold animate-pulse'} />
            <span>{isArrived ? (slangMode ? "00:00 - Le djo est là !" : "00:00 - Driver Arrived!") : formattedTime}</span>
          </motion.div>

          {/* Pulsing indicator ring */}
          <span className="flex h-3 w-3 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUrgent ? 'bg-rose-400' : 'bg-brand-gold'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isUrgent ? 'bg-rose-500' : 'bg-brand-gold'}`}></span>
          </span>
        </div>

        {showLabel && (
          <p className="text-[10px] font-bold text-brand-text-muted flex items-center gap-1 mt-0.5">
            {isUrgent ? (
              <span className="text-rose-400 font-extrabold uppercase tracking-wider animate-pulse flex items-center gap-1">
                <Zap size={10} /> {slangMode ? "Le djo tourne le carrefour !" : "Driver is turning the corner!"}
              </span>
            ) : (
              <span>
                {slangMode ? "Décompte temps réel au repère de ramassage" : "Real-time countdown to pickup point"}
              </span>
            )}
          </p>
        )}
      </div>
    );
  }

  // Medium (Default)
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <motion.div
        key={formattedTime}
        initial={{ scale: 0.92, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`font-mono font-black text-lg tracking-tight flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border shadow-md ${
          isUrgent
            ? 'bg-rose-950/80 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
            : 'bg-brand-midnight/80 border-brand-gold/40 text-brand-gold shadow-sm'
        }`}
      >
        <Clock size={15} className={isUrgent ? 'text-rose-400 animate-spin' : 'text-brand-gold animate-pulse'} />
        <span>{isArrived ? (slangMode ? "ARRIVÉ" : "ARRIVED") : formattedTime}</span>
      </motion.div>

      {showLabel && (
        <span className="text-xs font-extrabold text-white">
          {isArrived
            ? (slangMode ? "Chauffeur au repère" : "Driver at pickup")
            : (slangMode ? "restants" : "remaining")}
        </span>
      )}
    </div>
  );
};
