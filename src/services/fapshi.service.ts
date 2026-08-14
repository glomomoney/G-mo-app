// Direct-from-frontend Fapshi integration (Cameroonian payment aggregator
// sitting in front of MTN MoMo / Orange Money). Request/response shapes are
// ported 1:1 from the working reference implementation in the sibling repo
// cloudbaby-backend (app/services/payment/fapshi.py) — accepted tradeoff for
// this demo/prototype phase: the API key ships in client JS.
const BASE_URL = (import.meta as any).env?.VITE_FAPSHI_BASE_URL || 'https://sandbox.fapshi.com';
const HEADERS = {
  apiuser: (import.meta as any).env?.VITE_FAPSHI_API_USER || '',
  apikey: (import.meta as any).env?.VITE_FAPSHI_API_KEY || '',
  'Content-Type': 'application/json',
};

export type FapshiMedium = 'mobile money' | 'orange money';
export type FapshiStatus = 'INITIATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';

interface FapshiDirectPayParams {
  amount: number;
  phone: string;          // local digits only, no country code (e.g. "670000000")
  medium: FapshiMedium;
  externalId: string;
  userId?: string;
}

// Fapshi wants a bare local 9-digit number, no +237/237 prefix.
function toLocalDigits(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.startsWith('237') ? digits.slice(3) : digits;
}

async function parseFapshiResponse(res: Response): Promise<any> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error || `Fapshi request failed (${res.status})`);
  }
  // Fapshi sometimes wraps the payload in {message, data}, sometimes returns it flat.
  return body.data ?? body;
}

// Pushes a real USSD mobile-money charge prompt to the payer's phone.
export async function fapshiDirectPay(params: FapshiDirectPayParams): Promise<{ transId: string }> {
  const res = await fetch(`${BASE_URL}/direct-pay`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      amount: params.amount,
      phone: toLocalDigits(params.phone),
      medium: params.medium,
      name: 'wanda',
      email: 'contact@wanda.app',
      externalId: params.externalId,
      ...(params.userId ? { userId: params.userId } : {}),
    }),
  });
  const data = await parseFapshiResponse(res);
  return { transId: data.transId };
}

export async function fapshiPaymentStatus(transId: string): Promise<{
  status: FapshiStatus;
  amount: number;
  paidAt?: string;
}> {
  const res = await fetch(`${BASE_URL}/payment-status/${transId}`, { headers: HEADERS });
  return parseFapshiResponse(res);
}

// Polls fapshiPaymentStatus every `intervalMs` until a terminal status is
// reached or `maxAttempts` is exceeded (defaults: 3s x 20 = ~60s timeout).
export async function pollFapshiPayment(
  transId: string,
  { intervalMs = 3000, maxAttempts = 20 }: { intervalMs?: number; maxAttempts?: number } = {}
): Promise<FapshiStatus> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { status } = await fapshiPaymentStatus(transId);
    if (status === 'SUCCESSFUL' || status === 'FAILED' || status === 'EXPIRED') {
      return status;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return 'EXPIRED';
}
