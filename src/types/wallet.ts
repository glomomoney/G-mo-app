export type PaymentMethod = 'momo_mtn' | 'orange_money' | 'cash' | 'wallet';

export type TransactionType = 'topup' | 'withdrawal' | 'ride_payout' | 'commission_debit';
export type TransactionStatus = 'success' | 'pending' | 'failed';

// Wallet ledger entry persisted to the Firestore `transactions` collection.
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  bonusAmount?: number;
  tipAmount?: number;
  phone: string;
  carrier: string; // PaymentMethod value, or an internal marker like 'wallet_debit' / 'cash_commission'
  status: TransactionStatus;
  date: string;
  userId?: string;
}
