import { env } from '../config/env.js';

const ALLOWED_SANDBOX_API = 'https://whitestarpay-api-yorbuddy-sandbox.onrender.com';

function configuration() {
  if (
    !env.WHITESTARPAY_SANDBOX_ENABLED ||
    env.PAYMENT_ENVIRONMENT !== 'sandbox' ||
    env.NODE_ENV !== 'production' && env.NODE_ENV !== 'development' ||
    !env.WHITESTARPAY_PROJECT_API_KEY.startsWith('wsp_sbx_') ||
    env.WHITESTARPAY_API_URL.replace(/\/$/, '') !== ALLOWED_SANDBOX_API
  ) {
    throw new Error('WhitestarPay sandbox integration is not safely configured.');
  }
  return { baseUrl: ALLOWED_SANDBOX_API, key: env.WHITESTARPAY_PROJECT_API_KEY };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const { baseUrl, key } = configuration();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(12000),
  });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `WhitestarPay sandbox request failed (${response.status}).`);
  }
  return payload.data as T;
}

export function isWhitestarSandboxEnabled(): boolean {
  try { configuration(); return true; } catch { return false; }
}

export async function createWhitestarSandboxOrder(input: {
  projectOrderRef: string;
  amountMinor: number;
  description: string;
  idempotencyKey: string;
}): Promise<{ orderRef: string; amountMinor: number; currency: string; status: string }> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('Invalid sandbox order amount.');
  }
  return request('/api/v1/payment-orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify({
      amountMinor: input.amountMinor,
      currency: 'INR',
      projectOrderRef: input.projectOrderRef,
      description: input.description,
    }),
  });
}

export async function completeWhitestarSandboxOrder(orderRef: string): Promise<{
  orderRef: string;
  status: string;
  paymentRef: string;
  amountMinor: number;
  currency: string;
  simulated: boolean;
}> {
  if (!/^wsp_sbx_[a-f0-9]{32}$/.test(orderRef)) {
    throw new Error('Invalid WhitestarPay sandbox order reference.');
  }
  return request(`/api/v1/sandbox/payment-orders/${encodeURIComponent(orderRef)}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
