import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Smartphone, ArrowRight, Lock, RefreshCw, X, AlertCircle, AlertTriangle } from 'lucide-react';
import { PaymentMethod } from '../types';
import { fapshiDirectPay, pollFapshiPayment } from '../services/fapshi.service';

interface PaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  paymentMethod: PaymentMethod;
  onPaymentSuccess: (transactionId: string) => void;
  userPhone?: string;
  userId?: string;
}

type GatewayStep = 'phone' | 'waiting' | 'failed';

export default function PaymentGateway({
  isOpen,
  onClose,
  amount,
  paymentMethod,
  onPaymentSuccess,
  userPhone,
  userId
}: PaymentGatewayProps) {
  const [step, setStep] = useState<GatewayStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [transId, setTransId] = useState('');

  // Reset state on open, pre-filling the user's own phone when known.
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhoneNumber(userPhone || '');
      setError('');
      setTransId('');
    }
  }, [isOpen, userPhone]);

  if (!isOpen) return null;

  const isMtn = paymentMethod === 'momo_mtn';
  const providerName = isMtn ? 'MTN MoMo' : 'Orange Money';
  const providerColor = isMtn ? 'bg-amber-400 text-slate-900 border-amber-500' : 'bg-orange-500 text-white border-orange-600';

  const formatXAF = (val: number) => val.toLocaleString('fr-FR') + ' FCFA';

  const handleSendPaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const phoneRegex = /^(?:\+?237|6)[256789]\d{7}$/;
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid Cameroon mobile money number (e.g. 677 12 34 56)');
      return;
    }

    setStep('waiting');
    try {
      const { transId: newTransId } = await fapshiDirectPay({
        amount,
        phone: cleanPhone,
        medium: isMtn ? 'mobile money' : 'orange money',
        externalId: `wanda_${Date.now()}`,
        userId
      });
      setTransId(newTransId);

      const finalStatus = await pollFapshiPayment(newTransId);
      if (finalStatus === 'SUCCESSFUL') {
        onPaymentSuccess(newTransId);
      } else {
        setError(finalStatus === 'EXPIRED'
          ? "Le délai de confirmation a expiré. Réessayez."
          : "Le paiement a été refusé ou annulé.");
        setStep('failed');
      }
    } catch (err: any) {
      console.warn('Fapshi payment failed:', err);
      setError(err?.message || "Impossible de contacter le service de paiement. Réessayez.");
      setStep('failed');
    }
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
        {step !== 'waiting' && (
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
            <h3 className="text-lg font-black text-white">Secure Payment Gateway</h3>
            <p className="text-xs text-brand-text-muted font-medium">Powered by Fapshi</p>
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
            {step === 'phone' && (
              <motion.div
                key="step-phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex justify-center mb-3">
                  <div className={`px-4 py-2 rounded-full font-bold text-sm border shadow-sm ${providerColor}`}>
                    {providerName} Checkout
                  </div>
                </div>

                <p className="text-xs text-brand-text-muted text-center mb-4 font-medium leading-relaxed">
                  Saisissez votre numéro {providerName}. Une invite de confirmation sera envoyée directement sur votre téléphone.
                </p>

                <form onSubmit={handleSendPaymentRequest} className="space-y-4">
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
                    <span>Envoyer la demande de paiement</span>
                    <Smartphone size={18} />
                  </button>
                </form>
              </motion.div>
            )}

            {step === 'waiting' && (
              <motion.div
                key="step-waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                    <RefreshCw size={44} className="animate-spin" />
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-lg">Confirmez sur votre téléphone</h4>
                  <p className="text-xs text-brand-text-muted mt-1 font-medium">
                    Une invite {providerName} (USSD) a été envoyée au <span className="text-brand-gold font-mono font-bold">{phoneNumber}</span>.
                    Composez votre code secret pour valider.
                  </p>
                  {transId && (
                    <p className="text-xs font-mono font-bold text-brand-gold mt-2">
                      Réf: {transId}
                    </p>
                  )}
                </div>
                <div className="text-brand-text-muted text-xs bg-brand-deep border border-brand-input p-3.5 rounded-xl max-w-xs mx-auto font-medium">
                  En attente de confirmation... (jusqu'à 60 secondes)
                </div>
              </motion.div>
            )}

            {step === 'failed' && (
              <motion.div
                key="step-failed"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-4 space-y-4"
              >
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertTriangle size={36} />
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-base">Paiement échoué</h4>
                  <p className="text-xs text-brand-text-muted mt-1 font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setStep('phone')}
                  className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight py-3.5 px-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-brand-gold/10 transition"
                  id="retry-payment-btn"
                >
                  <span>Réessayer</span>
                  <ArrowRight size={18} />
                </button>
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
