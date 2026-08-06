import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Sparkles, X, ChevronRight, Volume2 } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationPushBannerProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onOpenDrawer: () => void;
}

export const NotificationPushBanner: React.FC<NotificationPushBannerProps> = ({
  notification,
  onDismiss,
  onOpenDrawer,
}) => {
  useEffect(() => {
    if (notification) {
      // Auto-dismiss after 7 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-gradient-to-r from-brand-midnight via-brand-deep to-brand-midnight text-white border-2 border-brand-gold/60 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md cursor-pointer hover:border-brand-gold transition"
        onClick={() => {
          onOpenDrawer();
          onDismiss();
        }}
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-brand-gold text-brand-midnight rounded-xl shrink-0 shadow-lg animate-bounce">
            <Bell size={18} className="fill-brand-midnight" />
          </div>

          <div className="flex-1 min-w-0 pr-1 space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-gold flex items-center gap-1">
                <Sparkles size={11} /> Push Wanda Taxi
              </span>
              <span className="text-[10px] font-mono text-brand-text-muted">
                {new Date(notification.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <h4 className="text-xs font-black text-white truncate">
              {notification.title}
            </h4>

            <p className="text-[11px] text-slate-200 line-clamp-2 leading-tight">
              {notification.message}
            </p>

            <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-brand-gold">
              <span>Appuyez pour voir les détails</span>
              <ChevronRight size={13} />
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="p-1 text-brand-text-muted hover:text-white rounded-lg hover:bg-brand-card/60 transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPushBanner;
