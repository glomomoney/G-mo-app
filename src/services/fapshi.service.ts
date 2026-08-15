// Intégration paiement mobile money via le BACKEND Wanda (plus d'appel Fapshi
// direct depuis le navigateur). La clé Fapshi reste côté serveur.
//
// Flow : fapshiDirectPay -> POST /payments/topup (initie + crédite en dev mock)
//        pollFapshiPayment  -> GET /payments/poll/{trans_id} toutes les 3s

import { apiRequest } from '../lib/api';

export type FapshiMedium = 'mobile money' | 'orange money';
export type FapshiStatus = 'INITIATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';

interface FapshiDirectPayParams {
  amount: number;
  phone: string;
  medium: FapshiMedium;
  externalId: string;
  userId?: string;
}

interface TopupResponse {
  payment_id: string;
  status: string;
  payment_url: string | null;
  ussd_code: string | null;
  transaction_id: string | null;
  amount: number;
  bonus_rate: number;
  expected_bonus: number;
}

// Initie le rechargement wallet via le backend et renvoie le transId provider
// (utilisé ensuite par le polling de confirmation).
export async function fapshiDirectPay(
  params: FapshiDirectPayParams
): Promise<{ transId: string }> {
  const data = await apiRequest<TopupResponse>('/payments/topup', {
    method: 'POST',
    body: {
      amount: params.amount,
      phone: params.phone,
      medium: params.medium,
      // provider non transmis : le backend utilise son fournisseur configuré
      // (mock en dev). Aucun appel direct à Fapshi depuis le navigateur.
    },
  });
  return { transId: data.transaction_id || data.payment_id };
}

export async function fapshiPaymentStatus(transId: string): Promise<{
  status: FapshiStatus;
  amount: number;
  paidAt?: string;
}> {
  const data = await apiRequest<{ status: string; paid: boolean }>(
    `/payments/poll/${encodeURIComponent(transId)}`
  );
  const status: FapshiStatus =
    data.status === 'paid' || data.paid ? 'SUCCESSFUL'
    : data.status === 'failed' ? 'FAILED'
    : 'PENDING';
  return { status, amount: 0 };
}

// Poll fapshiPaymentStatus toutes les `intervalMs` jusqu'à un statut terminal
// (SUCCESSFUL/FAILED/EXPIRED) ou `maxAttempts` atteint (3s x 20 = ~60s).
export async function pollFapshiPayment(
  transId: string,
  { intervalMs = 3000, maxAttempts = 20 }: { intervalMs?: number; maxAttempts?: number } = {}
): Promise<FapshiStatus> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { status } = await fapshiPaymentStatus(transId);
      if (status === 'SUCCESSFUL' || status === 'FAILED' || status === 'EXPIRED') {
        return status;
      }
    } catch (err) {
      console.warn('Payment status poll error:', err?.message || err);
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return 'EXPIRED';
}
