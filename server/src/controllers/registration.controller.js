import { asyncHandler } from '../utils/asyncHandler.js';
import { Registration } from '../models/Registration.js';
import { Event } from '../models/Event.js';
import { Payment } from '../models/Payment.js';
import { generateQrToken, qrToDataUrl } from '../services/qr.service.js';
import { createOrder } from '../services/razorpay.service.js';
import { sendConfirmation } from '../services/notify.service.js';
import { env } from '../config/env.js';
import { badRequest, notFound, conflict } from '../utils/ApiError.js';

function snapshotOf(doctor) {
  return {
    name: doctor.name,
    doctorId: doctor.doctorId,
    email: doctor.email,
    mobile: doctor.mobile,
    hospital: doctor.hospital,
    specialty: doctor.specialty,
    photo: doctor.photo,
  };
}

// POST /registrations  { eventId }
// Free event  -> registration confirmed + QR + email immediately.
// Paid event  -> registration pending + Razorpay order returned for checkout.
export const registerForEvent = asyncHandler(async (req, res) => {
  const doctor = req.user;
  const event = await Event.findById(req.body.eventId);
  if (!event) throw notFound('Event not found');
  if (event.status === 'closed') throw badRequest('Event registration is closed');

  const existing = await Registration.findOne({ doctor: doctor._id, event: event._id });
  if (existing) throw conflict('Already registered for this event');

  if (event.capacity > 0) {
    const count = await Registration.countDocuments({ event: event._id });
    if (count >= event.capacity) throw badRequest('Event is full');
  }

  const qrToken = generateQrToken();

  const registration = await Registration.create({
    doctor: doctor._id,
    event: event._id,
    snapshot: snapshotOf(doctor),
    qrToken,
    amountInPaise: event.isPaid ? event.priceInPaise : 0,
    paymentStatus: event.isPaid ? 'pending' : 'not_required',
  });

  // ---- FREE event: confirm instantly, email QR ----
  if (!event.isPaid) {
    const { previewUrl } = await sendConfirmation(registration, event);
    return res.status(201).json({
      success: true,
      registration: publicReg(registration),
      qr: await qrToDataUrl(qrToken),
      emailPreviewUrl: previewUrl, // DEMO: link to view the sent email
    });
  }

  // ---- DEMO MODE: paid event with NO real gateway ----
  // Skip Razorpay entirely. Record a fake "paid" payment, confirm the
  // registration, email the QR, and return it like a free event. This lets
  // you demo the full paid flow without keys or money. Disable in prod.
  if (env.demoMode) {
    registration.paymentStatus = 'paid';
    await registration.save();

    await Payment.create({
      registration: registration._id,
      doctor: doctor._id,
      event: event._id,
      razorpayOrderId: `demo_order_${registration._id}`,
      razorpayPaymentId: `demo_pay_${Date.now()}`,
      amountInPaise: event.priceInPaise,
      status: 'paid',
      raw: { demo: true },
    });

    const { previewUrl } = await sendConfirmation(registration, event);
    return res.status(201).json({
      success: true,
      demo: true,
      registration: publicReg(registration),
      qr: await qrToDataUrl(qrToken),
      emailPreviewUrl: previewUrl,
    });
  }

  // ---- PRODUCTION: real Razorpay order ----
  const order = await createOrder({
    amountInPaise: event.priceInPaise,
    receipt: `reg_${registration._id}`,
    notes: { registrationId: registration._id.toString(), eventId: event._id.toString() },
  });

  await Payment.create({
    registration: registration._id,
    doctor: doctor._id,
    event: event._id,
    razorpayOrderId: order.id,
    amountInPaise: event.priceInPaise,
    status: 'created',
  });

  res.status(201).json({
    success: true,
    registration: publicReg(registration),
    payment: { orderId: order.id, amountInPaise: order.amount, currency: order.currency },
  });
});

// GET /registrations/mine
export const myRegistrations = asyncHandler(async (req, res) => {
  const regs = await Registration.find({ doctor: req.user._id })
    .populate('event', 'title startsAt venue city isPaid')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, registrations: regs });
});

// GET /registrations/:id/qr
export const getRegistrationQr = asyncHandler(async (req, res) => {
  const reg = await Registration.findOne({ _id: req.params.id, doctor: req.user._id });
  if (!reg) throw notFound('Registration not found');
  if (reg.paymentStatus === 'pending') throw badRequest('Payment pending');
  res.json({ success: true, qr: await qrToDataUrl(reg.qrToken) });
});

export function publicReg(r) {
  return {
    id: r._id,
    event: r.event,
    paymentStatus: r.paymentStatus,
    checkInStatus: r.checkInStatus,
    createdAt: r.createdAt,
  };
}
