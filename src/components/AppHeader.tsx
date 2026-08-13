import { AnimatePresence, motion } from 'motion/react';
import { WifiOff, Bell, Globe, ChevronDown, Check, LogOut } from 'lucide-react';
import WandaLogo from './WandaLogo';
import { AppNotification, UserRole } from '../types';

interface AppHeaderProps {
  isOnline: boolean;
  slangMode: boolean;
  currentCity: string;
  role: UserRole;
  language: 'en' | 'fr';
  appNotifications: AppNotification[];
  langDropdownOpen: boolean;
  setSearchModalType: (type: 'pickup' | 'destination' | null) => void;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  setLangDropdownOpen: (open: boolean) => void;
  changeLanguage: (lang: 'en' | 'fr') => void;
  handleLogout: () => void;
}

export default function AppHeader({
  isOnline,
  slangMode,
  currentCity,
  role,
  language,
  appNotifications,
  langDropdownOpen,
  setSearchModalType,
  setIsNotificationDrawerOpen,
  setLangDropdownOpen,
  changeLanguage,
  handleLogout,
}: AppHeaderProps) {
  return (
    <>
      {/* Global Offline Service Worker Mode Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-brand-midnight py-1.5 px-3 font-extrabold text-[10px] sm:text-[11px] flex items-center justify-between shadow-lg z-[2000] border-b border-amber-300/40 animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff size={14} className="shrink-0 animate-pulse text-brand-midnight" />
            <span>
              {slangMode
                ? "⚡ Mode Hors Ligne Actif (Service Worker) — Historique & Solde Wallet entièrement disponibles hors connexion."
                : "⚡ Offline Mode Active (Service Worker) — Past ride history & Wallet balances served from offline cache."}
            </span>
          </div>
          <span className="bg-brand-midnight text-amber-300 text-[8px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-amber-400/30">
            SW CACHE
          </span>
        </div>
      )}

      {/* Header bar */}
      <header className="bg-brand-deep border-b border-brand-card/80 px-3 sm:px-4 py-2 sm:py-2.5 shrink-0 z-50 flex items-center justify-between shadow-md">

        {/* Brand identity & Location Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <WandaLogo className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_0_8px_rgba(226,193,141,0.25)]" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-xs sm:text-sm font-black tracking-widest text-brand-gold font-sans">
              WANDA
            </h1>
            {currentCity && (
              <button
                onClick={() => setSearchModalType('pickup')}
                className="bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/30 text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-inner cursor-pointer transition-colors"
                title="Changer de ville / position"
              >
                📍 {currentCity}
              </button>
            )}
          </div>
        </div>

        {/* Global Toolbar Header Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Small non-interactive Mode Indicator */}
          <span className="bg-brand-card/60 border border-brand-input px-2 py-0.5 rounded-full text-[9px] font-bold text-brand-gold flex items-center gap-1">
            {role === 'passenger' ? (language === 'fr' ? '👤 Passager' : '👤 Passenger') : (language === 'fr' ? '🚖 Chauffeur' : '🚖 Driver')}
          </span>

          {/* Notification Bell Button */}
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-1.5 text-brand-gold hover:text-white bg-brand-card/60 hover:bg-brand-card border border-brand-input rounded-xl transition cursor-pointer shrink-0"
            title={language === 'fr' ? "Notifications" : "Notifications"}
            id="notification-bell-btn"
          >
            <Bell size={13} />
            {appNotifications.some(n => !n.read) && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-gold rounded-full animate-ping" />
            )}
            {appNotifications.some(n => !n.read) && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-gold rounded-full" />
            )}
          </button>

          {/* Language Toggle Group */}
          <div className="relative shrink-0" id="language-switcher-header">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 bg-brand-card/60 hover:bg-brand-card border border-brand-input rounded-xl text-[10px] font-black cursor-pointer transition shadow-sm text-brand-gold hover:text-white select-none"
              id="language-dropdown-trigger"
              title={language === 'fr' ? "Changer de langue" : "Change language"}
            >
              <Globe size={11} className="text-brand-gold shrink-0" />
              <span>{language === 'fr' ? "🇫🇷" : "🇬🇧"}</span>
              <ChevronDown size={9} className={`text-brand-text-muted transition-transform duration-200 ${langDropdownOpen ? 'rotate-180 text-brand-gold' : ''}`} />
            </button>

            <AnimatePresence>
              {langDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setLangDropdownOpen(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-1.5 w-36 bg-brand-deep border border-brand-input rounded-xl shadow-xl py-1 z-50 overflow-hidden font-sans text-[10px]"
                    id="language-dropdown-menu"
                  >
                    <button
                      onClick={() => {
                        changeLanguage('en');
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-all duration-150 cursor-pointer hover:bg-brand-card ${
                        language === 'en'
                          ? 'bg-brand-gold/15 text-brand-gold font-extrabold'
                          : 'text-brand-text-muted hover:text-white'
                      }`}
                      id="lang-opt-en"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>🇬🇧</span>
                        <span>English</span>
                      </span>
                      {language === 'en' && <Check size={12} className="text-brand-gold shrink-0" />}
                    </button>

                    <button
                      onClick={() => {
                        changeLanguage('fr');
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-all duration-150 cursor-pointer hover:bg-brand-card ${
                        language === 'fr'
                          ? 'bg-brand-gold/15 text-brand-gold font-extrabold'
                          : 'text-brand-text-muted hover:text-white'
                      }`}
                      id="lang-opt-fr"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>🇫🇷</span>
                        <span>Français</span>
                      </span>
                      {language === 'fr' && <Check size={12} className="text-brand-gold shrink-0" />}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User Signout */}
          <button
            onClick={handleLogout}
            title="Log Out Profile"
            className="p-1.5 text-brand-text-muted hover:text-rose-400 bg-brand-card/30 border border-brand-input rounded-xl hover:bg-brand-input transition cursor-pointer shrink-0"
          >
            <LogOut size={12} />
          </button>
        </div>

      </header>
    </>
  );
}
