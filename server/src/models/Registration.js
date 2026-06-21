import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },

    // Snapshot of doctor data at registration time (badge prints from this)
    snapshot: {
      name: String,
      doctorId: String,
      email: String,
      mobile: String,
      hospital: String,
      specialty: String,
      photo: String,
    },

    // Unique QR token — opaque, not the mongo id
    qrToken: { type: String, required: true, unique: true, index: true },

    paymentStatus: {
      type: String,
      enum: ['not_required', 'pending', 'paid', 'failed', 'refunded'],
      default: 'not_required',
      index: true,
    },
    amountInPaise: { type: Number, default: 0 },

    checkInStatus: {
      type: String,
      enum: ['registered', 'checked_in'],
      default: 'registered',
      index: true,
    },
    checkedInAt: { type: Date },
    badgePrintedAt: { type: Date },

    // Registration lifecycle (link-based flow):
    //   emailVerified=false  -> form submitted, code not entered yet (pending)
    //   emailVerified=true   -> code verified; free = confirmed, paid = awaits payment
    //   confirmed = emailVerified && paymentStatus != 'pending'
    emailVerified: { type: Boolean, default: false },
    registeredAt: { type: Date }, // set when fully confirmed

    confirmationEmailSentAt: { type: Date }, // "registered successfully" mail
    detailsEmailSentAt: { type: Date },      // "event details (+QR) 2 days before"
    followupEmailSentAt: { type: Date },     // "thank you / follow-up after"
  },
  { timestamps: true }
);

// One registration per doctor per event
registrationSchema.index({ doctor: 1, event: 1 }, { unique: true });

export const Registration = mongoose.model('Registration', registrationSchema);
