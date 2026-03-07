"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import type { PaypalContext } from "@/app/api/paypal/create-order/route";

interface PayPalButtonProps {
  amount: number;
  description: string;
  context: PaypalContext;
  onSuccess: (data: Record<string, unknown>) => void;
  onError?: (err: unknown) => void;
}

export function PayPalButton({
  amount,
  description,
  context,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;

  async function createOrder(): Promise<string> {
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, description, context }),
    });
    if (!res.ok) throw new Error("Failed to create PayPal order");
    const data = (await res.json()) as { orderID: string; paymentId: string };
    // Store paymentId in sessionStorage so capture can access it
    sessionStorage.setItem("pendingPaymentId", data.paymentId);
    return data.orderID;
  }

  async function onApprove(data: { orderID: string }) {
    const paymentId = sessionStorage.getItem("pendingPaymentId") ?? "";
    const res = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderID: data.orderID, paymentId, context }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error: string };
      throw new Error(err.error);
    }
    const result = (await res.json()) as Record<string, unknown>;
    sessionStorage.removeItem("pendingPaymentId");
    onSuccess(result);
  }

  return (
    <PayPalScriptProvider options={{ clientId, currency: "USD" }}>
      <PayPalButtons
        style={{ layout: "vertical", shape: "rect" }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
      />
    </PayPalScriptProvider>
  );
}
