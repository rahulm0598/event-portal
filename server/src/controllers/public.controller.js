import { asyncHandler } from '../utils/asyncHandler.js';
import { Registration } from '../models/Registration.js';
import { Event } from '../models/Event.js';
import { Doctor } from '../models/Doctor.js';
import { Payment } from '../models/Payment.js';
import { extractToken, generateQrToken } from '../services/qr.service.js';
import { issueEmailCode, verifyEmailCode } from '../services/verify.service.js';
import { sendRegistered } from '../services/notify.service.js';
import { buildBadgePdf } from '../services/badge.service.js';
import { env } from '../config/env.js';
import { notFound, badRequest, conflict } from '../utils/ApiError.js';

// Resolve an event from a shared public token (falls back to mongo id).
async function eventByPublicToken(token) {
  let ev = await Event.findOne({ publicToken: token });
  if (!ev && /^[a-f0-9]{24}$/i.test(token)) ev = await Event.findById(token);
  return ev;
}

function snapshotOf(d) {
  return { name: d.name, doctorId: d.doctorId, email: d.email, mobile: d.mobile, hospital: d.hospital, specialty: d.specialty, photo: d.photo };
}

// GET /api/public/events/:token — event info for the shared registration page.
export const getEventByToken = asyncHandler(async (req, res) => {
  const ev = await eventByPublicToken(req.params.token);
  if (!ev) throw notFound('This registration link is invalid or has expired.');
  res.json({
    success: true,
    event: {
      id: ev._id,
      title: ev.title,
      description: ev.description,
      venue: ev.venue,
      city: ev.city,
      startsAt: ev.startsAt,
      endsAt: ev.endsAt,
      isPaid: ev.isPaid,
      priceInPaise: ev.priceInPaise,
      currency: ev.currency,
      bannerUrl: ev.bannerUrl,
      status: ev.status,
    },
  });
});

// POST /api/public/events/:token/register — link-based form submit (no password).
// Creates/updates the doctor + a pending registration, emails a 6-digit code.
export const publicRegister = asyncHandler(async (req, res) => {
  const ev = await eventByPublicToken(req.params.token);
  if (!ev) throw notFound('This registration link is invalid or has expired.');
  if (ev.status === 'closed') throw badRequest('Registration for this event is closed.');

  const { name, doctorId, mobile, email, hospital, specialty, city } = req.body;

  // Upsert the doctor by email (no password — link registrants don't log in).
  let doctor = await Doctor.findOne({ email });
  if (doctor) {
    Object.assign(doctor, { name, doctorId, mobile, hospital, specialty, city });
    await doctor.save();
  } else {
    doctor = await Doctor.create({ name, doctorId, mobile, email, hospital, specialty, city, role: 'doctor', emailVerified: false });
  }

  let reg = await Registration.findOne({ doctor: doctor._id, event: ev._id });
  const confirmed = reg && reg.emailVerified && reg.paymentStatus !== 'pending';
  if (confirmed) throw conflict('You have already registered for this event.');

  if (!reg) {
    if (ev.capacity > 0) {
      const count = await Registration.countDocuments({ event: ev._id, emailVerified: true });
      if (count >= ev.capacity) throw badRequest('Sorry, this event is full.');
    }
    reg = await Registration.create({
      doctor: doctor._id,
      event: ev._id,
      snapshot: snapshotOf(doctor),
      qrToken: generateQrToken(),
      amountInPaise: ev.isPaid ? ev.priceInPaise : 0,
      paymentStatus: ev.isPaid ? 'pending' : 'not_required',
      emailVerified: false,
    });
  } else {
    reg.snapshot = snapshotOf(doctor);
    await reg.save();
  }

  const r = await issueEmailCode(email, name);
  res.status(201).json({
    success: true,
    registrationId: reg._id,
    email,
    paid: ev.isPaid,
    amountInPaise: ev.isPaid ? ev.priceInPaise : 0,
    message: 'Verification code sent to your email.',
    ...r, // devCode in demo
  });
});

