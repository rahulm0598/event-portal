import { qrToBuffer } from './qr.service.js';
import {
  sendMail,
  confirmationEmailHtml,
  registeredEmailHtml,
  eventDetailsEmailHtml,
  followupEmailHtml,
} from './email.service.js';
import { Registration } from '../models/Registration.js';
import { Payment } from '../models/Payment.js';

// (Legacy) confirmation with QR attached — kept for old flow / compatibility.
export async function sendConfirmation(registration, event) {
  const s = registration.snapshot || {};
  if (!s.email) return {};
  const qrBuf = await qrToBuffer(registration.qrToken);
  const info = await sendMail({
    to: s.email,
    subject: `Your ticket & QR — ${event.title}`,
    html: confirmationEmailHtml({ name: s.name, eventTitle: event.title, venue: event.venue, startsAt: event.startsAt }),
    attachments: [{ filename: 'entry-qr.png', content: qrBuf, contentType: 'image/png' }],
  });
  await Registration.updateOne({ _id: registration._id }, { $set: { confirmationEmailSentAt: new Date() } });
  return { previewUrl: info?.previewUrl || null };
}

// "You're registered" mail — NO QR. Includes payment receipt for paid events.
export async function sendRegistered(registration, event) {
  const s = registration.snapshot || {};
  if (!s.email) return {};

  const paid = registration.paymentStatus === 'paid';
  let paymentId = null;
  if (paid) {
    const p = await Payment.findOne({ registration: registration._id }).sort({ createdAt: -1 }).lean();
    paymentId = p?.razorpayPaymentId || null;
  }

  const info = await sendMail({
    to: s.email,
    subject: `Registration confirmed — ${event.title}`,
    html: registeredEmailHtml({
      name: s.name,
      eventTitle: event.title,
      venue: event.venue,
      startsAt: event.startsAt,
      paid,
      amountInPaise: registration.amountInPaise,
      paymentId,
    }),
  });

  await Registration.updateOne({ _id: registration._id }, { $set: { confirmationEmailSentAt: new Date() } });
  return { previewUrl: info?.previewUrl || null };
}

// "Event details (2 days before)" mail — carries the entry QR.
export async function sendEventDetails(registration, event, note) {
  const s = registration.snapshot || {};
  if (!s.email) return {};
  const qrBuf = await qrToBuffer(registration.qrToken);
  const info = await sendMail({
    to: s.email,
    subject: `Final details & entry pass — ${event.title}`,
    html: eventDetailsEmailHtml({ name: s.name, eventTitle: event.title, venue: event.venue, startsAt: event.startsAt, note }),
    attachments: [{ filename: 'entry-qr.png', content: qrBuf, contentType: 'image/png' }],
  });
  await Registration.updateOne({ _id: registration._id }, { $set: { detailsEmailSentAt: new Date() } });
  return { previewUrl: info?.previewUrl || null };
}

// Post-event follow-up / thank-you mail.
export async function sendFollowup(registration, event, note) {
  const s = registration.snapshot || {};
  if (!s.email) return {};
  const info = await sendMail({
    to: s.email,
    subject: `Thank you for attending — ${event.title}`,
    html: followupEmailHtml({ name: s.name, eventTitle: event.title, note }),
  });
  await Registration.updateOne({ _id: registration._id }, { $set: { followupEmailSentAt: new Date() } });
  return { previewUrl: info?.previewUrl || null };
}
