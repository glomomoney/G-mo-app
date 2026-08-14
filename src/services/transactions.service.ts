import { apiRequest } from '../lib/api';
import { Transaction } from '../types';

type Unsubscribe = () => void;

interface WalletTxBackend {
  id: string;
  type: string;
  amount: number;
  bonus_amount: number;
  tip_amount: number;
  phone: string | null;
  carrier: string;
  status: string;
  ride_id: string | null;
  created_at: string;
}

function formatTxDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function mapWalletTransaction(t: WalletTxBackend): Transaction {
  return {
    id: t.id,
    type: (t.type as Transaction['type']) || 'topup',
    amount: Math.abs(t.amount),
    bonusAmount: t.bonus_amount || 0,
    tipAmount: t.tip_amount || 0,
    phone: t.phone || '',
    carrier: t.carrier || 'wallet',
    status: (t.status as Transaction['status']) || 'success',
    date: formatTxDate(t.created_at),
    userId: (t as any).user_id,
  };
}

// Le grand livre est écrit côté backend (topup, course, retrait).
export const saveTransactionToFirestore = async (): Promise<void> => {
  // no-op : le backend est la source de vérité pour les transactions.
};

// Feed admin (file de retraits en attente) + ledger du user connecté.
// L'API admin n'expose que les retraits en attente ; le ledger complet du
// compte admin est fusionné en complément.
export const subscribeToAllTransactions = (
  onUpdate: (items: Transaction[]) => void
): Unsubscribe => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval>;

  const poll = async () => {
    try {
      const [withdrawals, own] = await Promise.all([
        apiRequest<WalletTxBackend[]>('/admin/withdrawals', { admin: true }).catch(() => []),
        apiRequest<WalletTxBackend[]>('/wallet/transactions').catch(() => []),
      ]);
      if (cancelled) return;
      const items: Transaction[] = [
        ...withdrawals.map(mapWalletTransaction),
        ...own.map(mapWalletTransaction),
      ];
      onUpdate(items);
    } catch (err) {
      console.warn('subscribeToAllTransactions poll error:', err?.message || err);
    }
  };

  poll();
  timer = setInterval(poll, 8000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};
