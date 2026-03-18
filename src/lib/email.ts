import { Resend } from "resend";

// Lazily instantiated to avoid build-time errors when RESEND_API_KEY is not set
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.FROM_EMAIL ?? "Beach VB League <noreply@beachvbleague.com>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log("[email] RESEND_API_KEY not set — skipping send");
    console.log("[email]", { to: opts.to, subject: opts.subject });
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (error) {
    console.error("[email] Send failed:", error);
  }
}

/** Send to multiple recipients in batches of 50 (Resend limit per request) */
export async function sendEmailBatch(
  recipients: { to: string; subject: string; html: string; text?: string }[]
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log("[email] RESEND_API_KEY not set — skipping batch of", recipients.length);
    return;
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const { error } = await resend.batch.send(
      batch.map((r) => ({
        from: FROM,
        to: [r.to],
        subject: r.subject,
        html: r.html,
        text: r.text,
      }))
    );
    if (error) {
      console.error("[email] Batch send failed:", error);
    }
  }
}