// POST /api/public/events/:token/verify — { email, code }
// Free event  -> confirmed + "registered" mail (no QR).
// Paid event  -> email verified, returns payment_required.
export const publicVerify = asyncHandler(async (req, res) => {
  const ev = await eventByPublicToken(req.params.token);
  if (!ev) throw notFound('This registration link is invalid or has expired.');

  const { email, code } = req.body;

  const doctor = await Doctor.findOne({ email });
  if (!doctor) throw badRequest('Registration not found. Please fill the form again.');

  const reg = await Registration.findOne({ doctor: doctor._id, event: ev._id });
  if (!reg) throw badRequest('Registration not found. Please fill the form again.');

  // Already fully registered for this event -> block, no re-send.
  if (reg.emailVerified && reg.paymentStatus !== 'pending') {
    throw conflict('You have already registered for this event.');
  }

  await verifyEmailCode(email, code);

  if (!doctor.emailVerified) { doctor.emailVerified = true; await doctor.save(); }
  reg.emailVerified = true;

  if (!ev.isPaid) {
    reg.paymentStatus = 'not_required';
    reg.registeredAt = new Date();
    await reg.save();
    const { previewUrl } = await sendRegistered(reg, ev);
    return res.json({ success: true, status: 'registered', paid: false, emailPreviewUrl: previewUrl });
  }

  await reg.save();
  res.json({
    success: true,
    status: 'payment_required',
    paid: true,
    registrationId: reg._id,
    amountInPaise: reg.amountInPaise,
  });
});

// POST /api/public/events/:token/resend — { email }
export const publicResend = asyncHandler(async (req, res) => {
  const r = await issueEmailCode(req.body.email, 'Doctor');
  res.json({ success: true, message: 'Code re-sent.', ...r });
});

// POST /api/public/pay — { registrationId }  (DEMO: fake payment, no gateway)
export const publicPay = asyncHandler(async (req, res) => {
  const reg = await Registration.findById(req.body.registrationId).populate('event');
  if (!reg) throw notFound('Registration not found.');
  if (!reg.emailVerified) throw badRequest('Verify your email first.');
  if (reg.paymentStatus === 'paid') {
    return res.json({ success: true, status: 'registered', alreadyPaid: true });
  }

  const event = reg.event;

  if (env.demoMode) {
    reg.paymentStatus = 'paid';
    reg.registeredAt = new Date();
    await reg.save();

    await Payment.create({
      registration: reg._id,
      doctor: reg.doctor,
      event: event._id,
      razorpayOrderId: `demo_order_${reg._id}`,
      razorpayPaymentId: `demo_pay_${reg._id.toString().slice(-8)}`,
      amountInPaise: reg.amountInPaise,
      status: 'paid',
      raw: { demo: true },
    });

    const { previewUrl } = await sendRegistered(reg, event);
    return res.json({ success: true, status: 'registered', demo: true, emailPreviewUrl: previewUrl });
  }

  // Production would create a real Razorpay order here.
  throw badRequest('Live payments are not enabled in this demo.');
});

// GET /api/public/checkin/:token
// PUBLIC (no auth): anyone who scans the QR can view the attendee details.
// Read-only — does NOT change check-in status.
export const getByToken = asyncHandler(async (req, res) => {
  const token = extractToken(req.params.token);
  const reg = await Registration.findOne({ qrToken: token })
    .populate('event', 'title startsAt venue city logoUrl')
    .lean();
  if (!reg) throw notFound('Invalid QR — registration not found');

  res.json({
    success: true,
    token,
    doctor: reg.snapshot,
    event: reg.event,
    paymentStatus: reg.paymentStatus,
    checkInStatus: reg.checkInStatus,
    checkedInAt: reg.checkedInAt || null,
  });
});

// POST /api/public/checkin/:token
// Marks the attendee checked-in (gate staff taps "Confirm Check-In").
// Demo-open; in production protect this with a staff token.
export const checkInByToken = asyncHandler(async (req, res) => {
  const token = extractToken(req.params.token);
  const reg = await Registration.findOne({ qrToken: token }).populate('event', 'title');
  if (!reg) throw notFound('Invalid QR');
  if (reg.paymentStatus === 'pending') throw badRequest('Payment pending — entry not allowed');

  const alreadyIn = reg.checkInStatus === 'checked_in';
  if (!alreadyIn) {
    reg.checkInStatus = 'checked_in';
    reg.checkedInAt = new Date();
    await reg.save();
  }

  res.json({
    success: true,
    alreadyCheckedIn: alreadyIn,
    checkedInAt: reg.checkedInAt,
    doctor: reg.snapshot,
    event: reg.event,
  });
});

// GET /api/public/badge/:token/pdf  — printable badge by QR token (no login).
export const badgePdfByToken = asyncHandler(async (req, res) => {
  const token = extractToken(req.params.token);
  const reg = await Registration.findOne({ qrToken: token });
  if (!reg) throw notFound('Invalid QR');
  if (reg.paymentStatus === 'pending') throw badRequest('Payment pending');

  const event = await Event.findById(reg.event).lean();
  reg._eventLogoText = event?.title || 'Event Portal';

  const pdf = await buildBadgePdf(reg);
  reg.badgePrintedAt = new Date();
  await reg.save().catch(() => {});

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="badge_${reg._id}.pdf"`);
  res.send(pdf);
});
