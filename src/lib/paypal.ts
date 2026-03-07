const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL!;
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getPaypalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
    return cachedToken;
  }
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function createPaypalOrder(
  amount: number,
  description: string,
): Promise<string> {
  const token = await getPaypalAccessToken();
  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: amount.toFixed(2) },
          description,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`PayPal create order error: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function capturePaypalOrder(
  orderId: string,
): Promise<{ status: string; transactionId: string }> {
  const token = await getPaypalAccessToken();
  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`PayPal capture error: ${res.status}`);
  const data = (await res.json()) as {
    status: string;
    purchase_units: Array<{
      payments: { captures: Array<{ id: string; status: string }> };
    }>;
  };
  const capture = data.purchase_units[0]?.payments?.captures?.[0];
  if (!capture) throw new Error("No capture found in PayPal response");
  return { status: capture.status, transactionId: capture.id };
}
