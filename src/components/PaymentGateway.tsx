import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Smartphone, ArrowRight, Lock, CheckCircle2, RefreshCw, X, AlertCircle } from 'lucide-react';
import { PaymentMethod } from '../types';

interface PaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  paymentMethod: PaymentMethod;
  onPaymentSuccess: (transactionId: string) => void;
}

export default function PaymentGateway({
  isOpen,
  onClose,
  amount,
  paymentMethod,
  onPaymentSuccess
}: PaymentGatewayProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Phone, 2: OTP, 3: PIN/USSD Prompt, 4: Verifying
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [momoPin, setMomoPin] = useState('');
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState('');
  const [txId, setTxId] = useState(() => 'MOMO-' + Math.floor(100000 + Math.random() * 900000));
  const [simulatedOtp, setSimulatedOtp] = useState('');

  // Start OTP Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPhoneNumber('');
      setOtpCode('');
      setMomoPin('');
      setTimer(30);
      setError('');
      setTxId('MOMO-' + Math.floor(100000 + Math.random() * 900000));
      // Generate a dynamic mock OTP for user guidance
      setSimulatedOtp(Math.floor(1000 + Math.random() * 9000).toString());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMtn = paymentMethod === 'momo_mtn';
  const providerName = isMtn ? 'MTN MoMo' : 'Orange Money';
  const providerColor = isMtn ? 'bg-amber-400 text-slate-900 border-amber-500' : 'bg-orange-500 text-white border-orange-600';
  const providerAccent = isMtn ? 'text-amber-500' : 'text-orange-500';

  // Format amount to XAF (FCFA)
  const formatXAF = (val: number) => {
    return val.toLocaleString('fr-FR') + ' FCFA';
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Cameroon phone number validation: 9 digits, typically starting with 6 (e.g. 677123456)
    const phoneRegex = /^(?:\+?237|6)[256789]\d{7}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ''))) {
      setError('Please enter a valid Cameroon mobile money number (e.g. 677 12 34 56)');
      return;
    }
    
    // Proceed to OTP step
    setStep(2);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otpCode.length < 4) {
      setError('Please enter a valid 4-digit OTP code');
      return;
    }
    // Set to PIN or secure confirmation step
    setStep(3);
  };

  const handleCompletePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (momoPin.length < 4) {
      setError('Please enter your 4-digit secure wallet PIN');
      return;
    }

    setStep(4);

    // Simulate Payment API Endpoint verification
    setTimeout(() => {
      onPaymentSuccess(txId);
    }, 2500);
  };

  const resendOtp = () => {
    setTimer(30);
    setSimulatedOtp(Math.floor(1000 + Math.random() * 9000).toString());
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-brand-midnight/70 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" id="momo-payment-modal">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-brand-card border border-brand-input rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-brand-gold/5 relative text-white"
      >
        {/* Close Button */}
        {step !== 4 && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-brand-text-muted hover:text-brand-gold p-1.5 rounded-full hover:bg-brand-input transition cursor-pointer"
            id="close-payment-btn"
          >
            <X size={20} />
          </button>
        )}

        {/* Modal Header */}
        <div className="p-6 border-b border-brand-input flex items-center gap-3 bg-brand-deep/80">
          <div className="p-2.5 rounded-xl bg-brand-gold/10 text-brand-gold border border-brand-gold/20 shadow-sm">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Secure API Gateway</h3>
            <p className="text-xs text-brand-text-muted font-medium">Direct wallet-to-wallet authentication</p>
          </div>
        </div>

        {/* Amount display */}
        <div className="bg-brand-deep/40 p-4 text-center border-b border-brand-input flex justify-between items-center px-6">
          <span className="text-sm text-brand-text-muted font-medium">Payment Amount:</span>
          <span className="text-xl font-black text-brand-gold tracking-tight">
            {formatXAF(amount)}
          </span>
        </div>

        {/* Dynamic content based on step */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex justify-center mb-4">
                  <div className={`px-4 py-2 rounded-full font-bold text-sm border shadow-sm ${providerColor}`}>
                    {providerName} Checkout
                  </div>
                </div>

                 <p className="text-sm text-brand-text-muted text-center mb-6 font-medium leading-relaxed">
                  Enter your {providerName} registered mobile number to authorize the push-payment request.
                </p>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-text-muted text-sm font-semibold border-r border-brand-input pr-2.5 my-3">
                      🇨🇲 +237
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="677 12 34 56"
                      className="w-full bg-brand-input border border-brand-input rounded-2xl py-3.5 pl-24 pr-4 text-white text-base font-semibold placeholder-brand-text-muted/60 focus:outline-none focus:border-brand-gold focus:bg-brand-input focus:ring-1 focus:ring-brand-gold transition"
                      required
                      autoFocus
                      id="momo-phone-input"
                    />
                  </div>

                  {error && (
                    <div className="bg-rose-950/25 border border-rose-900/50 text-rose-400 p-3 rounded-xl flex items-start gap-2 text-xs font-semibold">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight py-3.5 px-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-brand-gold/10 hover:scale-[1.01] active:scale-[0.99] transition duration-200"
                    id="submit-phone-btn"
                  >
                    <span>Request Authorization PIN</span>
                    <Smartphone size={18} />
                  </button>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-5">
                  <div className="inline-flex p-3 rounded-full bg-brand-gold/10 text-brand-gold mb-2 shadow-sm border border-brand-gold/20">
                    <Smartphone size={28} className="animate-pulse" />
                  </div>
                  <h4 className="text-white font-extrabold text-base">OTP Verification Code</h4>
                  <p className="text-xs text-brand-text-muted mt-1 font-medium">
                    Sent simulated payment request code to <span className="text-brand-gold font-mono font-bold">{phoneNumber}</span>
                  </p>
                </div>

                {/* Simulated Notification Header */}
                <div className="bg-brand-deep border border-brand-input p-3 rounded-xl text-center mb-5">
                  <span className="text-xs text-brand-gold font-bold block">🔐 SECURE PAYMENT API SIMULATOR</span>
                  <span className="text-sm text-brand-text font-semibold mt-1">
                    Your mock transaction OTP is: <span className="text-brand-gold text-base font-black font-mono underline">{simulatedOtp}</span>
                  </span>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <input
                    type="text"
                    maxLength={4}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-Digit OTP"
                    className="w-full bg-brand-input border border-brand-input rounded-2xl py-3.5 text-center text-xl font-black tracking-widest text-brand-gold placeholder-brand-text-muted focus:outline-none focus:border-brand-gold focus:bg-brand-input transition"
                    required
                    id="momo-otp-input"
                  />

                  {error && (
                    <div className="bg-rose-950/25 border border-rose-900/50 text-rose-400 p-3 rounded-xl flex items-start gap-2 text-xs font-semibold">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-brand-text-muted font-medium">
                    <span>Didn't receive SMS?</span>
                    {timer > 0 ? (
                      <span>Resend in <span className="text-brand-gold font-mono font-bold">{timer}s</span></span>
                    ) : (
                      <button
                        type="button"
                        onClick={resendOtp}
                        className="text-brand-gold hover:underline font-black flex items-center gap-1 cursor-pointer"
                        id="resend-otp-btn"
                      >
                        <RefreshCw size={12} />
                        <span>Resend OTP</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight py-3.5 px-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-brand-gold/10 hover:scale-[1.01] active:scale-[0.99] transition duration-200"
                    id="submit-otp-btn"
                  >
                    <span>Verify Code</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-5">
                  <div className="inline-flex p-3 rounded-full bg-brand-gold/10 text-brand-gold mb-2 border border-brand-gold/20 shadow-sm">
                    <Lock size={28} />
                  </div>
                  <h4 className="text-white font-extrabold text-base">Enter Mobile Money PIN</h4>
                  <p className="text-xs text-brand-text-muted mt-1 font-medium">
                    Please provide your 4-digit secret {providerName} PIN to confirm checkout debit
                  </p>
                </div>

                <form onSubmit={handleCompletePayment} className="space-y-4">
                  <input
                    type="password"
                    maxLength={4}
                    value={momoPin}
                    onChange={(e) => setMomoPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-brand-input border border-brand-input rounded-2xl py-3.5 text-center text-2xl font-black tracking-widest text-brand-gold placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-gold focus:bg-brand-input transition"
                    required
                    id="momo-pin-input"
                  />

                  {error && (
                    <div className="bg-rose-950/25 border border-rose-900/50 text-rose-400 p-3 rounded-xl flex items-start gap-2 text-xs font-semibold">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="bg-brand-deep p-3.5 rounded-xl flex items-start gap-2 border border-brand-input shadow-inner">
                    <Shield size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-brand-text-muted text-xs leading-relaxed font-medium">
                      This transaction uses **AES-256 endpoint encryption** and direct cellular token routing. Your security PIN is processed purely via bank API handshake.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3.5 px-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition duration-200"
                    id="submit-pin-btn"
                  >
                    <span>Authorize Debit of {formatXAF(amount)}</span>
                    <CheckCircle2 size={18} />
                  </button>
                </form>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20 animate-spin-slow">
                    <RefreshCw size={44} className="animate-spin" />
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-lg">Authorizing with API Server</h4>
                  <p className="text-xs text-brand-text-muted mt-1 font-medium">
                    Verifying network response for Transaction ID:
                  </p>
                  <p className="text-xs font-mono font-bold text-brand-gold mt-1">
                    {txId}
                  </p>
                </div>
                <div className="text-brand-text-muted text-xs bg-brand-deep border border-brand-input p-3.5 rounded-xl max-w-xs mx-auto font-medium">
                  Performing secure MT-push validation query handshake...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="bg-brand-deep p-4 text-center border-t border-brand-input text-[10px] text-brand-text-muted flex items-center justify-center gap-1.5 font-medium">
          <Lock size={12} className="text-emerald-400" />
          <span>PCI-DSS Level 1 Compliant Security Standard for Africa</span>
        </div>
      </motion.div>
    </div>
  );
}
