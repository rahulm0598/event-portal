import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

/**
 * Builds (once) the email transport based on env.mailTransport:
 *
 *  - 'ethereal' (DEMO): nodemailer creates a free throwaway test account.
 *    Mail is NOT delivered to the real inbox — instead each send returns a
 *    preview URL we print to the console. Open it to SEE the QR email in a
 *    browser. No signup, no SMTP creds. Perfect for a demo.
 *
 *  - 'smtp' (PROD): real SMTP server (AWS SES / SendGrid / Mailtrap) using
 *    the SMTP_* env vars.
 *
 *  - 'console': send nothing, just log. Useful when offline.
 */
async function getTransporter() {
  if (transporter) return transporter;

  if (env.mailTransport === 'console' || (env.mailTransport === 'smtp' && !env.smtp.host)) {
    transporter = {
      sendMail: async (opts) => {
        // eslint-disable-next-line no-console
        console.log(`[email] (console) to=${opts.to} subject="${opts.subject}" — not sent`);
        return { messageId: 'console-' + Date.now() };
      },
    };
    return transporter;
  }

  if (env.mailTransport === 'ethereal') {
    // Auto-create a fake inbox. One per server start.
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    // eslint-disable-next-line no-console
    console.log(`[email] DEMO Ethereal inbox ready (user=${testAccount.user}). Preview links print on each send.`);
    return transporter;
  }

  // Real SMTP. Pool + timeouts so a slow Gmail handshake never hangs a request.
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 10000, // 10s to connect
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  return transporter;
}

// Parse 'Name <email@x.com>' (or plain email) into { name, email }.
function parseFrom(s) {
  const m = /^(.*?)<(.+?)>$/.exec(s || '');
  if (m) return { name: (m[1].trim().replace(/^"|"$/g, '') || 'Event Portal'), email: m[2].trim() };
  return { name: 'Event Portal', email: (s || '').trim() };
}

// Send via Brevo's HTTPS API (port 443) — works where SMTP is blocked (Render).
async function sendViaBrevo({ to, subject, html, attachments }) {
  const sender = parseFrom(env.smtp.from);
  const body = { sender, to: [{ email: to }], subject, htmlContent: html };
  if (attachments?.length) {
    body.attachment = attachments.map((a) => ({
      name: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content).toString('base64'),
    }));
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  return { messageId: 'brevo', previewUrl: null };
}

export async function sendMail({ to, subject, html, attachments }) {
  if (env.mailTransport === 'brevo') return sendViaBrevo({ to, subject, html, attachments });

  const tx = await getTransporter();
  const info = await tx.sendMail({ from: env.smtp.from, to, subject, html, attachments });

  // DEMO: Ethereal returns a preview URL — print it so you can open the email.
  const preview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
  if (preview) {
    // eslint-disable-next-line no-console
    console.log(`[email] DEMO preview (open in browser): ${preview}`);
  }
  return { ...info, previewUrl: preview || null };
}

// ---- Shared dark "premium" email shell ----
function shell(inner) {
  return `
  <div style="margin:0;padding:24px;background:#0a0e1a;font-family:'Segoe UI',Arial,sans-serif">
    <div style="max-width:560px;margin:auto;background:linear-gradient(160deg,#121a33,#0d1226);border:1px solid #1f2a4d;border-radius:18px;overflow:hidden">
      <div style="background:linear-gradient(120deg,#1b2a6b,#2f5bd0 55%,#3aa0ff);padding:26px 28px">
        <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.5px">⚡ MEDEVENTS</div>
        <div style="color:#cfe0ff;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-top:4px">Medical Conference Portal</div>
      </div>
      <div style="padding:28px">${inner}</div>
      <div style="padding:16px 28px;border-top:1px solid #1f2a4d;color:#5b6b95;font-size:11px">
        This is an automated message from MedEvents Portal.
      </div>
    </div>
  </div>`;
}

export function verificationEmailHtml({ name, code }) {
  return shell(`
    <h2 style="color:#fff;margin:0 0 6px">Verify your email</h2>
    <p style="color:#9fb0d4;margin:0 0 22px">Hi ${name}, use this code to activate your account.</p>
    <div style="background:#0a0e1a;border:1px dashed #2f5bd0;border-radius:14px;padding:22px;text-align:center">
      <div style="color:#3aa0ff;font-size:38px;font-weight:800;letter-spacing:10px">${code}</div>
    </div>
    <p style="color:#5b6b95;font-size:12px;margin-top:18px">Code expires in 5 minutes. If you didn't request this, ignore this email.</p>
  `);
}

