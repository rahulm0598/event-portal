import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    venue: { type: String, trim: true },
    city: { type: String, trim: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date },
    isPaid: { type: Boolean, default: false },
    priceInPaise: { type: Number, default: 0 }, // store paise to avoid float errors
    currency: { type: String, default: 'INR' },
    capacity: { type: Number, default: 0 }, // 0 = unlimited
    bannerUrl: { type: String },
    logoUrl: { type: String }, // shown on badge top
    status: { type: String, enum: ['draft', 'open', 'closed'], default: 'open', index: true },

    // Shareable public registration token. Admin generates it, then shares
    // `${PUBLIC_BASE_URL}/register/<publicToken>` on WhatsApp etc.
    publicToken: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

eventSchema.virtual('priceDisplay').get(function () {
  return (this.priceInPaise / 100).toFixed(2);
});

export const Event = mongoose.model('Event', eventSchema);
