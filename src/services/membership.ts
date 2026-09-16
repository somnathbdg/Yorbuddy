import { apiClient } from './api';

export interface MembershipOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan_id: string;
  plan_name: string;
}

export interface MembershipVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface MembershipStatus {
  id: string;
  plan_id: string;
  status: string;
  amount: number;
  currency: string;
  is_active: boolean;
  start_date: string | null;
  expiry_date: string | null;
}

class MembershipService {
  async createOrder(planId: string): Promise<MembershipOrder> {
    const response = await apiClient.post('/memberships/create-order', {
      plan_id: planId,
    });
    return response.data.data;
  }

  async verifyPayment(verification: MembershipVerification): Promise<{ status: string; membership_id: string }> {
    const response = await apiClient.post('/memberships/verify', verification);
    return response.data.data;
  }

  async getMembershipStatus(): Promise<MembershipStatus | null> {
    const response = await apiClient.get('/memberships/me');
    return response.data.data;
  }

  openCheckout(options: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name?: string;
    description?: string;
    handler: (response: any) => void;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
    onDismiss?: () => void;
    onError?: (error: any) => void;
  }): void {
    if (!(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => this._openCheckout(options);
      script.onerror = () => { if (options.onError) options.onError(new Error('Failed to load Razorpay')); };
      document.body.appendChild(script);
    } else {
      this._openCheckout(options);
    }
  }

  private _openCheckout(options: any): void {
    const razorpay = new (window as any).Razorpay({
      key: options.key,
      amount: options.amount,
      currency: options.currency,
      name: options.name || 'YorBuddy',
      description: options.description || 'Membership Payment',
      order_id: options.order_id,
      handler: options.handler,
      prefill: options.prefill,
      theme: options.theme || { color: '#2563EB' },
      modal: {
        ondismiss: () => {
          console.log('Membership checkout dismissed');
          if (options.onDismiss) options.onDismiss();
        },
      },
    });
    razorpay.open();
  }
}

export const membershipService = new MembershipService();
