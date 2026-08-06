import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Tag, 
  Info, 
  AlertTriangle, 
  MapPin, 
  Sparkles, 
  CreditCard, 
  Clock, 
  ArrowRight,
  Trash2,
  Volume2
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  currentUserId: string;
  userRole: 'passenger' | 'driver';
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onSelectRouteDeal?: (routeData: NonNullable<AppNotification['routeData']>) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUserId,
  userRole,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectRouteDeal,
}) => {
  const [filter, setFilter] = React.useState<'all' | 'unread' | 'promo'>('all');

  // Filter notifications relevant to current user role
  const roleNotifications = notifications.filter(n => 
    n.target === 'all' || n.target === userRole
  );

  const unreadCount = roleNotifications.filter(n => !(n.readBy || []).includes(currentUserId)).length;

  const filteredNotifications = roleNotifications.filter(n => {
    const isUnread = !(n.readBy || []).includes(currentUserId);
    if (filter === 'unread') return isUnread;
    if (filter === 'promo') return n.type === 'promo' || n.type === 'route_fare';
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Backdrop click to close */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Drawer content */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full max-w-md bg-brand-midnight text-white h-full border-l border-brand-gold/30 shadow-2xl flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-4 border-b border-brand-input/60 bg-brand-deep/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-gold/15 border border-brand-gold/30 text-brand-gold rounded-xl">
                  <Bell size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span>Notifications Push Wanda</span>
                    {unreadCount > 0 && (
                      <span className="bg-brand-gold text-brand-midnight text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                        {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </h2>
                  <p className="text-[10px] text-brand-text-muted font-medium">
                    {userRole === 'passenger' ? 'Offres exclusives & réductions Wallet 15%' : 'Alertes Chauffeur & actualités plateforme'}
                  </p>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="p-1.5 text-brand-text-muted hover:text-white hover:bg-brand-card rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Pills & Actions */}
            <div className="p-3 border-b border-brand-input/40 bg-brand-card/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filter === 'all' 
                      ? 'bg-brand-gold text-brand-midnight' 
                      : 'bg-brand-input/60 text-brand-text-muted hover:text-white'
                  }`}
                >
                  Toutes ({roleNotifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filter === 'unread' 
                      ? 'bg-brand-gold text-brand-midnight' 
                      : 'bg-brand-input/60 text-brand-text-muted hover:text-white'
                  }`}
                >
                  Non lues ({unreadCount})
                </button>
                <button
                  onClick={() => setFilter('promo')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filter === 'promo' 
                      ? 'bg-brand-gold text-brand-midnight' 
                      : 'bg-brand-input/60 text-brand-text-muted hover:text-white'
                  }`}
                >
                  Promos & Tarifs
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-[10px] font-bold text-brand-gold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck size={12} />
                  <span>Tout lire</span>
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-brand-text-muted space-y-2">
                  <div className="p-3 bg-brand-card/50 rounded-2xl border border-brand-input/40">
                    <Bell size={28} className="opacity-40" />
                  </div>
                  <strong className="text-xs text-white">Aucune notification disponible</strong>
                  <p className="text-[11px] leading-relaxed">
                    Vous recevrez ici les alertes de trajets, promos de recharge wallet +20%, et meilleures offres de la journée !
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const isUnread = !(notification.readBy || []).includes(currentUserId);

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => onMarkAsRead(notification.id)}
                      className={`p-3.5 rounded-2xl border transition relative cursor-pointer ${
                        isUnread
                          ? 'bg-brand-deep/90 border-brand-gold/40 shadow-lg'
                          : 'bg-brand-card/40 border-brand-input/40 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Unread indicator dot */}
                      {isUnread && (
                        <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-brand-gold animate-pulse" />
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          notification.type === 'promo' || notification.type === 'route_fare'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : notification.type === 'alert'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}>
                          {notification.type === 'promo' ? (
                            <Sparkles size={16} />
                          ) : notification.type === 'route_fare' ? (
                            <MapPin size={16} />
                          ) : notification.type === 'alert' ? (
                            <AlertTriangle size={16} />
                          ) : (
                            <Info size={16} />
                          )}
                        </div>

                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between pr-4">
                            <span className="text-xs font-black text-white line-clamp-1">
                              {notification.title}
                            </span>
                          </div>

                          <p className="text-xs text-slate-200 leading-relaxed font-medium">
                            {notification.message}
                          </p>

                          {/* Route fare deal attachment card if available */}
                          {notification.routeData && (
                            <div className="mt-2 p-2.5 rounded-xl bg-brand-midnight border border-brand-gold/30 space-y-1 text-xs">
                              <div className="flex items-center justify-between text-[11px] font-bold text-brand-gold">
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} className="text-emerald-400" />
                                  {notification.routeData.fromName} → {notification.routeData.toName}
                                </span>
                                <span className="font-mono">{notification.routeData.distanceKm} km</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-brand-input/40">
                                <span className="text-brand-text-muted">Prix Estimé Offre :</span>
                                <strong className="text-emerald-400 font-mono font-black text-xs">
                                  {notification.routeData.estimatedFare.toLocaleString('fr-FR')} FCFA
                                </strong>
                              </div>
                              {onSelectRouteDeal && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectRouteDeal(notification.routeData!);
                                    onClose();
                                  }}
                                  className="mt-1.5 w-full bg-brand-gold/20 hover:bg-brand-gold text-brand-gold hover:text-brand-midnight py-1 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer"
                                >
                                  <span>Commander cette Course →</span>
                                </button>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-brand-text-muted pt-1">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock size={10} />
                              {new Date(notification.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="capitalize font-bold bg-brand-input/60 px-1.5 py-0.5 rounded text-[9px]">
                              {notification.target === 'all' ? 'Tous' : notification.target}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Banner footer reminder */}
            <div className="p-3 bg-brand-deep/90 border-t border-brand-input/60 text-center text-[11px] text-brand-text-muted">
              💡 <strong className="text-white">Économisez 15%</strong> sur toutes vos courses en payant avec le Wallet Wanda !
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDrawer;
