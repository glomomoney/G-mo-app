import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles, Smartphone, ArrowRight, UserCheck, ShieldCheck, Globe, Upload, FileCheck2, Loader2, RefreshCw } from 'lucide-react';
import WandaLogo from './WandaLogo';
import { AuthStep } from '../hooks/useAuth';

// Matches the doc keys AdminDashboard's KYC viewer already expects
// (getDriverKYCDocuments) — uploading here is what replaces its Unsplash
// placeholder fallback with the driver's real documents.
const KYC_DOC_FIELDS: { key: string; label: string; labelEn: string }[] = [
  { key: 'nationalIdFront', label: "CNI - Recto", labelEn: 'National ID - Front' },
  { key: 'nationalIdBack', label: "CNI - Verso", labelEn: 'National ID - Back' },
  { key: 'driverLicense', label: 'Permis de Conduire', labelEn: "Driver's License" },
  { key: 'vehicleInsurance', label: "Assurance Véhicule", labelEn: 'Vehicle Insurance' },
  { key: 'vehicleGreyCard', label: 'Carte Grise', labelEn: 'Vehicle Registration' }
];

interface LandingPageProps {
  onSignupComplete: (userData: {
    name: string;
    phone: string;
    role: 'passenger' | 'driver';
    slangMode: boolean;
    vehicleType?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    vehiclePlate?: string;
    kycFiles?: Record<string, File>;
  }) => void;
  currentLanguage?: 'en' | 'fr';
  onLanguageChange?: (lang: 'en' | 'fr') => void;
  authStep: AuthStep;
  pendingPhone: string;
  otpSending: boolean;
  otpError: string | null;
  onStartPhoneVerification: (phone: string, recaptchaContainerId: string) => void;
  onConfirmOtp: (code: string) => void;
}

