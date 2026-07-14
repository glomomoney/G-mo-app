import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, ArrowUpToLine, HelpCircle, ShieldCheck } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceOS('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceOS('android');
    } else {
      setDeviceOS('other');
    }

    // Detect if app is already launched as a standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    } else {
      // Auto-show persistent installation banner for testers if not standalone and not dismissed
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';
      if (!isDismissed) {
        setShowPrompt(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default behavior
      e.preventDefault();
      // Save prompt event
      setDeferredPrompt(e);
      // Auto-show banner to invite installation
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install prompt user choice outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      // No native prompt available (e.g. inside an iframe, or on iOS Safari), show visual guides
      setShowInstructions(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Floating launcher trigger - ALWAYS visible at the bottom right to facilitate easy mobile installation */}
      <div className="fixed bottom-24 right-4 z-[999] flex flex-col items-end" id="pwa-floating-trigger">
        <motion.button
          onClick={() => setShowInstructions(true)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-2.5 bg-brand-deep border border-brand-gold/30 hover:border-brand-gold/80 text-white px-3 py-2 rounded-2xl shadow-xl shadow-brand-gold/10 transition cursor-pointer group"
        >
          {/* Pulsing indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-gold"></span>
          </span>

          {/* App Logo */}
          <img 
            src="/wanda_logo.jpg" 
            alt="Wanda Logo" 
            className="w-8 h-8 rounded-lg object-cover border border-brand-gold shrink-0 shadow-sm"
            referrerPolicy="no-referrer"
          />

          <div className="text-left">
            <p className="text-[10px] font-black tracking-widest text-brand-gold leading-none uppercase">Install App</p>
            <p className="text-[9px] text-brand-text-muted mt-0.5 leading-none font-semibold">Télécharger Wanda</p>
          </div>
        </motion.button>
      </div>

      <AnimatePresence>
        {/* Banner prompt shown dynamically on load if not installed (non-standalone mode) */}
        {showPrompt && !showInstructions && (
          <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 z-[1500] w-full md:max-w-md p-0 md:p-2">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-brand-deep/95 backdrop-blur-lg border-t md:border border-brand-gold/30 rounded-t-3xl md:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative text-white pb-8 md:pb-5"
              id="pwa-install-banner"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowPrompt(false);
                  sessionStorage.setItem('pwa-prompt-dismissed', 'true');
                }}
                className="absolute top-3.5 right-3.5 text-brand-text-muted hover:text-brand-gold p-1.5 rounded-full hover:bg-brand-input cursor-pointer transition"
                title="Dismiss"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-4 pr-6">
                <img 
                  src="/wanda_logo.jpg" 
                  alt="Wanda Logo" 
                  className="w-14 h-14 rounded-xl object-cover border-2 border-brand-gold shadow-gold-glow shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                      PWA App
                    </span>
                    <p className="text-sm font-black text-white leading-none">Installer Wanda</p>
                  </div>
                  <p className="text-xs text-brand-text-muted leading-relaxed font-semibold">
                    Ajoutez Wanda à votre écran d'accueil pour l'utiliser comme une vraie appli mobile (suivi en direct, rapidité, fluidité).
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 mt-1">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-brand-gold hover:bg-brand-gold/95 text-brand-midnight text-xs py-3 px-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20 cursor-pointer active:scale-95 transition"
                >
                  <Download size={15} className="stroke-[2.5]" />
                  <span>Installer l'application</span>
                </button>
                <button
                  onClick={() => {
                    setShowPrompt(false);
                    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
                  }}
                  className="bg-brand-input/80 hover:bg-brand-input hover:text-white border border-brand-input/60 text-brand-text-muted text-xs py-3 px-5 rounded-xl font-bold cursor-pointer active:scale-95 transition"
                >
                  Plus tard
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Beautiful Installation Guide Modal (Visual Mockup & Guide) */}
        {showInstructions && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-deep border border-brand-gold/20 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowInstructions(false)}
                className="absolute top-4 right-4 text-brand-text-muted hover:text-brand-gold p-1.5 rounded-full hover:bg-brand-input cursor-pointer transition"
              >
                <X size={18} />
              </button>

              {/* Title & Slogan */}
              <div className="text-center mt-2 flex flex-col items-center">
                <div className="relative mb-3">
                  <div className="absolute inset-0 bg-brand-gold/20 blur-xl rounded-full scale-125 animate-pulse"></div>
                  <img 
                    src="/wanda_logo.jpg" 
                    alt="Wanda Launcher Icon" 
                    className="relative w-20 h-20 rounded-2xl object-cover border-2 border-brand-gold shadow-gold-glow-lg"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-1.5 -right-1.5 bg-brand-gold text-brand-midnight rounded-full p-1 border border-brand-deep shadow">
                    <Download size={12} className="stroke-[3]" />
                  </span>
                </div>
                
                <h3 className="text-lg font-black tracking-tight text-brand-gold uppercase">WANDA MOBILE</h3>
                <p className="text-[10px] text-brand-text-muted italic font-bold">Tu wanda, on te transporte.</p>
              </div>

              {/* Mobile Device Mockup Visual */}
              <div className="my-5 p-3.5 bg-brand-card/40 border border-brand-input rounded-2xl text-center">
                <p className="text-[11px] text-brand-text-muted font-bold mb-2">INSTALLATION MOBILE DIRECTE</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-14 h-14 bg-brand-deep rounded-xl border border-brand-input/80 flex flex-col items-center justify-center text-center p-1 relative shadow">
                    <img 
                      src="/wanda_logo.jpg" 
                      alt="Wanda icon" 
                      className="w-8 h-8 rounded-lg object-cover border border-brand-gold/40"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[8px] font-black text-white mt-1 scale-90">Wanda</span>
                  </div>
                  <div className="text-left max-w-[180px]">
                    <p className="text-[11px] font-extrabold text-white">Application Intégrale</p>
                    <p className="text-[9px] text-brand-text-muted">S'installe instantanément sans passer par l'App Store ou Google Play.</p>
                  </div>
                </div>
              </div>

              {/* Instruction Steps based on OS */}
              <div className="space-y-3 text-xs leading-relaxed">
                {deferredPrompt ? (
                  <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex gap-2 items-start">
                      <ShieldCheck size={16} className="text-brand-gold shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-brand-gold">Installation Standard</p>
                        <p className="text-[10px] text-brand-text-muted">Votre navigateur prend en charge l'installation directe en 1 clic.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleInstallClick}
                      className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-2 rounded-xl text-center shadow cursor-pointer transition flex items-center justify-center gap-1"
                    >
                      <Download size={13} />
                      Installer maintenant
                    </button>
                  </div>
                ) : (
                  <>
                    {/* iOS / Safari Specific instructions */}
                    {(deviceOS === 'ios' || deviceOS === 'other') && (
                      <div className="bg-brand-card border border-brand-input rounded-xl p-3 space-y-2">
                        <div className="flex gap-2">
                          <span className="bg-brand-gold text-brand-midnight text-[9px] font-black px-1.5 py-0.5 rounded h-fit shrink-0">iOS / Safari</span>
                          <p className="font-extrabold text-white text-[11px]">Comment installer sur iPhone / iPad :</p>
                        </div>
                        <ol className="list-decimal list-inside text-[10px] text-brand-text-muted space-y-1.5 pl-1">
                          <li>Ouvrez l'application dans <strong className="text-white">Safari</strong></li>
                          <li>Appuyez sur le bouton de <strong className="text-white flex inline-flex items-center gap-0.5 bg-brand-input px-1.5 py-0.5 rounded text-[9px]">Partage <ArrowUpToLine size={10} className="inline" /></strong> en bas</li>
                          <li>Faites défiler et appuyez sur <strong className="text-brand-gold">"Sur l'écran d'accueil"</strong></li>
                        </ol>
                      </div>
                    )}

                    {/* Android / Chrome Specific instructions */}
                    {(deviceOS === 'android' || deviceOS === 'other') && (
                      <div className="bg-brand-card border border-brand-input rounded-xl p-3 space-y-2">
                        <div className="flex gap-2">
                          <span className="bg-brand-gold text-brand-midnight text-[9px] font-black px-1.5 py-0.5 rounded h-fit shrink-0">Android / Chrome</span>
                          <p className="font-extrabold text-white text-[11px]">Comment installer sur Android :</p>
                        </div>
                        <ol className="list-decimal list-inside text-[10px] text-brand-text-muted space-y-1.5 pl-1">
                          <li>Appuyez sur le bouton de menu <strong className="text-white">(les 3 points en haut à droite)</strong></li>
                          <li>Appuyez sur <strong className="text-brand-gold">"Installer l'application"</strong> ou "Ajouter à l'écran d'accueil"</li>
                        </ol>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Close Info */}
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-4 bg-brand-input hover:bg-brand-input/80 text-brand-text-muted hover:text-white font-extrabold py-2.5 rounded-xl text-center text-xs transition cursor-pointer"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
