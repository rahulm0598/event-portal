import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';

let client = null;
export function rzp() {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw new Error('Razorpay keys not configured');
  }
  if (!client) {
    client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  }
  return client;
}

export async function createOrder({ amountInPaise, receipt, notes }) {
  return rzp().orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    notes,
  });
}

// Verify checkout signature (client callback).
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

// Verify webhook signature (server-to-server).
export function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}