export default function LandingPage({
  onSignupComplete,
  currentLanguage = 'fr',
  onLanguageChange,
  authStep,
  pendingPhone,
  otpSending,
  otpError,
  onStartPhoneVerification,
  onConfirmOtp
}: LandingPageProps) {
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [name, setName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const slangMode = currentLanguage === 'fr';

  const [vehicleType, setVehicleType] = useState('ecoride');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [kycFiles, setKycFiles] = useState<Record<string, File>>({});
  const [error, setError] = useState('');

  const handleKycFileChange = (key: string, file: File | null) => {
    setKycFiles(prev => {
      const next = { ...prev };
      if (file) {
        next[key] = file;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const handleSubmitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    // Le préfixe +237 est déjà affiché en dur dans le champ ; si l'utilisateur
    // le retape quand même par habitude, on l'enlève pour ne garder que le
    // numéro local (évite le "+237" en double à l'étape OTP).
    const normalizedPhone = phoneInput.replace(/\s+/g, '').replace(/^\+?237/, '');
    const phoneRegex = /^6[256789]\d{7}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      setError('Please enter a valid Cameroon phone number (e.g., 677 12 34 56).');
      return;
    }
    setError('');
    onStartPhoneVerification(normalizedPhone, 'recaptcha-container');
  };

  const handleSubmitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError(slangMode ? 'Saisis le code à 6 chiffres.' : 'Enter the 6-digit code.');
      return;
    }
    setError('');
    onConfirmOtp(otpCode);
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name or nickname.');
      return;
    }

    if (role === 'driver') {
      if (!vehicleModel.trim()) {
        setError('Please enter your vehicle model (e.g., Toyota Corolla).');
        return;
      }
      if (!vehicleColor.trim()) {
        setError('Please enter your vehicle color.');
        return;
      }
      if (!vehiclePlate.trim()) {
        setError('Please enter your license plate number.');
        return;
      }
    }

    onSignupComplete({
      name: name.trim(),
      phone: pendingPhone,
      role,
      slangMode,
      ...(role === 'driver' ? {
        vehicleType,
        vehicleModel: vehicleModel.trim(),
        vehicleColor: vehicleColor.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        ...(Object.keys(kycFiles).length > 0 ? { kycFiles } : {})
      } : {})
    });
  };

  return (
    <div className="min-h-screen bg-brand-midnight text-white flex flex-col justify-between relative overflow-hidden" id="landing-page-container">
      {/* Decorative ambient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-card/30 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-brand-gold/5 blur-[150px] pointer-events-none"></div>

      {/* Invisible reCAPTCHA container required by Firebase Phone Auth */}
      <div id="recaptcha-container" />

      {/* Header bar */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-3 sm:py-4 flex flex-col xs:flex-row justify-between items-center gap-3 z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <WandaLogo className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_0_12px_rgba(226,193,141,0.3)] animate-pulse" />
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-widest text-brand-gold font-sans">
              WANDA
            </h1>
            <p className="text-[9px] sm:text-[10px] text-brand-text-muted italic font-bold hidden xs:block">tu Wanda on tes transporte.</p>
          </div>
        </div>

        {/* Language option switcher */}
        <div className="flex items-center gap-1 bg-brand-card/60 p-1 rounded-xl border border-brand-input/80 text-[10px] sm:text-[11px] shrink-0" id="landing-language-selector">
          <span className="text-brand-text-muted px-1.5">
            <Globe size={12} className="text-brand-gold animate-[spin_12s_linear_infinite]" />
          </span>
          <button
            type="button"
            onClick={() => onLanguageChange?.('en')}
            className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${currentLanguage === 'en' ? 'bg-brand-gold text-brand-midnight font-black shadow' : 'text-brand-text-muted hover:text-white'}`}
          >
            <span>🇬🇧</span>
            <span className="hidden xs:inline">English</span>
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange?.('fr')}
            className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${currentLanguage === 'fr' ? 'bg-brand-gold text-brand-midnight font-black shadow' : 'text-brand-text-muted hover:text-white'}`}
          >
            <span>🇫🇷</span>
            <span className="hidden xs:inline">Français</span>
          </button>
        </div>
      </header>

      {/* Main Content (Bento Grid split) */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 md:py-12 flex-1 grid md:grid-cols-12 gap-8 items-center z-10">
        {/* Left column: Hero copy and features explanation */}
        <div className="md:col-span-7 space-y-6 md:pr-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-card/60 border border-brand-input rounded-full text-xs text-brand-gold font-bold">
            <Sparkles size={14} className="animate-spin-slow" />
            <span>{slangMode ? "Le transport camerounais qui wanda!" : "Next-Gen Ride-Hailing in Cameroon"}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-white">
            {slangMode ? (
              <>
                Wanda te transporte, <br />
                <span className="text-brand-gold text-glow-gold">tu ne wanda plus !</span>
              </>
            ) : (
              <>
                Seamless rides, <br />
                <span className="text-brand-gold text-glow-gold">wherever you go.</span>
              </>
            )}
          </h2>

          <p className="text-sm sm:text-base text-brand-text-muted max-w-xl leading-relaxed font-medium">
            {slangMode ? (
              "Le moyen le plus chic et sécurisé de se déplacer à Douala et Yaoundé. Saisis ton point de départ, choisis ton payement (MoMo, Orange Money ou Cash), et le djo est dans le sac !"
            ) : (
              "The most reliable, high-fidelity app for passengers and drivers in Douala & Yaoundé. Top up your integrated wallet via Mobile Money and travel without handling loose change."
            )}
          </p>

          {/* Quick local highlights list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-brand-card/40 border border-brand-card/80 rounded-2xl p-4 flex gap-3">
              <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl h-fit border border-brand-gold/20 shrink-0">
                <Smartphone size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-brand-gold tracking-wide">
                  {slangMode ? "Payement MoMo & OM" : "Integrated MoMo & Orange"}
                </h4>
                <p className="text-[11px] text-brand-text-muted mt-1 leading-normal font-medium">
                  {slangMode ? "Recharge ton wallet direct avec MTN ou Orange." : "Deposit and withdraw instantly with local cellular networks."}
                </p>
              </div>
            </div>

            <div className="bg-brand-card/40 border border-brand-card/80 rounded-2xl p-4 flex gap-3">
              <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl h-fit border border-brand-gold/20 shrink-0">
                <div className="text-sm font-black">💵</div>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-brand-gold tracking-wide">
                  {slangMode ? "Deux tarifs : Wallet vs Cash" : "Dual Pricing Model"}
                </h4>
                <p className="text-[11px] text-brand-text-muted mt-1 leading-normal font-medium">
                  {slangMode ? "Gagne des réductions en payant avec ton wallet !" : "Get discounted rides when paying from your wallet balance."}
                </p>
              </div>
            </div>

            <div className="bg-brand-card/40 border border-brand-card/80 rounded-2xl p-4 flex gap-3">
              <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl h-fit border border-brand-gold/20 shrink-0">
                <UserCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-brand-gold tracking-wide">
                  {slangMode ? "Portail Chauffeur VIP" : "Premium Driver Interface"}
                </h4>
                <p className="text-[11px] text-brand-text-muted mt-1 leading-normal font-medium">
                  {slangMode ? "Portefeuille intégré et retraits MoMo super rapides." : "Direct withdrawals and real-time navigation tools for drivers."}
                </p>
              </div>
            </div>

            <div className="bg-brand-card/40 border border-brand-card/80 rounded-2xl p-4 flex gap-3">
              <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl h-fit border border-brand-gold/20 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-brand-gold tracking-wide">
                  {slangMode ? "Sécurité Wanda" : "SOS & Verification Code"}
                </h4>
                <p className="text-[11px] text-brand-text-muted mt-1 leading-normal font-medium">
                  {slangMode ? "Vérification OTP par SMS à l'inscription et bouton d'urgence." : "Real SMS OTP verification at signup and 1-tap local emergency dispatch."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Auth / Form Onboarding block */}
        <div className="md:col-span-5 bg-brand-card border border-brand-input rounded-3xl p-6 sm:p-8 shadow-2xl relative" id="signup-card">
          <div className="absolute -top-3 -right-3 bg-brand-gold text-brand-midnight text-[10px] font-black px-2.5 py-1 rounded-lg uppercase shadow">
            PWA Version
          </div>

          {authStep === 'phone' && (
            <>
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-white">
                  {slangMode ? "Connexion par téléphone" : "Sign in with your phone"}
                </h3>
                <p className="text-xs text-brand-text-muted mt-1 font-semibold">
                  {slangMode ? "On t'envoie un code de vérification par SMS." : "We'll text you a verification code."}
                </p>
              </div>

              <form onSubmit={handleSubmitPhone} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted block" htmlFor="signup-phone">
                    {slangMode ? "NUMÉRO DE TÉLÉPHONE" : "PHONE NUMBER"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-text-muted text-xs font-semibold border-r border-brand-input pr-2.5 my-2.5">
                      🇨🇲 +237
                    </div>
                    <input
                      id="signup-phone"
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="677 12 34 56"
                      className="w-full bg-brand-input border border-brand-input rounded-2xl py-3 pl-24 pr-4 text-white text-sm font-semibold placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-gold focus:bg-brand-input focus:ring-1 focus:ring-brand-gold transition"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {(error || otpError) && (
                  <div className="bg-rose-950/25 border border-rose-900/50 text-rose-400 p-3 rounded-xl text-xs font-semibold">
                    ⚠️ {error || otpError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpSending}
                  className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-gold/20 hover:scale-[1.01] active:scale-[0.99] transition duration-200 disabled:opacity-60 disabled:cursor-wait"
                  id="signup-submit-btn"
                >
                  {otpSending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{slangMode ? "Envoi en cours..." : "Sending..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{slangMode ? "Envoyer le code" : "Send Code"}</span>
                      <ArrowRight size={18} className="stroke-[2.5]" />
                    </>
                  )}
                </button>

                <p className="text-[9px] text-brand-text-muted text-center leading-normal mt-2">
                  {slangMode ? (
                    "En continuant, tu acceptes que Wanda gère tes courses et wallets en toute sécurité au Cameroun."
                  ) : (
                    "By continuing, you agree to our terms of service and private wallet-to-wallet protocols."
                  )}
                </p>
              </form>
            </>
          )}

          {authStep === 'otp' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-full bg-brand-gold/10 text-brand-gold mb-2 shadow-sm border border-brand-gold/20">
                  <Shield size={28} />
                </div>
                <h3 className="text-xl font-black text-white">
                  {slangMode ? "Code de vérification" : "Verification code"}
                </h3>
                <p className="text-xs text-brand-text-muted mt-1 font-semibold">
                  {slangMode ? "Code envoyé au" : "Code sent to"} <span className="text-brand-gold font-mono font-bold">+237{pendingPhone}</span>
                </p>
              </div>

              <form onSubmit={handleSubmitOtp} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full bg-brand-input border border-brand-input rounded-2xl py-3.5 text-center text-xl font-black tracking-[0.4em] text-brand-gold placeholder-brand-text-muted focus:outline-none focus:border-brand-gold focus:bg-brand-input transition"
                  required
                  autoFocus
                  id="signup-otp-input"
                />

                {(error || otpError) && (
                  <div className="bg-rose-950/25 border border-rose-900/50 text-rose-400 p-3 rounded-xl text-xs font-semibold">
                    ⚠️ {error || otpError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-gold/20 hover:scale-[1.01] active:scale-[0.99] transition duration-200"
                  id="signup-otp-submit-btn"
                >
                  <span>{slangMode ? "Vérifier" : "Verify"}</span>
                  <ArrowRight size={18} className="stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => onStartPhoneVerification(pendingPhone, 'recaptcha-container')}
                  disabled={otpSending}
                  className="w-full text-brand-gold hover:underline text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw size={12} className={otpSending ? 'animate-spin' : ''} />
                  <span>{slangMode ? "Renvoyer le code" : "Resend code"}</span>
                </button>
              </form>
            </>
          )}

          {authStep === 'profile' && (
            <>
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-white">
                  {slangMode ? "Embarque dans Wanda !" : "Create Your Account"}
                </h3>
                <p className="text-xs text-brand-text-muted mt-1 font-semibold">
                  {slangMode ? "Numéro vérifié — choisis ton rôle et prépare-toi à rouler." : "Phone verified — choose your role to finish signing up."}
                </p>
              </div>

              <form onSubmit={handleSubmitProfile} className="space-y-4">
                {/* Role selection toggle */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted block">
                    {slangMode ? "TU ES QUI ?" : "SELECT YOUR ROLE"}
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1 bg-brand-input rounded-2xl border border-brand-input shadow-inner">
                    <button
                      type="button"
                      onClick={() => setRole('passenger')}
                      className={`py-3.5 px-4 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex flex-col items-center gap-1 ${role === 'passenger' ? 'bg-brand-gold text-brand-midnight shadow' : 'text-brand-text-muted hover:text-white'}`}
                      id="signup-role-passenger"
                    >
                      <span className="text-lg">🙋‍♂️</span>
                      <span>{slangMode ? "PASSAGER" : "PASSENGER"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('driver')}
                      className={`py-3.5 px-4 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex flex-col items-center gap-1 ${role === 'driver' ? 'bg-brand-gold text-brand-midnight shadow' : 'text-brand-text-muted hover:text-white'}`}
                      id="signup-role-driver"
                    >
                      <span className="text-lg">🚖</span>
                      <span>{slangMode ? "CHAUFFEUR" : "DRIVER"}</span>
                    </button>
                  </div>
                </div>

                {/* Name Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted block" htmlFor="signup-name">
                    {slangMode ? "NOM ENTIER" : "FULL NAME / ALIAS"}
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={slangMode ? "Ex: Jean-Baptiste" : "E.g. John Doe"}
                    className="w-full bg-brand-input border border-brand-input rounded-2xl py-3 px-4 text-white text-sm font-semibold placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-gold focus:bg-brand-input focus:ring-1 focus:ring-brand-gold transition"
                    required
                    autoFocus
                  />
                </div>

                {/* Verified phone (read-only) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted block">
                    {slangMode ? "NUMÉRO VÉRIFIÉ" : "VERIFIED PHONE"}
                  </label>
                  <div className="w-full bg-brand-input/60 border border-brand-input rounded-2xl py-3 px-4 text-brand-text-muted text-sm font-semibold flex items-center justify-between">
                    <span>🇨🇲 +237 {pendingPhone}</span>
                    <ShieldCheck size={16} className="text-emerald-400" />
                  </div>
                </div>

                {/* Conditional Driver Vehicle Fields */}
                {role === 'driver' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2 border-t border-brand-input/40"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted block" htmlFor="signup-vehicle-type">
                        {slangMode ? "CATÉGORIE DE TAXI / VÉHICULE" : "VEHICLE CATEGORY"}
                      </label>
                      <select
                        id="signup-vehicle-type"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full bg-brand-input border border-brand-input rounded-2xl py-3 px-4 text-white text-sm font-semibold focus:outline-none focus:border-brand-gold focus:bg-brand-input focus:ring-1 focus:ring-brand-gold transition cursor-pointer"
                        required
                      >
                        <option value="okada" className="bg-brand-midnight text-white">{slangMode ? "Moto-Taxi (Okada)" : "Moto-Taxi (Okada)"}</option>
                        <option value="keke" className="bg-brand-midnight text-white">{slangMode ? "Petit Taxi (Yellow Cab)" : "Petit Taxi (Yellow Cab)"}</option>
                        <option value="ecoride" className="bg-brand-midnight text-white">{slangMode ? "EcoRide (Private Sedan)" : "EcoRide (Private Sedan)"}</option>
                        <option value="comfort" className="bg-brand-midnight text-white">{slangMode ? "VIP Ride (SUV)" : "VIP Ride (SUV)"}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted block" htmlFor="signup-vehicle-model">
                        {slangMode ? "MARQUE & MODÈLE DE VÉHICULE" : "VEHICLE MAKE & MODEL"}
                      </label>
                      <input
                        id="signup-vehicle-model"
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder={slangMode ? "Ex: Toyota Corolla, Suzuki Swift" : "E.g. Toyota Corolla, Suzuki Swift"}
                        className="w-full bg-brand-input border border-brand-input rounded-2xl py-3 px-4 text-white text-sm font-semibold placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-gold focus:bg-brand-input focus:ring-1 focus:ring-brand-gold transition"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted block" htmlFor="signup-vehicle-color">
                        {slangMode ? "COULEUR DU COMPAGNON (VÉHICULE)" : "VEHICLE COLOR"}
                      </label>
                      <input
                        id="signup-vehicle-color"
                        type="text"
                        value={vehicleColor}
                        onChange={(e) => setVehicleColor(e.target.value)}
                        placeholder={slangMode ? "Ex: Jaune (Taxi), Blanc, Noir, Rouge" : "E.g. Yellow (Taxi), White, Black, Red"}
                        className="w-full bg-brand-input border border-brand-input rounded-2xl py-3 px-4 text-white text-sm font-semibold placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-gold focus:bg-brand-input focus:ring-1 focus:ring-brand-gold transition"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted block" htmlFor="signup-vehicle-plate">
                        {slangMode ? "PLAQUE D'IMMATRICULATION" : "LICENSE PLATE NUMBER"}
                      </label>
                      <input
                        id="signup-vehicle-plate"
                        type="text"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        placeholder="Ex: LT - 425 - CH"
                        className="w-full bg-brand-input border border-brand-input rounded-2xl py-3 px-4 text-white text-sm font-semibold placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-gold focus:bg-brand-input focus:ring-1 focus:ring-brand-gold transition uppercase"
                        required
                      />
                    </div>

                    {/* KYC document uploads (optional — reviewed by admin before approval) */}
                    <div className="space-y-1.5 pt-2 border-t border-brand-input/40">
                      <label className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted block">
                        {slangMode ? "DOCUMENTS KYC (facultatif à l'inscription)" : "KYC DOCUMENTS (optional at signup)"}
                      </label>
                      <p className="text-[10px] text-brand-text-muted font-medium leading-normal">
                        {slangMode
                          ? "Ton compte reste en attente jusqu'à validation par un administrateur."
                          : "Your account stays pending until an administrator reviews it."}
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {KYC_DOC_FIELDS.map(({ key, label, labelEn }) => {
                          const file = kycFiles[key];
                          return (
                            <label
                              key={key}
                              htmlFor={`signup-kyc-${key}`}
                              className="flex items-center justify-between gap-2 bg-brand-input border border-brand-input hover:border-brand-gold/60 rounded-xl py-2.5 px-3.5 text-xs font-semibold cursor-pointer transition"
                            >
                              <span className="flex items-center gap-2 text-brand-text-muted">
                                {file ? <FileCheck2 size={14} className="text-emerald-400 shrink-0" /> : <Upload size={14} className="text-brand-gold shrink-0" />}
                                <span className={file ? 'text-emerald-400' : ''}>
                                  {slangMode ? label : labelEn}
                                </span>
                              </span>
                              <span className="text-[10px] text-brand-text-muted truncate max-w-[120px]">
                                {file ? file.name : (slangMode ? 'Choisir un fichier' : 'Choose file')}
                              </span>
                              <input
                                id={`signup-kyc-${key}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleKycFileChange(key, e.target.files?.[0] || null)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="bg-rose-950/25 border border-rose-900/50 text-rose-400 p-3 rounded-xl text-xs font-semibold">
                    ⚠️ {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-gold/20 hover:scale-[1.01] active:scale-[0.99] transition duration-200"
                  id="signup-submit-btn"
                >
                  <span>{slangMode ? "C'est parti, on y va !" : "Get Started Now"}</span>
                  <ArrowRight size={18} className="stroke-[2.5]" />
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 border-t border-brand-card/80 text-center text-[11px] text-brand-text-muted z-10 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="font-semibold">© 2026 Wanda Transportation Co. All Rights Reserved.</p>
        <p className="flex items-center gap-1 font-semibold">
          <span>Slogan national :</span>
          <span className="text-brand-gold font-bold italic">tu Wanda on tes transporte !</span>
          <span>🇨🇲</span>
        </p>
      </footer>
    </div>
  );
}
