import { apiClient } from "./api";

export interface RazorpayOrder {
  order_id: string;
  amount: number; // in paise
  currency: string;
  key_id: string;
  booking_code: string;
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

class PaymentService {
  /**
   * Create a Razorpay order for a booking.
   */
  async createOrder(bookingId: string): Promise<RazorpayOrder> {
    const response = await apiClient.post("/payments/create-order", {
      booking_id: bookingId,
    });
    return response.data.data;
  }

  /**
   * Verify payment after Razorpay checkout.
   * Sends razorpay_payment_id, razorpay_order_id, razorpay_signature to backend.
   * Backend verifies HMAC signature and updates booking status.
   */
  async verifyPayment(verification: PaymentVerification): Promise<{ status: string; payment_id: string }> {
    const response = await apiClient.post("/payments/verify", verification);
    return response.data.data;
  }

  /**
   * Get payment status for a booking.
   * Returns the latest payment record or null.
   */
  async getPaymentStatus(bookingId: string): Promise<any> {
    const response = await apiClient.get();
    return response.data.data;
  }

  /**
   * Open Razorpay checkout.
   */
  openCheckout(options: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name?: string;
    description?: string;
    handler: (response: any) => void;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
    onDismiss?: () => void;
    onError?: (error: any) => void;
  }): void {
    // Load Razorpay script if not already loaded
    if (!(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        this._openRazorpayCheckout(options);
      };
      script.onerror = () => {
        if (options.onError) options.onError(new Error("Failed to load Razorpay checkout script"));
      };
      document.body.appendChild(script);
    } else {
      this._openRazorpayCheckout(options);
    }
  }

  private _openRazorpayCheckout(options: any): void {
    const razorpay = new (window as any).Razorpay({
      key: options.key,
      amount: options.amount,
      currency: options.currency,
      name: options.name || "YorBuddy",
      description: options.description || "Booking Payment",
      order_id: options.order_id,
      handler: options.handler,
      prefill: options.prefill,
      theme: options.theme || { color: "#2563EB" },
      modal: {
        ondismiss: () => {
          console.log("Payment dismissed");
          if (options.onDismiss) options.onDismiss();
        },
      },
    });
    razorpay.open();
  }
}

export const paymentService = new PaymentService();