export function confirmationEmailHtml({ name, eventTitle, venue, startsAt }) {
  const when = new Date(startsAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
  return shell(`
    <h2 style="color:#fff;margin:0 0 6px">🎟️ Registration Confirmed</h2>
    <p style="color:#9fb0d4;margin:0 0 18px">Dear Dr. ${name}, you're all set for:</p>
    <div style="background:#0a0e1a;border:1px solid #1f2a4d;border-radius:14px;padding:18px 20px">
      <div style="color:#fff;font-size:18px;font-weight:700">${eventTitle}</div>
      <div style="color:#9fb0d4;font-size:13px;margin-top:8px">📍 ${venue || 'TBA'}</div>
      <div style="color:#9fb0d4;font-size:13px;margin-top:4px">🗓️ ${when}</div>
    </div>
    <p style="color:#9fb0d4;margin:20px 0 6px">Your entry <strong style="color:#3aa0ff">QR code</strong> is attached.</p>
    <p style="color:#9fb0d4;margin:0">Show it at the venue for check-in &amp; badge printing.</p>
    <p style="color:#5b6b95;font-size:12px;margin-top:18px">Do not share this QR — it is unique to you.</p>
  `);
}

// Small reusable event-detail box.
function eventBox({ eventTitle, venue, startsAt }) {
  const when = new Date(startsAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
  return `
    <div style="background:#0a0e1a;border:1px solid #1f2a4d;border-radius:14px;padding:18px 20px">
      <div style="color:#fff;font-size:18px;font-weight:700">${eventTitle}</div>
      <div style="color:#9fb0d4;font-size:13px;margin-top:8px">📍 ${venue || 'TBA'}</div>
      <div style="color:#9fb0d4;font-size:13px;margin-top:4px">🗓️ ${when}</div>
    </div>`;
}

// Sent immediately after a doctor finishes registration (NO QR yet).
// For paid events, includes the payment receipt block.
export function registeredEmailHtml({ name, eventTitle, venue, startsAt, paid, amountInPaise, paymentId }) {
  const payBlock = paid
    ? `<div style="margin-top:16px;background:#06210f;border:1px solid #14512c;border-radius:14px;padding:16px 20px">
         <div style="color:#34d399;font-size:13px;font-weight:700;letter-spacing:.5px">PAYMENT RECEIVED ✓</div>
         <div style="color:#9fb0d4;font-size:13px;margin-top:8px">Amount paid: <strong style="color:#fff">₹${(amountInPaise / 100).toLocaleString('en-IN')}</strong></div>
         <div style="color:#5b6b95;font-size:12px;margin-top:4px">Txn ID: ${paymentId || '—'}</div>
       </div>`
    : '';
  return shell(`
    <h2 style="color:#fff;margin:0 0 6px">✅ You're registered!</h2>
    <p style="color:#9fb0d4;margin:0 0 18px">Dear Dr. ${name}, your registration is confirmed for:</p>
    ${eventBox({ eventTitle, venue, startsAt })}
    ${payBlock}
    <p style="color:#9fb0d4;margin:20px 0 6px">We'll share the <strong style="color:#3aa0ff">full event details &amp; your entry pass</strong> with you about <strong>2 days before</strong> the event.</p>
    <p style="color:#5b6b95;font-size:12px;margin-top:18px">No action needed right now. See you at the event!</p>
  `);
}

// Sent ~2 days before the event — carries the entry QR (attached).
export function eventDetailsEmailHtml({ name, eventTitle, venue, startsAt, note }) {
  return shell(`
    <h2 style="color:#fff;margin:0 0 6px">📅 Your event is coming up</h2>
    <p style="color:#9fb0d4;margin:0 0 18px">Dear Dr. ${name}, here are your final details:</p>
    ${eventBox({ eventTitle, venue, startsAt })}
    ${note ? `<p style="color:#9fb0d4;margin:18px 0 0">${note}</p>` : ''}
    <p style="color:#9fb0d4;margin:20px 0 6px">Your entry <strong style="color:#3aa0ff">QR code</strong> is attached. Show it at the venue for check-in &amp; badge printing.</p>
    <p style="color:#5b6b95;font-size:12px;margin-top:18px">Do not share this QR — it is unique to you.</p>
  `);
}

// Sent after the event — thank-you / follow-up.
export function followupEmailHtml({ name, eventTitle, note }) {
  return shell(`
    <h2 style="color:#fff;margin:0 0 6px">🙏 Thank you for attending</h2>
    <p style="color:#9fb0d4;margin:0 0 14px">Dear Dr. ${name}, thank you for being part of <strong style="color:#fff">${eventTitle}</strong>.</p>
    ${note ? `<p style="color:#9fb0d4;margin:0 0 14px">${note}</p>` : ''}
    <p style="color:#9fb0d4;margin:0">We hope to see you at our future events.</p>
    <p style="color:#5b6b95;font-size:12px;margin-top:18px">— Team MedEvents</p>
  `);
}
