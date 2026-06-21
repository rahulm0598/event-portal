import { asyncHandler } from '../utils/asyncHandler.js';
import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { Event } from '../models/Event.js';
import { verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.service.js';
import { sendConfirmation } from '../services/notify.service.js';
import { badRequest, notFound } from '../utils/ApiError.js';

// POST /payments/verify  { orderId, paymentId, signature }
// Called from the Razorpay checkout success handler on the client.
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  if (!orderId || !paymentId || !signature) throw badRequest('Missing payment fields');

  const ok = verifyPaymentSignature({ orderId, paymentId, signature });
  if (!ok) throw badRequest('Invalid payment signature');

  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) throw notFound('Payment record not found');

  if (payment.status !== 'paid') {
    payment.status = 'paid';
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    await payment.save();

    const reg = await Registration.findById(payment.registration);
    if (reg && reg.paymentStatus !== 'paid') {
      reg.paymentStatus = 'paid';
      await reg.save();
      const event = await Event.findById(reg.event);
      if (event) await sendConfirmation(reg, event);
    }
  }

  res.json({ success: true, message: 'Payment verified' });
});

// POST /payments/webhook  (raw body) — server-to-server source of truth.
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const raw = req.rawBody; // set by express.raw verify hook
  if (!signature || !raw || !verifyWebhookSignature(raw, signature)) {
    return res.status(400).json({ success: false });
  }

  const evt = JSON.parse(raw.toString('utf8'));
  if (evt.event === 'payment.captured') {
    const orderId = evt.payload.payment.entity.order_id;
    const paymentId = evt.payload.payment.entity.id;
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (payment && payment.status !== 'paid') {
      payment.status = 'paid';
      payment.razorpayPaymentId = paymentId;
      payment.raw = evt.payload;
      await payment.save();

      const reg = await Registration.findById(payment.registration);
      if (reg && reg.paymentStatus !== 'paid') {
        reg.paymentStatus = 'paid';
        await reg.save();
        const event = await Event.findById(reg.event);
        if (event) await sendConfirmation(reg, event);
      }
    }
  }

  res.json({ success: true });
});
