import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, ArrowUpToLine, ShieldCheck, Copy, Check, Share2, Sparkles } from 'lucide-react';

interface InstallPromptProps {
  language?: 'en' | 'fr';
}

export default function InstallPrompt({ language: propLanguage }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wanda_pwa_installed') === 'true' ||
             window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true;
    } catch {
      return false;
    }
  });
  const [showInstructions, setShowInstructions] = useState(false);
  const [showInstalledToast, setShowInstalledToast] = useState(false);
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'other'>('other');
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');
  const [copiedLink, setCopiedLink] = useState(false);

  // Determine current language ('fr' or 'en')
  const currentLang = propLanguage || (localStorage.getItem('wanda_language') as 'en' | 'fr') || 'fr';
  const isFr = currentLang === 'fr';

  const markAsInstalled = () => {
    setIsInstalled(true);
    try {
      localStorage.setItem('wanda_pwa_installed', 'true');
    } catch (err) {
      console.warn('Could not save install status to localStorage:', err);
    }
    setShowPrompt(false);
    setShowInstructions(false);
    setShowInstalledToast(true);
    setTimeout(() => setShowInstalledToast(false), 4500);
  };

  useEffect(() => {
    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceOS('ios');
      setActiveTab('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceOS('android');
      setActiveTab('android');
    } else {
      setDeviceOS('other');
      setActiveTab('ios');
    }

    // Check standalone mode strictly
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true ||
                         localStorage.getItem('wanda_pwa_installed') === 'true';
    
    if (isStandalone) {
      setIsInstalled(true);
    } else {
      // Auto-show banner if not dismissed
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';
      if (!isDismissed) {
        setShowPrompt(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';
      if (!isDismissed && !isInstalled) {
        setShowPrompt(true);
      }
    };

    const handleCustomOpenTrigger = () => {
      if (!isInstalled) {
        handleInstallClick();
      } else {
        setShowInstalledToast(true);
        setTimeout(() => setShowInstalledToast(false), 3500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('open-pwa-install', handleCustomOpenTrigger);

    const handleAppInstalled = () => {
      markAsInstalled();
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleCustomOpenTrigger);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA install prompt choice: ${outcome}`);
        if (outcome === 'accepted') {
          markAsInstalled();
        }
      } catch (err) {
        console.error('PWA install error:', err);
      } finally {
        setDeferredPrompt(null);
      }
    } else {
      // Pas de prompt natif disponible (Safari iOS, ou navigateur qui n'a pas
      // encore émis beforeinstallprompt) — on affiche le guide manuel au lieu
      // de prétendre que l'installation a réussi. La détection du mode
      // standalone au prochain lancement confirmera la vraie installation.
      setShowInstructions(true);
    }
  };

  const handleCopyAppUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <>
      {/* Toast notification upon successful installation */}
      <AnimatePresence>
        {showInstalledToast && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[10010] bg-brand-deep border-2 border-emerald-400 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-lg"
          >
            <div className="w-9 h-9 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/40">
              <Check size={20} className="stroke-[3]" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                {isFr ? "Wanda Mobile Installée !" : "Wanda Mobile Installed!"}
              </p>
              <p className="text-[11px] text-brand-text-muted font-bold">
                {isFr ? "L'application est désormais installée sur votre appareil." : "The app is now installed on your device."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher trigger - VISIBLE ONLY UNTIL INSTALLED */}
      {!isInstalled && (
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 right-3 sm:bottom-24 sm:right-4 z-[10000] flex flex-col items-end"
            id="pwa-floating-trigger"
          >
            <motion.button
              onClick={handleInstallClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center gap-2.5 bg-brand-midnight/95 backdrop-blur-md border-2 border-brand-gold/60 hover:border-brand-gold text-white px-3 py-2 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] shadow-brand-gold/20 transition cursor-pointer group active:scale-95"
              id="pwa-install-floating-btn"
              title={isFr ? "Cliquer pour installer Wanda sur votre appareil" : "Click to install Wanda on your device"}
            >
              {/* Glowing indicator */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-80"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-gold border-2 border-brand-midnight"></span>
              </span>

              {/* App Logo */}
              <img 
                src="/wanda_logo.jpg" 
                alt="Wanda App Icon" 
                className="w-8 h-8 rounded-xl object-cover border border-brand-gold/80 shrink-0 shadow-sm"
                referrerPolicy="no-referrer"
              />

              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black tracking-widest text-brand-gold leading-none uppercase">
                    {isFr ? "INSTALLER APPLI" : "INSTALL APP"}
                  </span>
                  <Download size={10} className="text-brand-gold animate-bounce" />
                </div>
                <p className="text-[9px] text-brand-text-muted mt-0.5 leading-none font-extrabold">Wanda Mobile</p>
              </div>
            </motion.button>
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {/* Banner prompt shown dynamically on load if not installed (non-standalone mode) */}
        {showPrompt && !showInstructions && !isInstalled && (
          <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 z-[9990] w-full md:max-w-md p-0 md:p-2">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-brand-deep/95 backdrop-blur-lg border-t md:border border-brand-gold/40 rounded-t-3xl md:rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 relative text-white pb-8 md:pb-5"
              id="pwa-install-banner"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowPrompt(false);
                  sessionStorage.setItem('pwa-prompt-dismissed', 'true');
                }}
                className="absolute top-3.5 right-3.5 text-brand-text-muted hover:text-brand-gold p-1.5 rounded-full hover:bg-brand-input cursor-pointer transition"
                title={isFr ? "Masquer" : "Dismiss"}
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-3.5 pr-6">
                <img 
                  src="/wanda_logo.jpg" 
                  alt="Wanda Logo" 
                  className="w-13 h-13 rounded-xl object-cover border-2 border-brand-gold shadow-gold-glow shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-gold/15 border border-brand-gold/40 text-brand-gold text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                      {isFr ? "Application PWA" : "PWA Application"}
                    </span>
                    <p className="text-sm font-black text-white leading-none">
                      {isFr ? "Installer Wanda Taxi" : "Install Wanda Taxi"}
                    </p>
                  </div>
                  <p className="text-xs text-brand-text-muted leading-relaxed font-semibold">
                    {isFr 
                      ? "Installez Wanda directement sur votre tableau de bord iOS ou Android (icône dédiée, rapidité, accès hors ligne)."
                      : "Install Wanda directly on your iOS or Android home screen (dedicated icon, fast speed, offline support)."
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-brand-gold hover:bg-brand-gold/95 text-brand-midnight text-xs py-2.5 px-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20 cursor-pointer active:scale-95 transition"
                >
                  <Download size={15} className="stroke-[2.5]" />
                  <span>{isFr ? "Installer l'appli" : "Install App"}</span>
                </button>
                <button
                  onClick={() => {
                    setShowPrompt(false);
                    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
                  }}
                  className="bg-brand-input/80 hover:bg-brand-input hover:text-white border border-brand-input/60 text-brand-text-muted text-xs py-2.5 px-4 rounded-xl font-bold cursor-pointer active:scale-95 transition"
                >
                  {isFr ? "Plus tard" : "Maybe later"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Full Installation Modal (Visual Device Dashboard Mockup & Step-by-Step Instructions) */}
        {showInstructions && (
          <div className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="bg-brand-deep border-2 border-brand-gold/30 rounded-3xl p-5 sm:p-6 max-w-md w-full text-white shadow-2xl relative max-h-[92vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowInstructions(false)}
                className="absolute top-4 right-4 text-brand-text-muted hover:text-brand-gold p-1.5 rounded-full hover:bg-brand-input cursor-pointer transition z-10"
              >
                <X size={20} />
              </button>

              {/* Title & Branding */}
              <div className="text-center mt-1 flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="absolute inset-0 bg-brand-gold/25 blur-xl rounded-full scale-125 animate-pulse"></div>
                  <img 
                    src="/wanda_logo.jpg" 
                    alt="Wanda Mobile App Launcher Icon" 
                    className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-brand-gold shadow-gold-glow"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-brand-gold text-brand-midnight rounded-full p-1 border-2 border-brand-deep shadow-md">
                    <Sparkles size={13} className="fill-brand-midnight" />
                  </span>
                </div>
                
                <h3 className="text-lg font-black tracking-tight text-brand-gold uppercase flex items-center gap-1.5">
                  <span>WANDA MOBILE PWA</span>
                </h3>
                <p className="text-[10px] text-brand-text-muted italic font-bold">Tu wanda, on te transporte.</p>
              </div>

              {/* Visual Mobile Dashboard Mockup (iOS / Android Home Screen Icon Preview) */}
              <div className="my-4 p-3 bg-brand-card/60 border border-brand-gold/25 rounded-2xl text-center shadow-inner">
                <div className="flex justify-between items-center mb-2 px-1">
                  <p className="text-[10px] font-black uppercase text-brand-gold tracking-wider flex items-center gap-1">
                    <Smartphone size={12} />
                    <span>{isFr ? "Aperçu de l'Icône sur Écran d'Accueil" : "Home Screen Icon Preview"}</span>
                  </p>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                    iOS & Android
                  </span>
                </div>

                <div className="bg-brand-midnight/90 border border-brand-input p-3 rounded-xl flex items-center justify-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-brand-gold/5 rounded-full blur-lg pointer-events-none" />
                  
                  {/* Smartphone Icon Preview Box */}
                  <div className="flex flex-col items-center group cursor-default">
                    <div className="w-14 h-14 bg-brand-deep rounded-2xl border-2 border-brand-gold/80 flex items-center justify-center p-1 shadow-lg shadow-brand-gold/15 relative">
                      <img 
                        src="/wanda_logo.jpg" 
                        alt="Wanda icon" 
                        className="w-full h-full rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -top-1 -right-1 bg-brand-gold text-brand-midnight text-[7px] font-black px-1 rounded-full">
                        APP
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-white mt-1.5 tracking-tight">Wanda</span>
                  </div>

                  {/* Context Info */}
                  <div className="text-left max-w-[200px] space-y-1">
                    <p className="text-[11px] font-extrabold text-white leading-tight">
                      {isFr ? "Tableau de bord Mobile" : "Mobile Home Screen"}
                    </p>
                    <p className="text-[9.5px] text-brand-text-muted leading-relaxed font-medium">
                      {isFr 
                        ? <>L'icône <strong className="text-brand-gold">Wanda</strong> s'affiche directement parmi vos applications mobiles avec le logo officiel.</>
                        : <>The <strong className="text-brand-gold">Wanda</strong> icon appears directly on your mobile home screen with the official logo.</>
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* OS Selection Tabs */}
              <div className="flex bg-brand-card p-1 rounded-xl border border-brand-input mb-3">
                <button
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'ios' ? 'bg-brand-gold text-brand-midnight shadow' : 'text-brand-text-muted hover:text-white'
                  }`}
                >
                  <span> iPhone / iPad (iOS)</span>
                </button>
                <button
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'android' ? 'bg-brand-gold text-brand-midnight shadow' : 'text-brand-text-muted hover:text-white'
                  }`}
                >
                  <span>🤖 Android / Chrome</span>
                </button>
              </div>

              {/* Instructions Content */}
              <div className="space-y-3 text-xs leading-relaxed">
                {deferredPrompt ? (
                  <div className="bg-brand-gold/10 border border-brand-gold/40 rounded-2xl p-3.5 flex flex-col gap-2.5">
                    <div className="flex gap-2.5 items-start">
                      <ShieldCheck size={18} className="text-brand-gold shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-brand-gold text-xs">
                          {isFr ? "Installation Automatique Disponible" : "Automatic Installation Available"}
                        </p>
                        <p className="text-[10.5px] text-brand-text-muted mt-0.5">
                          {isFr 
                            ? "Votre navigateur prend en charge l'installation directe en 1 clic."
                            : "Your browser supports 1-click direct installation."
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleInstallClick}
                      className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-2.5 rounded-xl text-center shadow-lg cursor-pointer transition flex items-center justify-center gap-2 text-xs active:scale-95"
                    >
                      <Download size={15} className="stroke-[3]" />
                      {isFr ? "Installer Wanda Maintenant" : "Install Wanda Now"}
                    </button>
                  </div>
                ) : (
                  <>
                    {activeTab === 'ios' && (
                      <div className="bg-brand-card border border-brand-input rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center gap-2 border-b border-brand-input/60 pb-2">
                          <span className="bg-brand-gold text-brand-midnight text-[9px] font-black px-2 py-0.5 rounded">iOS / Safari</span>
                          <p className="font-extrabold text-white text-xs">
                            {isFr ? "Ajouter à l'écran d'accueil Safari :" : "Add to Safari Home Screen:"}
                          </p>
                        </div>
                        <ol className="list-decimal list-inside text-[11px] text-brand-text-muted space-y-2 font-medium pl-0.5">
                          <li>
                            {isFr ? <>Ouvrez ce lien dans le navigateur <strong className="text-white">Safari</strong>.</> : <>Open this link in <strong className="text-white">Safari</strong> browser.</>}
                          </li>
                          <li>
                            {isFr 
                              ? <>Appuyez sur l'icône de <strong className="text-white inline-flex items-center gap-1 bg-brand-input px-1.5 py-0.5 rounded text-[10px] border border-brand-input/80">Partage <ArrowUpToLine size={11} className="inline text-brand-gold" /></strong> en bas de Safari.</>
                              : <>Tap the <strong className="text-white inline-flex items-center gap-1 bg-brand-input px-1.5 py-0.5 rounded text-[10px] border border-brand-input/80">Share <ArrowUpToLine size={11} className="inline text-brand-gold" /></strong> button at the bottom of Safari.</>
                            }
                          </li>
                          <li>
                            {isFr 
                              ? <>Défilez vers le bas et appuyez sur <strong className="text-brand-gold font-bold">"Sur l'écran d'accueil"</strong> (ou "Add to Home Screen").</>
                              : <>Scroll down and tap <strong className="text-brand-gold font-bold">"Add to Home Screen"</strong>.</>
                            }
                          </li>
                          <li>
                            {isFr 
                              ? <>Confirmez avec l'icône <strong className="text-white">Wanda</strong> et appuyez sur <strong className="text-brand-gold font-bold">"Ajouter"</strong> en haut à droite.</>
                              : <>Confirm with the <strong className="text-white">Wanda</strong> icon and tap <strong className="text-brand-gold font-bold">"Add"</strong> in the top right corner.</>
                            }
                          </li>
                        </ol>
                      </div>
                    )}

                    {activeTab === 'android' && (
                      <div className="bg-brand-card border border-brand-input rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center gap-2 border-b border-brand-input/60 pb-2">
                          <span className="bg-brand-gold text-brand-midnight text-[9px] font-black px-2 py-0.5 rounded">Android / Chrome</span>
                          <p className="font-extrabold text-white text-xs">
                            {isFr ? "Installer via Google Chrome / Samsung Internet :" : "Install via Google Chrome / Samsung Internet:"}
                          </p>
                        </div>
                        <ol className="list-decimal list-inside text-[11px] text-brand-text-muted space-y-2 font-medium pl-0.5">
                          <li>
                            {isFr 
                              ? <>Appuyez sur le menu <strong className="text-white">(3 points en haut à droite)</strong>.</>
                              : <>Tap the menu icon <strong className="text-white">(3 dots in top right corner)</strong>.</>
                            }
                          </li>
                          <li>
                            {isFr 
                              ? <>Appuyez sur <strong className="text-brand-gold font-bold">"Installer l'application"</strong> ou <strong className="text-brand-gold font-bold">"Ajouter à l'écran d'accueil"</strong>.</>
                              : <>Tap <strong className="text-brand-gold font-bold">"Install app"</strong> or <strong className="text-brand-gold font-bold">"Add to Home screen"</strong>.</>
                            }
                          </li>
                          <li>
                            {isFr 
                              ? <>Validez le popup pour voir apparaître le logo <strong className="text-white">Wanda</strong> sur votre tableau de bord Android.</>
                              : <>Confirm the prompt to place the <strong className="text-white">Wanda</strong> icon on your Android home screen.</>
                            }
                          </li>
                        </ol>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Copy Direct Link Helper */}
              <div className="mt-3.5 p-2.5 bg-brand-midnight/80 border border-brand-input rounded-xl flex items-center justify-between gap-2">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white flex items-center gap-1">
                    <Share2 size={11} className="text-brand-gold" />
                    <span>{isFr ? "Tester sur votre Téléphone" : "Test on your Phone"}</span>
                  </p>
                  <p className="text-[9px] text-brand-text-muted truncate max-w-[210px]">
                    {window.location.href}
                  </p>
                </div>
                <button
                  onClick={handleCopyAppUrl}
                  className="bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/30 px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer transition"
                >
                  {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedLink ? (isFr ? "Copié !" : "Copied!") : (isFr ? "Copier" : "Copy")}</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-4 bg-brand-input hover:bg-brand-input/80 text-brand-text-muted hover:text-white font-extrabold py-2.5 rounded-xl text-center text-xs transition cursor-pointer"
              >
                {isFr ? "Fermer" : "Close"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
