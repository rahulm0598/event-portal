import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },

    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },

    amountInPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    raw: { type: Object }, // store gateway payload for audit
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);
